// native/screenGuard.ts
//
// Screenshots and screen recording are blocked app-wide from the first frame
// (Android: FLAG_SECURE in MainActivity; iOS: ScreenGuard in AppDelegate).
// M-Optic shows prescriptions, lens data and customer records, so that is the
// right default.
//
// Four features are the exception — they show the user their own face or a
// product they are shopping for, and people want to keep and share those:
//
//   • Face scan        (ScanScreen, mode 'face')
//   • Eye test         (ScanScreen, mode 'refraction')
//   • 3-D model viewer (GlassDetailScreen viewer, mode '3d')
//   • AR try-on        (GlassDetailScreen viewer, mode 'tryon')
//
// Those screens hold a permit through `useAllowScreenCapture` and the block
// comes straight back when they are left. The permits are counted rather than
// toggled, so an allowed screen opening on top of another one (the try-on modal
// over the detail page) cannot re-arm the block underneath it when it closes.
import { NativeModules, Platform } from 'react-native';

type ScreenGuardNative = {
  allowCapture(): Promise<boolean>;
  blockCapture(): Promise<boolean>;
  isCaptureAllowed(): Promise<boolean>;
};

const native: ScreenGuardNative | undefined =
  NativeModules.ScreenGuardModule as ScreenGuardNative | undefined;

/** How many mounted screens currently want capture allowed. */
let permits = 0;
/** The state the native side is known to be in; null after a failed call. */
let applied: boolean | null = false;
/** One call at a time — the last one to land must be the one that sticks. */
let inFlight = false;
let warned = false;

function warnOnce() {
  if (__DEV__ && !warned) {
    warned = true;
    console.warn(
      '[screenGuard] Native module missing — rebuild the app ' +
        `(${Platform.OS}). Screens stay capture-blocked until then.`,
    );
  }
}

function sync(): void {
  if (!native) {
    if (permits > 0) warnOnce();
    return;
  }
  // A call is already on its way; it re-runs this when it lands.
  if (inFlight) return;

  const desired = permits > 0;
  if (desired === applied) return;

  inFlight = true;
  const call = desired ? native.allowCapture() : native.blockCapture();
  call
    .then(() => {
      applied = desired;
    })
    .catch(error => {
      // Leave the state unknown rather than guessing: the next permit change
      // then always talks to the native side instead of skipping the call.
      applied = null;
      if (__DEV__) console.warn('[screenGuard] native call failed', error);
    })
    .finally(() => {
      inFlight = false;
      // Permits may have changed while the call was in flight.
      if (applied !== null) sync();
    });
}

/**
 * Takes a capture permit. Returns the release — call it exactly once.
 * Prefer `useAllowScreenCapture`; this is for non-React call sites.
 */
export function acquireScreenCapturePermit(): () => void {
  permits += 1;
  sync();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    permits = Math.max(0, permits - 1);
    sync();
  };
}
