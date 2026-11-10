package com.margelo.nitro.moptic.vto

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.TextPaint
import android.text.TextUtils
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * The saved try-on photo, built the way the website builds it
 * (VirtualTryOnR3F.takePhoto + photoCard.ts): the camera photo aspect-filled
 * into the analysed-frame cover box, cropped to the window the screen shows,
 * the glasses snapshot on top, the composite mirrored once, then put on a white
 * card with the M-Optic mark, the frame name and colour.
 *
 * Card proportions are photoCard.ts's FALLBACK set (fractions of the photo
 * width). The review screen shows this same file.
 */
internal object PhotoCardComposer {
  private const val PAD = 0.045
  private const val LOGO = 0.075
  private const val TITLE = 0.038
  private const val SUBTITLE = 0.03
  private const val GAP_AFTER_PHOTO = 0.05
  private const val GAP_AFTER_LOGO = 0.035
  private const val GAP_BETWEEN_LINES = 0.018
  private const val EXPORT_LINE_GAP = 6.0

  private val TITLE_COLOR = Color.argb(255, 16, 26, 51)
  private val SUBTITLE_COLOR = Color.argb(153, 16, 26, 51)
  private val BORDER_COLOR = Color.argb(26, 0, 0, 0)

  fun compose(
    context: Context,
    r: PhotoCardRequest,
  ): PhotoCardResult {
    val viewW = max(1, r.viewWidth.roundToInt())
    val viewH = max(1, r.viewHeight.roundToInt())
    val coverW = max(1.0, r.coverWidth)
    val coverH = max(1.0, r.coverHeight)

    val photo = uprightPhoto(stripScheme(r.photoPath), r, coverW, coverH)
    val overlay =
      if (r.overlayPath.isEmpty()) null else BitmapFactory.decodeFile(stripScheme(r.overlayPath))

    // ── 1–4: the shot, at the GL view's own resolution ──────────────────────
    val shot = Bitmap.createBitmap(viewW, viewH, Bitmap.Config.ARGB_8888)
    Canvas(shot).apply {
      drawColor(Color.BLACK)
      if (r.mirror) {
        translate(viewW.toFloat(), 0f)
        scale(-1f, 1f)
      }
      val s = max(coverW / photo.width, coverH / photo.height)
      val dw = photo.width * s
      val dh = photo.height * s
      val dx = (coverW - dw) / 2 - r.viewX
      val dy = (coverH - dh) / 2 - r.viewY
      val filter = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
      drawBitmap(photo, null, RectF(dx.toFloat(), dy.toFloat(), (dx + dw).toFloat(), (dy + dh).toFloat()), filter)
      overlay?.let { drawBitmap(it, null, RectF(0f, 0f, viewW.toFloat(), viewH.toFloat()), filter) }
    }
    photo.recycle()
    overlay?.recycle()

    // ── 5: the card ─────────────────────────────────────────────────────────
    val w = viewW.toDouble()
    val h = viewH.toDouble()
    val pad = Math.round(w * PAD).toDouble()
    val titleSize = max(15.0, Math.round(w * TITLE).toDouble())
    val subtitleSize = max(12.0, Math.round(w * SUBTITLE).toDouble())
    val logoBox = max(28.0, Math.round(w * LOGO).toDouble())
    val captionMarginTop = Math.round(w * GAP_AFTER_PHOTO).toDouble()
    val captionGap = Math.round(w * GAP_AFTER_LOGO).toDouble()
    val subtitleMarginTop = Math.round(w * GAP_BETWEEN_LINES) + EXPORT_LINE_GAP

    val logo = loadLogo(context)
    val title = r.title.trim()
    val subtitle = r.subtitle.trim()
    val hasLogo = logo != null
    val hasTitle = title.isNotEmpty()
    val hasSubtitle = subtitle.isNotEmpty()

    var captionHeight = 0.0
    if (hasLogo || hasTitle || hasSubtitle) captionHeight += captionMarginTop
    if (hasLogo) captionHeight += logoBox
    if (hasLogo && (hasTitle || hasSubtitle)) captionHeight += captionGap
    if (hasTitle) captionHeight += titleSize
    if (hasSubtitle) captionHeight += (if (hasTitle) subtitleMarginTop else 0.0) + subtitleSize

    val cardW = (w + pad * 2).roundToInt()
    val cardH = (pad + h + captionHeight + pad).roundToInt()
    val card = Bitmap.createBitmap(cardW, cardH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(card)
    canvas.drawColor(Color.WHITE)
    canvas.drawBitmap(shot, pad.toFloat(), pad.toFloat(), null)
    shot.recycle()

    val border =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1f
        color = BORDER_COLOR
      }
    canvas.drawRect(
      (pad + 0.5).toFloat(),
      (pad + 0.5).toFloat(),
      (pad + w - 0.5).toFloat(),
      (pad + h - 0.5).toFloat(),
      border,
    )

    val centerX = cardW / 2f
    var y = pad + h + captionMarginTop
    if (logo != null) {
      val src = logo.width.toDouble() / max(1, logo.height)
      val drawW = if (src > 1) logoBox else Math.round(logoBox * src).toDouble()
      val drawH = if (src > 1) Math.round(logoBox / src).toDouble() else logoBox
      val top = y + (logoBox - drawH) / 2
      canvas.drawBitmap(
        logo,
        null,
        RectF((centerX - drawW / 2).toFloat(), top.toFloat(), (centerX + drawW / 2).toFloat(), (top + drawH).toFloat()),
        Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG),
      )
      y += logoBox
      if (hasTitle || hasSubtitle) y += captionGap
    }
    val maxTextWidth = (cardW - pad * 2).toFloat()
    if (hasTitle) {
      drawCentered(canvas, title, typeface(context, r.boldFontFamily), titleSize, TITLE_COLOR, centerX, y, maxTextWidth)
      y += titleSize + subtitleMarginTop
    }
    if (hasSubtitle) {
      drawCentered(canvas, subtitle, typeface(context, r.fontFamily), subtitleSize, SUBTITLE_COLOR, centerX, y, maxTextWidth)
    }

    val out = File(stripScheme(r.outputPath))
    out.parentFile?.mkdirs()
    FileOutputStream(out).use { stream ->
      val q = (min(max(r.jpegQuality, 0.1), 1.0) * 100).roundToInt()
      card.compress(Bitmap.CompressFormat.JPEG, q, stream)
    }
    card.recycle()
    return PhotoCardResult(out.absolutePath, cardW.toDouble(), cardH.toDouble())
  }

  private fun stripScheme(path: String): String = if (path.startsWith("file://")) path.removePrefix("file://") else path

  /**
   * The photo, upright and unmirrored. EXIF orientation first; if the result
   * still disagrees with the screen (portrait), the capture's own orientation
   * metadata is applied on top. Decoded at a sample size near what the cover
   * box needs, so a 12 MP photo never lands in memory at full size.
   */
  private fun uprightPhoto(
    path: String,
    r: PhotoCardRequest,
    coverW: Double,
    coverH: Double,
  ): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw Error("Could not read the camera photo at $path")
    val longest = max(bounds.outWidth, bounds.outHeight)
    val needed = max(coverW, coverH)
    var sample = 1
    while (longest / (sample * 2) >= needed) sample *= 2
    val decoded =
      BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
        ?: throw Error("Could not decode the camera photo at $path")

    val m = Matrix()
    var rotate = 0
    var flip = false
    try {
      when (ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> rotate = 90
        ExifInterface.ORIENTATION_ROTATE_180 -> rotate = 180
        ExifInterface.ORIENTATION_ROTATE_270 -> rotate = 270
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> flip = true
        ExifInterface.ORIENTATION_TRANSPOSE -> {
          rotate = 90
          flip = true
        }
        ExifInterface.ORIENTATION_TRANSVERSE -> {
          rotate = 270
          flip = true
        }
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
          rotate = 180
          flip = true
        }
      }
    } catch (_: Throwable) {
      // No EXIF — fall through to the metadata check below.
    }
    val swapped = rotate == 90 || rotate == 270
    val uprightW = if (swapped) decoded.height else decoded.width
    val uprightH = if (swapped) decoded.width else decoded.height
    val wantPortrait = coverH >= coverW
    if ((uprightH >= uprightW) != wantPortrait) {
      rotate +=
        when (r.photoOrientation) {
          "left" -> 270
          "down" -> 180
          else -> 90
        }
    }
    if (flip != r.photoMirrored) m.postScale(-1f, 1f)
    if (rotate % 360 != 0) m.postRotate(rotate.toFloat())
    if (m.isIdentity) return decoded
    val out = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, m, true)
    if (out !== decoded) decoded.recycle()
    return out
  }

  @Volatile private var cachedLogo: Bitmap? = null

  private fun loadLogo(context: Context): Bitmap? {
    cachedLogo?.let { return it }
    return try {
      context.assets.open("photo_card_logo.png").use { BitmapFactory.decodeStream(it) }.also { cachedLogo = it }
    } catch (_: Throwable) {
      null
    }
  }

  private fun typeface(
    context: Context,
    family: String,
  ): Typeface {
    if (family.isNotEmpty()) {
      try {
        return Typeface.createFromAsset(context.assets, "fonts/$family.ttf")
      } catch (_: Throwable) {
        // Not an app font — fall back below.
      }
    }
    return Typeface.DEFAULT
  }

  private fun drawCentered(
    canvas: Canvas,
    text: String,
    face: Typeface,
    size: Double,
    color: Int,
    centerX: Float,
    top: Double,
    maxWidth: Float,
  ) {
    val paint =
      TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = face
        textSize = size.toFloat()
        this.color = color
        textAlign = Paint.Align.CENTER
      }
    val fitted = TextUtils.ellipsize(text, paint, maxWidth, TextUtils.TruncateAt.END).toString()
    // Canvas textBaseline 'top': the em box starts at `top`.
    val baseline = top - paint.fontMetrics.ascent
    canvas.drawText(fitted, centerX, baseline.toFloat(), paint)
  }
}
