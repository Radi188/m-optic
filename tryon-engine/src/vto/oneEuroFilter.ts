/**
 * oneEuroFilter.ts — the "1€ filter" (Casiez, Roussel & Vogel, CHI 2012).
 *
 * A speed-adaptive low-pass filter: heavy smoothing when the signal is slow
 * (kills jitter while the head is still), light smoothing when it's fast (the
 * glasses track tight during quick yaw — no trailing). This fixes the
 * velocity-proportional lag of a constant-factor lerp/slerp.
 *
 * Standard formulas (cutoff frequency in Hz, dt in seconds):
 *   tau   = 1 / (2π·cutoff)
 *   alpha = 1 / (1 + tau/dt)
 *   cutoff = minCutoff + beta·|x'|     (x' = smoothed derivative)
 *
 * Scalar; vector/quaternion signals use one filter per component.
 */

const { PI: pi, abs } = Math;

export class OneEuroFilter {
  /** Baseline cutoff (Hz). Lower = more smoothing when slow/still. */
  minCutoff: number;
  /** Speed coefficient. Higher = less lag (cuts smoothing) during fast motion. */
  beta: number;
  /** Cutoff for the derivative low-pass (Hz). Usually 1.0. */
  dcutoff: number;

  private xPrev: number | null = null; // last raw input
  private sPrev: number | null = null; // last smoothed output
  private dxPrev = 0; // last smoothed derivative

  constructor(minCutoff = 1.0, beta = 0.5, dcutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
  }

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * pi * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** Filter one sample given the time since the previous sample (seconds). */
  filter(x: number, dt: number): number {
    if (this.sPrev === null) {
      // Uninitialised → pass through (acts as the snap on the first sample).
      this.sPrev = x;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    const dx = (x - (this.xPrev as number)) / dt;
    const aD = OneEuroFilter.alpha(this.dcutoff, dt);
    const edx = aD * dx + (1 - aD) * this.dxPrev; // smoothed derivative
    const cutoff = this.minCutoff + this.beta * abs(edx);
    const a = OneEuroFilter.alpha(cutoff, dt);
    const s = a * x + (1 - a) * this.sPrev;
    this.sPrev = s;
    this.xPrev = x;
    this.dxPrev = edx;
    return s;
  }

  /** Snap to a value with no smoothing (first detected frame / re-init). */
  reset(value: number): void {
    this.sPrev = value;
    this.xPrev = value;
    this.dxPrev = 0;
  }
}
