package com.moptic

import android.view.WindowManager
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Screen-capture policy switch for the JS side.
 *
 * The app is protected by FLAG_SECURE from the very first frame (see
 * [MainActivity]); this module is how the handful of screens that are allowed to
 * be captured — face scan, eye test, 3-D model, AR try-on — lift that protection
 * while they are on screen and put it back when they leave.
 *
 * Blocked is always the fallback: anything that goes wrong here (no activity, a
 * JS crash, an activity recreation, a fresh launch) leaves the window secure.
 */
class ScreenGuardModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  /** Mirrors the window flag so a recreated activity can be put back in sync. */
  private var captureAllowed = false

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun allowCapture(promise: Promise) {
    apply(allowed = true, promise = promise)
  }

  @ReactMethod
  fun blockCapture(promise: Promise) {
    apply(allowed = false, promise = promise)
  }

  /** Whether capture is currently allowed — handy for debugging from JS. */
  @ReactMethod
  fun isCaptureAllowed(promise: Promise) {
    promise.resolve(captureAllowed)
  }

  private fun apply(allowed: Boolean, promise: Promise?) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      // Nothing to change yet. onHostResume applies the intent once an activity
      // is attached, so remember it rather than dropping it.
      captureAllowed = allowed
      promise?.resolve(allowed)
      return
    }

    activity.runOnUiThread {
      captureAllowed = allowed
      if (allowed) {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
      } else {
        activity.window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE,
        )
      }
      promise?.resolve(allowed)
    }
  }

  // The window flags are lost when the activity is recreated (rotation, process
  // restart), and MainActivity always comes back secure — re-apply the intent.
  override fun onHostResume() {
    if (captureAllowed) apply(allowed = true, promise = null)
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    // A new activity starts secure, so the flag no longer stands.
    captureAllowed = false
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  companion object {
    const val NAME = "ScreenGuardModule"
  }
}
