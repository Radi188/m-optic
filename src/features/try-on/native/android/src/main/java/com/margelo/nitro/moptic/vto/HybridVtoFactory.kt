package com.margelo.nitro.moptic.vto

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.annotation.Keep
import java.io.FileOutputStream
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

@DoNotStrip
@Keep
class HybridVtoFactory : HybridVtoFactorySpec() {
  override fun createFaceLandmarker(options: FaceLandmarkerOptions): Promise<HybridFaceLandmarkerSpec> =
    Promise.async { HybridFaceLandmarker(options) }

  override fun composePhotoCard(request: PhotoCardRequest): Promise<PhotoCardResult> =
    Promise.async {
      val context =
        NitroModules.applicationContext
          ?: throw Error("No application context — NitroModules is not initialised.")
      PhotoCardComposer.compose(context, request)
    }

  override fun transcodeToPng(inputPath: String, outputPath: String): Promise<Unit> =
    Promise.async {
      val options =
        BitmapFactory.Options().apply {
          inPreferredConfig = Bitmap.Config.ARGB_8888
          inScaled = false
        }
      val bitmap =
        BitmapFactory.decodeFile(inputPath, options)
          ?: throw Error("Cannot decode image: $inputPath")
      try {
        FileOutputStream(outputPath).use { out ->
          if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) {
            throw Error("Cannot write PNG: $outputPath")
          }
        }
      } finally {
        bitmap.recycle()
      }
    }
}
