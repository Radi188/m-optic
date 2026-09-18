import Foundation
import React
import UIKit

/**
 Screen-capture policy switch for the JS side.

 The app is protected from the first frame by `ScreenGuard` (see AppDelegate);
 this module is how the handful of screens that are allowed to be captured —
 face scan, eye test, 3-D model, AR try-on — lift that protection while they are
 on screen and hand it back when they leave.

 Everything runs on the main queue because lifting the block re-parents layers.
 */
@objc(ScreenGuardModule)
final class ScreenGuardModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func allowCapture(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    setAllowed(true, resolve)
  }

  @objc func blockCapture(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    setAllowed(false, resolve)
  }

  @objc func isCaptureAllowed(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      resolve(ScreenGuard.shared.captureAllowed)
    }
  }

  private func setAllowed(_ allowed: Bool, _ resolve: @escaping RCTPromiseResolveBlock) {
    DispatchQueue.main.async {
      ScreenGuard.shared.setCaptureAllowed(allowed)
      resolve(allowed)
    }
  }
}
