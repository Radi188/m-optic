// native/screenGuard.ts
//
// Screenshots and screen recording are ALLOWED by default. Only screens that
// show prices block them, because prices are what the shop treats as
// confidential:
//
//   • Home (best sellers)          • Product detail (not its try-on / 3-D viewer)
//   • Glass tab, Glasses list      • History, while the Invoices tab is shown
//   • Search results               • Invoice detail
//
// Face scan, eye test, AR try-on, profile and the rest stay capturable.
//
// Those screens hold a block through `useBlockScreenCapture` while they are
// focused. Blocks are counted rather than toggled, so a capturable screen
// opening on top of a priced one cannot lift the block underneath it when it
// closes. Lifting is also delayed a moment (ALLOW_DELAY_MS): moving between two
// priced screens (e.g. the Home and Glass tabs) releases the old block before
// the new one is taken, and without the delay iOS would re-parent the whole
// app's layer out of the secure layer and straight back in on every switch.
//
// Native side: Android sets/clears FLAG_SECURE; iOS moves the app's content
// into a secure layer (captures come out black) and covers screen recordings.
import { NativeModules, Platform } from 'react-native';

type ScreenGuardNative = {
  allowCapture(): Promise<boolean>;
  blockCapture(): Promise<boolean>;
  isCaptureAllowed(): Promise<boolean>;
};

const native: ScreenGuardNative | undefined =
  NativeModules.ScreenGuardModule as ScreenGuardNative | undefined;

/** How many focused screens currently want capture blocked. */
let blocks = 0;
/**
 * Whether the native side is known to allow capture; null when unknown. Starts
 * unknown so the first sync always talks to native — after a JS reload the
 * native side may still hold a block from the previous bundle.
 */
let appliedAllowed: boolean | null = null;
/** One call at a time — the last one to land must be the one that sticks. */
let inFlight = false;
let warned = false;

/** How long the last release waits before capture is actually allowed again. */
const ALLOW_DELAY_MS = 150;
/** Pending lift of the block; a new block taken meanwhile cancels it. */
let allowTimer: ReturnType<typeof setTimeout> | null = null;

function cancelPendingAllow(): void {
  if (allowTimer !== null) {
    clearTimeout(allowTimer);
    allowTimer = null;
  }
}

function warnOnce() {
  if (__DEV__ && !warned) {
    warned = true;
    console.warn(
      '[screenGuard] Native module missing — rebuild the app ' +
        `(${Platform.OS}). Priced screens are not capture-blocked until then.`,
    );
  }
}

function sync(): void {
  if (!native) {
    if (blocks > 0) warnOnce();
    return;
  }
  // A call is already on its way; it re-runs this when it lands.
  if (inFlight) return;

  const wantAllowed = blocks === 0;
  if (wantAllowed === appliedAllowed) return;

  inFlight = true;
  const call = wantAllowed ? native.allowCapture() : native.blockCapture();
  call
    .then(() => {
      appliedAllowed = wantAllowed;
    })
    .catch(error => {
      // Leave the state unknown rather than guessing: the next block change
      // then always talks to the native side instead of skipping the call.
      appliedAllowed = null;
      if (__DEV__) console.warn('[screenGuard] native call failed', error);
    })
    .finally(() => {
      inFlight = false;
      // Blocks may have changed while the call was in flight. A pending lift
      // syncs on its own once its delay is up.
      if (appliedAllowed !== null && allowTimer === null) sync();
    });
}

// Bring native in line with "nothing blocked yet" as soon as JS loads.
sync();

/**
 * Takes a capture block. Returns the release — call it exactly once.
 * Prefer `useBlockScreenCapture`; this is for non-React call sites.
 */
export function acquireScreenCaptureBlock(): () => void {
  cancelPendingAllow();
  blocks += 1;
  sync();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    blocks = Math.max(0, blocks - 1);
    if (blocks > 0) return;

    // Blocking is immediate; allowing waits in case the next screen is priced
    // too and takes its block straight away.
    cancelPendingAllow();
    allowTimer = setTimeout(() => {
      allowTimer = null;
      sync();
    }, ALLOW_DELAY_MS);
  };
}
