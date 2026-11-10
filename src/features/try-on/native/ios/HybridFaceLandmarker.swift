//
//  HybridFaceLandmarker.swift
//  MOpticVTO
//
//  MediaPipe Face Landmarker as a VisionCamera frame-processor plugin.
//
//  Same options as the website's faceTracker.ts: VIDEO running mode, one face,
//  facial transformation matrix ON, blendshapes OFF, GPU delegate with a CPU
//  fallback. `detect` runs on the camera's frame-processor thread; the result is
//  kept here and copied out by the renderer (`readLatest`) once per rendered
//  frame, so no image data and no per-frame messages reach the JS thread.
//

import AVFoundation
import Foundation
import MediaPipeTasksVision
import NitroModules
import QuartzCore
import UIKit
import VisionCamera

/// Float layout of the result buffer. Must match RESULT_LAYOUT in ../index.ts.
enum ResultLayout {
  static let matrix = 0          // 16 floats, column-major, centimetres
  static let detected = 16       // 1 = a face is in this result
  static let frameWidth = 17     // analysed frame, upright, px
  static let frameHeight = 18
  static let inferenceMs = 19    // rolling average
  static let landmarkCount = 20
  static let header = 24
  static let maxLandmarks = 478
  static let count = header + maxLandmarks * 3
}

final class HybridFaceLandmarker: HybridFaceLandmarkerSpec {
  private var landmarker: MediaPipeTasksVision.FaceLandmarker?
  let delegate: String

  private let lock = NSLock()
  private var latest = [Float](repeating: 0, count: ResultLayout.count)
  private var sequence: Double = 0
  private var lastTimestampMs = 0
  private var inferenceAvgMs: Double = 0
  private var warnedMirrored = false

  init(options: FaceLandmarkerOptions) throws {
    guard let modelPath = HybridFaceLandmarker.modelPath() else {
      throw RuntimeError.error(withMessage: "face_landmarker.task is missing from the app bundle (MOpticVTO.bundle).")
    }

    func make(_ delegate: Delegate) throws -> MediaPipeTasksVision.FaceLandmarker {
      let o = MediaPipeTasksVision.FaceLandmarkerOptions()
      o.baseOptions.modelAssetPath = modelPath
      o.baseOptions.delegate = delegate
      o.runningMode = .video
      o.numFaces = 1
      o.minFaceDetectionConfidence = Float(options.minFaceDetectionConfidence)
      o.minFacePresenceConfidence = Float(options.minFacePresenceConfidence)
      o.minTrackingConfidence = Float(options.minTrackingConfidence)
      o.outputFaceBlendshapes = false
      o.outputFacialTransformationMatrixes = true // REQUIRED — this is the head pose
      return try MediaPipeTasksVision.FaceLandmarker(options: o)
    }

    var created: MediaPipeTasksVision.FaceLandmarker?
    var active = "CPU"
    if options.preferGpu {
      do {
        created = try make(.GPU)
        active = "GPU"
      } catch {
        NSLog("[VTO] GPU delegate failed to initialise — falling back to CPU. %@", error.localizedDescription)
      }
    }
    if created == nil {
      created = try make(.CPU)
      active = "CPU"
    }
    self.landmarker = created
    self.delegate = active
    super.init()
    NSLog("[VTO] FaceLandmarker delegate: %@", active)
  }

  var memorySize: Int { ResultLayout.count * MemoryLayout<Float>.size }

  /// The model ships in this pod's resource bundle (see MOpticVTO.podspec).
  private static func modelPath() -> String? {
    let candidates = [Bundle.main, Bundle(for: HybridFaceLandmarker.self)]
    for bundle in candidates {
      if let url = bundle.url(forResource: "MOpticVTO", withExtension: "bundle"),
         let resources = Bundle(url: url),
         let path = resources.path(forResource: "face_landmarker", ofType: "task") {
        return path
      }
      if let path = bundle.path(forResource: "face_landmarker", ofType: "task") {
        return path
      }
    }
    return nil
  }

  func detect(frame: any HybridFrameSpec) throws -> Bool {
    lock.lock()
    let current = self.landmarker
    lock.unlock()
    guard let landmarker = current else { return false }
    guard let nativeFrame = frame as? any NativeFrame, let sampleBuffer = nativeFrame.sampleBuffer else {
      return false
    }

    // The frame output delivers upright, unmirrored buffers (physical rotation
    // on, mirror mode off), so this is normally `.up`. Anything else is
    // honoured here so the landmarks always describe the upright, unmirrored
    // camera image, which is the space the website's renderer works in.
    if frame.isMirrored && !warnedMirrored {
      warnedMirrored = true
      NSLog("[VTO] Frame is mirrored; analysing it unmirrored. Set mirrorMode='off' on the camera.")
    }
    let orientation = frame.orientation.uprightImageOrientation
    let image = try MPImage(sampleBuffer: sampleBuffer, orientation: orientation)

    var uprightWidth = Float(frame.width)
    var uprightHeight = Float(frame.height)
    if frame.orientation == .left || frame.orientation == .right {
      swap(&uprightWidth, &uprightHeight)
    }

    // VIDEO mode needs strictly increasing timestamps.
    var timestamp = Int(CACurrentMediaTime() * 1000)
    if timestamp <= lastTimestampMs { timestamp = lastTimestampMs + 1 }
    lastTimestampMs = timestamp

    let start = CACurrentMediaTime()
    let result = try landmarker.detect(videoFrame: image, timestampInMilliseconds: timestamp)
    let elapsedMs = (CACurrentMediaTime() - start) * 1000
    inferenceAvgMs = inferenceAvgMs == 0 ? elapsedMs : inferenceAvgMs * 0.9 + elapsedMs * 0.1

    let landmarks = result.faceLandmarks.first
    let matrix = result.facialTransformationMatrixes.first
    let found = landmarks != nil && matrix != nil && (matrix!.rows * matrix!.columns) == 16

    lock.lock()
    defer { lock.unlock() }
    sequence += 1
    latest[ResultLayout.detected] = found ? 1 : 0
    latest[ResultLayout.frameWidth] = uprightWidth
    latest[ResultLayout.frameHeight] = uprightHeight
    latest[ResultLayout.inferenceMs] = Float(inferenceAvgMs)
    guard found, let landmarks, let matrix else {
      latest[ResultLayout.landmarkCount] = 0
      return false
    }
    // `data` is the proto's packed_data — the exact array the web build
    // hands to `Matrix4.fromArray` (column-major).
    for i in 0..<16 {
      latest[ResultLayout.matrix + i] = matrix.data[i]
    }
    let count = min(landmarks.count, ResultLayout.maxLandmarks)
    latest[ResultLayout.landmarkCount] = Float(count)
    var o = ResultLayout.header
    for i in 0..<count {
      let lm = landmarks[i]
      latest[o] = lm.x
      latest[o + 1] = lm.y
      latest[o + 2] = lm.z
      o += 3
    }
    return true
  }

  func readLatest(out: ArrayBuffer) throws -> Double {
    lock.lock()
    defer { lock.unlock() }
    let n = min(out.size / MemoryLayout<Float>.size, latest.count)
    if n > 0 {
      latest.withUnsafeBufferPointer { src in
        out.data.withMemoryRebound(to: Float.self, capacity: n) { dst in
          dst.update(from: src.baseAddress!, count: n)
        }
      }
    }
    return sequence
  }

  func close() throws {
    lock.lock()
    landmarker = nil
    sequence = 0
    lock.unlock()
  }
}

private extension CameraOrientation {
  /// Orientation that turns the buffer upright — never mirrored, since the
  /// try-on analyses the raw camera image and mirrors the composite on screen.
  var uprightImageOrientation: UIImage.Orientation {
    switch self {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    }
  }
}
