package com.margelo.nitro.moptic.vto

import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.PixelFormat
import android.os.SystemClock
import android.util.Log
import androidx.annotation.Keep
import androidx.camera.core.ImageProxy
import com.facebook.proguard.annotations.DoNotStrip
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker as MPFaceLandmarker
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import com.margelo.nitro.core.ArrayBuffer
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Float layout of the result buffer. Must match RESULT_LAYOUT in ../index.ts. */
internal object ResultLayout {
  const val MATRIX = 0 // 16 floats, column-major, centimetres
  const val DETECTED = 16
  const val FRAME_WIDTH = 17 // analysed frame, upright, px
  const val FRAME_HEIGHT = 18
  const val INFERENCE_MS = 19
  const val LANDMARK_COUNT = 20
  const val HEADER = 24
  const val MAX_LANDMARKS = 478
  const val COUNT = HEADER + MAX_LANDMARKS * 3
}

/**
 * MediaPipe Face Landmarker as a VisionCamera frame-processor plugin — the same
 * options as the website's faceTracker.ts (VIDEO mode, one face, facial
 * transformation matrix on, blendshapes off, GPU with a CPU fallback).
 *
 * Frames arrive as RGBA from the frame output. Front-camera frames on Android
 * are usually rotated 270°; the frame output rotates them physically, and any
 * rotation left over is applied here before inference, so the landmarks always
 * describe the upright, unmirrored image (the space the renderer works in).
 */
@DoNotStrip
@Keep
class HybridFaceLandmarker(
  options: FaceLandmarkerOptions,
) : HybridFaceLandmarkerSpec() {
  private var landmarker: MPFaceLandmarker?
  override val delegate: String

  private val lock = Any()
  private val latest = FloatArray(ResultLayout.COUNT)
  private var sequence = 0.0
  private var lastTimestampMs = 0L
  private var inferenceAvgMs = 0.0
  private var warnedMirrored = false

  // Reused per frame so the camera thread does not churn 1 MB bitmaps.
  private var bitmap: Bitmap? = null
  private var rowBuffer: ByteBuffer? = null

  init {
    val context =
      NitroModules.applicationContext
        ?: throw Error("No application context — NitroModules is not initialised.")

    fun make(delegate: Delegate): MPFaceLandmarker {
      val base =
        BaseOptions
          .builder()
          .setModelAssetPath(MODEL_ASSET)
          .setDelegate(delegate)
          .build()
      val o =
        MPFaceLandmarker.FaceLandmarkerOptions
          .builder()
          .setBaseOptions(base)
          .setRunningMode(RunningMode.VIDEO)
          .setNumFaces(1)
          .setMinFaceDetectionConfidence(options.minFaceDetectionConfidence.toFloat())
          .setMinFacePresenceConfidence(options.minFacePresenceConfidence.toFloat())
          .setMinTrackingConfidence(options.minTrackingConfidence.toFloat())
          .setOutputFaceBlendshapes(false)
          .setOutputFacialTransformationMatrixes(true) // REQUIRED — this is the head pose
          .build()
      return MPFaceLandmarker.createFromOptions(context, o)
    }

    var created: MPFaceLandmarker? = null
    var active = "CPU"
    if (options.preferGpu) {
      try {
        created = make(Delegate.GPU)
        active = "GPU"
      } catch (e: Throwable) {
        Log.w(TAG, "GPU delegate failed to initialise — falling back to CPU.", e)
      }
    }
    if (created == null) {
      created = make(Delegate.CPU)
      active = "CPU"
    }
    landmarker = created
    delegate = active
    Log.i(TAG, "FaceLandmarker delegate: $active")
  }

  override val memorySize: Long
    get() = (ResultLayout.COUNT * 4L) + (bitmap?.byteCount?.toLong() ?: 0L)

  override fun detect(frame: HybridFrameSpec): Boolean {
    val current = synchronized(lock) { landmarker } ?: return false
    val native = frame as? NativeFrame ?: return false
    val image = native.image
    if (image.format != PixelFormat.RGBA_8888) {
      throw Error("FaceLandmarker needs RGBA frames — set pixelFormat: 'rgb' on the frame output.")
    }
    if (frame.isMirrored && !warnedMirrored) {
      warnedMirrored = true
      Log.w(TAG, "Frame is mirrored; analysing it unmirrored. Set mirrorMode='off' on the camera.")
    }

    val source = copyToBitmap(image)
    val rotation = image.imageInfo.rotationDegrees
    val upright =
      if (rotation == 0 && !frame.isMirrored) {
        source
      } else {
        val m = Matrix()
        if (frame.isMirrored) m.postScale(-1f, 1f, source.width / 2f, source.height / 2f)
        m.postRotate(rotation.toFloat())
        Bitmap.createBitmap(source, 0, 0, source.width, source.height, m, false)
      }

    var timestamp = SystemClock.uptimeMillis()
    if (timestamp <= lastTimestampMs) timestamp = lastTimestampMs + 1
    lastTimestampMs = timestamp

    val start = SystemClock.elapsedRealtimeNanos()
    val result = current.detectForVideo(BitmapImageBuilder(upright).build(), timestamp)
    val elapsedMs = (SystemClock.elapsedRealtimeNanos() - start) / 1_000_000.0
    inferenceAvgMs = if (inferenceAvgMs == 0.0) elapsedMs else inferenceAvgMs * 0.9 + elapsedMs * 0.1
    if (upright !== source) upright.recycle()

    val landmarks = result.faceLandmarks().firstOrNull()
    val matrix =
      result
        .facialTransformationMatrixes()
        .orElse(null)
        ?.firstOrNull()
    val found = landmarks != null && matrix != null && matrix.size >= 16

    synchronized(lock) {
      sequence += 1
      latest[ResultLayout.DETECTED] = if (found) 1f else 0f
      latest[ResultLayout.FRAME_WIDTH] = upright.width.toFloat()
      latest[ResultLayout.FRAME_HEIGHT] = upright.height.toFloat()
      latest[ResultLayout.INFERENCE_MS] = inferenceAvgMs.toFloat()
      if (!found) {
        latest[ResultLayout.LANDMARK_COUNT] = 0f
        return false
      }
      // The proto's packed_data — the array the web build passes to
      // Matrix4.fromArray (column-major).
      for (i in 0 until 16) latest[ResultLayout.MATRIX + i] = matrix!![i]
      val count = minOf(landmarks!!.size, ResultLayout.MAX_LANDMARKS)
      latest[ResultLayout.LANDMARK_COUNT] = count.toFloat()
      var o = ResultLayout.HEADER
      for (i in 0 until count) {
        val lm = landmarks[i]
        latest[o] = lm.x()
        latest[o + 1] = lm.y()
        latest[o + 2] = lm.z()
        o += 3
      }
    }
    return true
  }

  /** RGBA ImageProxy → reusable ARGB_8888 bitmap (same byte order in memory). */
  private fun copyToBitmap(image: ImageProxy): Bitmap {
    val w = image.width
    val h = image.height
    var bmp = bitmap
    if (bmp == null || bmp.width != w || bmp.height != h) {
      bmp?.recycle()
      bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
      bitmap = bmp
    }
    val plane = image.planes[0]
    val src = plane.buffer
    src.rewind()
    val rowBytes = w * 4
    if (plane.rowStride == rowBytes && plane.pixelStride == 4) {
      bmp!!.copyPixelsFromBuffer(src)
    } else {
      // Padded rows: pack them first.
      var packed = rowBuffer
      if (packed == null || packed.capacity() != rowBytes * h) {
        packed = ByteBuffer.allocateDirect(rowBytes * h).order(ByteOrder.nativeOrder())
        rowBuffer = packed
      }
      packed!!.clear()
      val row = ByteArray(rowBytes)
      for (y in 0 until h) {
        src.position(y * plane.rowStride)
        src.get(row, 0, rowBytes)
        packed.put(row)
      }
      packed.rewind()
      bmp!!.copyPixelsFromBuffer(packed)
    }
    return bmp
  }

  override fun readLatest(out: ArrayBuffer): Double {
    val buffer = out.getBuffer(false).order(ByteOrder.nativeOrder())
    synchronized(lock) {
      val n = minOf(buffer.capacity() / 4, latest.size)
      buffer.asFloatBuffer().put(latest, 0, n)
      return sequence
    }
  }

  override fun close() {
    synchronized(lock) {
      landmarker?.close()
      landmarker = null
      sequence = 0.0
    }
  }

  override fun dispose() {
    close()
    super.dispose()
  }

  companion object {
    private const val TAG = "VTO"
    private const val MODEL_ASSET = "face_landmarker.task"
  }
}
