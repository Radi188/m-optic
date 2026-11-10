//
//  HybridVtoFactory.swift
//  MOpticVTO
//

import Foundation
import NitroModules

final class HybridVtoFactory: HybridVtoFactorySpec {
  private static let composeQueue = DispatchQueue(label: "moptic.vto.photo-card", qos: .userInitiated)

  func createFaceLandmarker(options: FaceLandmarkerOptions) throws -> Promise<any HybridFaceLandmarkerSpec> {
    return Promise.parallel(DispatchQueue.global(qos: .userInitiated)) {
      try HybridFaceLandmarker(options: options)
    }
  }

  func composePhotoCard(request: PhotoCardRequest) throws -> Promise<PhotoCardResult> {
    return Promise.parallel(HybridVtoFactory.composeQueue) {
      try PhotoCardComposer.compose(request)
    }
  }

  func transcodeToPng(inputPath: String, outputPath: String) throws -> Promise<Void> {
    return Promise.parallel(DispatchQueue.global(qos: .userInitiated)) {
      // ImageIO, not UIImage: exact pixels, no orientation or scale handling.
      let input = URL(fileURLWithPath: inputPath) as CFURL
      guard let source = CGImageSourceCreateWithURL(input, nil),
            let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
      else {
        throw RuntimeError.error(withMessage: "Cannot decode image: \(inputPath)")
      }
      let output = URL(fileURLWithPath: outputPath) as CFURL
      guard let destination = CGImageDestinationCreateWithURL(output, "public.png" as CFString, 1, nil) else {
        throw RuntimeError.error(withMessage: "Cannot create PNG: \(outputPath)")
      }
      CGImageDestinationAddImage(destination, image, nil)
      guard CGImageDestinationFinalize(destination) else {
        throw RuntimeError.error(withMessage: "Cannot write PNG: \(outputPath)")
      }
    }
  }
}
