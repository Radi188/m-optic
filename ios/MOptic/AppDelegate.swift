import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "MOptic",
      in: window,
      launchOptions: launchOptions
    )

    if let window = window {
      ScreenGuard.shared.protect(window: window)
    }

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}



/**
 iOS has no public API to forbid a screenshot the way Android's FLAG_SECURE does.
 The one thing that works is `applySecureLayer`: UIKit leaves the contents of a
 secure (password-style) UITextField out of the screenshot and recording buffer,
 so re-parenting the app's content layer under that field's canvas makes captures
 come out black while the screen still renders normally in front of the user.

 The re-parenting target matters. It must be a view that HAS a superlayer — the
 React Native root view. Applying it to the UIWindow makes the window's own layer
 a descendant of itself, which is a CoreAnimation cycle and an instant crash on
 the first frame.

 On top of that:

 1. A screenshot that still gets through (see the Simulator note on
    `applySecureLayer`) is answered with a full-screen black policy notice.
    `userDidTakeScreenshotNotification` fires *after* the capture, so it is a
    deterrent, not the block — the secure layer is the block.
 2. Live screen recording and AirPlay mirroring are covered for as long as the
    capture session runs. `isCaptured` stays false on the Simulator.
 3. The app-switcher snapshot is covered on resign-active, matching what
    FLAG_SECURE gives us on Android.

 Capture is ALLOWED by default. Only screens that show prices (home best
 sellers, product lists and detail, invoices) call `setCaptureAllowed(false)`
 through ScreenGuardModule while they are focused, which applies the secure
 layer and the covers above, and allow it again when they are left. Face scan,
 eye test, AR try-on and the rest are never blocked. The JS side re-syncs on
 every launch and reload, so a block cannot outlive the screen that set it.
 */
final class ScreenGuard {
  static let shared = ScreenGuard()

  private enum Copy {
    static let recordingTitle = "Screen recording is not allowed"
    static let recordingTitleKm = "មិនអនុញ្ញាតឱ្យថតវីដេអូអេក្រង់ទេ"
    static let screenshotTitle = "Screenshots are not allowed"
    static let screenshotTitleKm = "មិនអនុញ្ញាតឱ្យថតរូបអេក្រង់ទេ"
    static let screenshotBody =
      "Prices shown in M-Optic are confidential. "
      + "Capturing or sharing this screen is against our policy."
    static let screenshotBodyKm =
      "តម្លៃដែលបង្ហាញក្នុង M-Optic គឺជាព័ត៌មានសម្ងាត់។ "
      + "ការថត ឬចែករំលែកអេក្រង់នេះ គឺផ្ទុយនឹងគោលការណ៍របស់យើង។"
    static let dismiss = "I understand · ខ្ញុំយល់ព្រម"
  }

  /// Set to false if a future iOS release makes the secure layer misbehave; the
  /// notice and recording covers below keep working on their own.
  private let useSecureLayerTrick = true

  private let secureField = UITextField()
  private var secureLayerApplied = false
  /// Capture is allowed by default; screens that show prices block it through
  /// ScreenGuardModule while they are focused. Never persisted.
  private(set) var captureAllowed = true
  /// How strong the app-switcher blur is, 0...1.
  private static let blurIntensity: CGFloat = 0.5

  /// How a cover hides the content beneath it.
  private enum CoverStyle {
    /// Solid black. Used where the content must not be recoverable at all.
    case opaque
    /// Frosted glass. Enough to make the app-switcher card unreadable while still
    /// letting the user recognise their own app.
    case blurred
  }

  private weak var window: UIWindow?

  /// Covers the content while recording or backgrounded. Not dismissible by the user.
  private var privacyCover: UIView?
  /// Holds the app-switcher blur part-way through; see `blurCover`.
  private var blurAnimator: UIViewPropertyAnimator?
  /// The policy notice raised after a screenshot. Dismissed by the user.
  private var screenshotNotice: UIView?

  private init() {}

  func protect(window: UIWindow) {
    self.window = window

    if useSecureLayerTrick {
      // The root view controller is attached by startReactNative on this run loop
      // turn, so take the next one.
      DispatchQueue.main.async { [weak self] in
        guard let self = self, !self.captureAllowed else { return }
        self.applySecureLayer(in: window)
      }
    }

    let center = NotificationCenter.default
    center.addObserver(
      self,
      selector: #selector(captureStateChanged),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(didTakeScreenshot),
      name: UIApplication.userDidTakeScreenshotNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(willResignActive),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(didBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )

    // A recording may already be running when we launch.
    captureStateChanged()
  }

  // MARK: - Per-screen policy

  /// Lifts or restores the capture block. Main thread only — it touches views.
  ///
  /// Calls are counted on the JS side, so this only ever sees the resolved
  /// state and a repeated call with the same value is a no-op.
  func setCaptureAllowed(_ allowed: Bool) {
    guard captureAllowed != allowed else { return }
    captureAllowed = allowed

    if allowed {
      removeSecureLayer()
      // A cover or notice raised a moment ago belongs to the screen the user
      // just left; nothing on this one is blocked.
      dismissScreenshotNotice()
      hidePrivacyCover()
    } else {
      if useSecureLayerTrick, let window = window {
        applySecureLayer(in: window)
      }
      // Re-entering a protected screen mid-recording must cover it right away.
      if UIScreen.main.isCaptured {
        showPrivacyCover(
          title: Copy.recordingTitle,
          subtitle: Copy.recordingTitleKm,
          style: .opaque
        )
      }
    }
  }

  // MARK: - Screenshot block

  /// Re-parents the React Native root view's layer under the secure field's canvas.
  /// Every step is guarded: if UIKit's private structure ever changes shape, this
  /// bails out leaving the view tree untouched rather than corrupting it.
  ///
  /// NOTE: this has no effect on the Simulator. ⌘S and `simctl io screenshot` copy
  /// the host framebuffer and never go through UIKit's capture path, so the image
  /// comes out normal there. Verify on a real device.
  private func applySecureLayer(in window: UIWindow) {
    guard !secureLayerApplied,
          let content = window.rootViewController?.view,
          let contentSuperlayer = content.layer.superlayer
    else { return }

    secureField.isSecureTextEntry = true
    secureField.isUserInteractionEnabled = false
    secureField.backgroundColor = .clear
    // Deliberately frame-based and zero-sized. Auto Layout must not be involved:
    // once the content layer is re-parented below, a constraint between the field
    // and the content has no common engine host, and UIKit aborts in
    // -[NSLayoutConstraint _addToEngine:] on the window's first layout pass.
    secureField.frame = .zero

    // The field is parked on the WINDOW, never inside the content it is about to
    // host. As a subview of `content` it deadlocks UIKit's own traversals: the
    // field is then a subview of the view whose layer the field's canvas holds,
    // and -[UIView(MultiLayer) _allSubviews] follows layers as well as subviews,
    // so a visibility change walks content → field → content forever and
    // overflows the main thread's stack (EXC_BAD_ACCESS in
    // _updateAncestorHiddenForSubtreeBeingNotifiedOfVisibilityChange:). RN
    // toggles view visibility constantly — modals, navigation, tab switches —
    // so that fires at random moments during ordinary use.
    //
    // On the window the field is a sibling of the content instead of its child,
    // which leaves no way back and keeps the capture block intact: what makes
    // captures come out black is the content's LAYER sitting in the field's
    // canvas, not where the field's view happens to live.
    //
    // It goes directly above the content, NOT on top of the window. A modal RN
    // has presented (announcement pop-up, alerts, sheets) lives in a window
    // subview above the content; parking the field on top would paint the app
    // over that modal while the modal still takes every touch — the app looks
    // normal but nothing can be tapped.
    if content.superview === window {
      window.insertSubview(secureField, aboveSubview: content)
    } else {
      window.addSubview(secureField)
    }

    // Belt and braces: the field's layer must not sit inside the content it is
    // about to host, or that content's layer becomes its own ancestor. Inserting
    // it on the window above already put it here, right above the content; this
    // keeps both invariants explicit if that ever changes.
    contentSuperlayer.insertSublayer(secureField.layer, above: content.layer)

    // The canvas UIKit keeps out of captures is the field's last sublayer on
    // iOS 17+, and its first on older releases.
    let canvas = {
      if #available(iOS 17.0, *) { return secureField.layer.sublayers?.last }
      return secureField.layer.sublayers?.first
    }()

    guard let canvas = canvas, canvas !== content.layer else {
      // Structure not what we expect: put the field's layer back and give up.
      secureField.removeFromSuperview()
      secureField.layer.removeFromSuperlayer()
      return
    }

    canvas.addSublayer(content.layer)
    secureLayerApplied = true
  }

  /// Undoes `applySecureLayer`: the content layer goes back under the layer the
  /// secure field was lifted into — the root view controller's original
  /// superlayer — and the field is taken out of the tree.
  private func removeSecureLayer() {
    defer { secureLayerApplied = false }
    guard secureLayerApplied,
          let content = window?.rootViewController?.view,
          let host = secureField.layer.superlayer
    else { return }

    // Order matters: move the content out of the field's canvas first, so
    // tearing the field down can never take the app's own layer with it.
    // It goes back where the field sat, not on top: `addSublayer` would paint
    // the content over any modal presented in the meantime (see
    // `applySecureLayer`).
    host.insertSublayer(content.layer, below: secureField.layer)
    secureField.removeFromSuperview()
    secureField.layer.removeFromSuperlayer()
  }

  // MARK: - Events

  @objc private func captureStateChanged() {
    if captureAllowed {
      hidePrivacyCover()
      return
    }
    if UIScreen.main.isCaptured {
      showPrivacyCover(title: Copy.recordingTitle, subtitle: Copy.recordingTitleKm, style: .opaque)
    } else {
      hidePrivacyCover()
    }
  }

  @objc private func didTakeScreenshot() {
    guard !captureAllowed else { return }
    showScreenshotNotice()
  }

  @objc private func willResignActive() {
    // Applied on every screen, capture-friendly or not: the app-switcher card is
    // not a screenshot the user asked for, and blurring it costs them nothing.
    // No text: this one only has to make the app-switcher snapshot unreadable.
    showPrivacyCover(title: nil, subtitle: nil, style: .blurred)
  }

  @objc private func didBecomeActive() {
    // Anything still capturing keeps its own cover.
    if UIScreen.main.isCaptured && !captureAllowed {
      showPrivacyCover(title: Copy.recordingTitle, subtitle: Copy.recordingTitleKm, style: .opaque)
    } else {
      hidePrivacyCover()
    }
  }

  // MARK: - Privacy cover (recording / background)

  private func showPrivacyCover(title: String?, subtitle: String?, style: CoverStyle) {
    guard let window = window else { return }
    hidePrivacyCover()

    let cover = style == .blurred ? blurCover(in: window) : blackCover(in: window)
    if let title = title {
      let stack = messageStack(title: title, titleKm: subtitle, body: nil, bodyKm: nil)
      let host = (cover as? UIVisualEffectView)?.contentView ?? cover
      host.addSubview(stack)
      centerStack(stack, in: host)
    }

    window.addSubview(cover)
    coverTopmost(window)
    privacyCover = cover
  }

  private func hidePrivacyCover() {
    blurAnimator?.stopAnimation(true)
    blurAnimator = nil
    privacyCover?.removeFromSuperview()
    privacyCover = nil
  }

  // MARK: - Screenshot policy notice

  private func showScreenshotNotice() {
    guard let window = window, screenshotNotice == nil else { return }

    // The screenshot itself has already come out black (secure layer); this is
    // what the user sees afterwards, so it can show the app frosted behind the
    // message instead of a blank wall.
    let notice = frostedCover(in: window)
    let host = notice.contentView
    let stack = messageStack(
      title: Copy.screenshotTitle,
      titleKm: Copy.screenshotTitleKm,
      body: Copy.screenshotBody,
      bodyKm: Copy.screenshotBodyKm
    )

    var config = UIButton.Configuration.filled()
    config.title = Copy.dismiss
    config.baseBackgroundColor = .white
    config.baseForegroundColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
    config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
    config.background.cornerRadius = 22
    let button = UIButton(configuration: config)
    button.addTarget(self, action: #selector(dismissScreenshotNotice), for: .touchUpInside)
    stack.addArrangedSubview(button)
    stack.setCustomSpacing(28, after: stack.arrangedSubviews[stack.arrangedSubviews.count - 2])

    host.addSubview(stack)
    centerStack(stack, in: host)

    notice.alpha = 0
    window.addSubview(notice)
    screenshotNotice = notice
    coverTopmost(window)
    UIView.animate(withDuration: 0.18) { notice.alpha = 1 }
  }

  @objc private func dismissScreenshotNotice() {
    guard let notice = screenshotNotice else { return }
    screenshotNotice = nil
    UIView.animate(
      withDuration: 0.18,
      animations: { notice.alpha = 0 },
      completion: { _ in notice.removeFromSuperview() }
    )
  }

  // MARK: - Shared view building

  private func blackCover(in window: UIWindow) -> UIView {
    let cover = UIView(frame: window.bounds)
    cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    cover.backgroundColor = .black
    // Swallow every touch so nothing underneath can be interacted with.
    cover.isUserInteractionEnabled = true
    return cover
  }

  /// Full-strength dark blur with a dim on top: the app reads as "still there"
  /// but nothing on it is legible, and white text stays readable over any
  /// screen. Used only for the screenshot notice — the recording cover stays
  /// opaque, since it is itself part of the recording.
  private func frostedCover(in window: UIWindow) -> UIVisualEffectView {
    let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterialDark))
    blur.frame = window.bounds
    blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    // Swallow every touch so nothing underneath can be interacted with.
    blur.isUserInteractionEnabled = true

    let dim = UIView(frame: blur.bounds)
    dim.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    dim.backgroundColor = UIColor.black.withAlphaComponent(0.35)
    blur.contentView.addSubview(dim)

    return blur
  }

  private func blurCover(in window: UIWindow) -> UIView {
    let blur = UIVisualEffectView(effect: nil)
    blur.frame = window.bounds
    blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    blur.isUserInteractionEnabled = true

    // UIBlurEffect has no intensity of its own, so the standard way to get a
    // partial one is to drive the effect through a paused property animator and
    // stop it part-way. The animator must be retained or the effect resets to nil,
    // and stopped before release or UIKit throws on dealloc — see hidePrivacyCover.
    let animator = UIViewPropertyAnimator(duration: 1, curve: .linear) {
      blur.effect = UIBlurEffect(style: .systemChromeMaterial)
    }
    animator.pausesOnCompletion = true
    animator.fractionComplete = Self.blurIntensity
    blurAnimator = animator

    return blur
  }

  private func messageStack(
    title: String,
    titleKm: String?,
    body: String?,
    bodyKm: String?
  ) -> UIStackView {
    let stack = UIStackView()
    stack.axis = .vertical
    stack.alignment = .center
    stack.spacing = 10
    stack.translatesAutoresizingMaskIntoConstraints = false

    func label(_ text: String, size: CGFloat, weight: UIFont.Weight, alpha: CGFloat) -> UILabel {
      let l = UILabel()
      l.text = text
      l.textColor = UIColor.white.withAlphaComponent(alpha)
      l.font = .systemFont(ofSize: size, weight: weight)
      l.textAlignment = .center
      l.numberOfLines = 0
      return l
    }

    stack.addArrangedSubview(label(title, size: 20, weight: .bold, alpha: 1))
    if let titleKm = titleKm {
      stack.addArrangedSubview(label(titleKm, size: 17, weight: .semibold, alpha: 0.85))
    }
    if let body = body {
      stack.addArrangedSubview(label(body, size: 15, weight: .regular, alpha: 0.7))
    }
    if let bodyKm = bodyKm {
      stack.addArrangedSubview(label(bodyKm, size: 15, weight: .regular, alpha: 0.7))
    }
    return stack
  }

  private func centerStack(_ stack: UIStackView, in cover: UIView) {
    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: cover.centerYAnchor),
      stack.leadingAnchor.constraint(greaterThanOrEqualTo: cover.leadingAnchor, constant: 28),
      stack.trailingAnchor.constraint(lessThanOrEqualTo: cover.trailingAnchor, constant: -28),
    ])
  }

  /// The privacy cover always outranks the notice, so a recording can never be
  /// revealed by dismissing a screenshot warning.
  private func coverTopmost(_ window: UIWindow) {
    if let notice = screenshotNotice { window.bringSubviewToFront(notice) }
    if let privacy = privacyCover { window.bringSubviewToFront(privacy) }
  }
}
