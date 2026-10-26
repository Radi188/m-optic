/**
 * Auto temple splay — open each arm to the wearer's own head.
 *
 * A fixed splay angle is a guess about one head. Real heads differ, and the two
 * sides of the SAME head differ: on a wide head a 10° arm cuts into the temple,
 * on a narrow one it stands off it, and an asymmetric head gets both at once.
 * The tracker already sees the head outline every frame, so the angle can be
 * solved per side instead of authored.
 *
 * ── The solve ───────────────────────────────────────────────────────────────
 * Everything is done in FACE-LOCAL centimetres — the space the glasses group
 * lives in, with the head un-rotated, so a measurement means the same thing at
 * any pose. On one side:
 *
 *   hinge     the temple pivot, at x = hingeX.
 *   arm       from the hinge to its tip, offset (dx, dz) from the hinge before
 *             any splay is applied. A splay of s rotates that offset about Y.
 *   target    where the tip SHOULD land laterally: the side of the head, plus a
 *             little clearance so the arm rests against it rather than in it.
 *
 * Rotating (dx, dz) about Y by an angle φ puts the tip at
 *
 *   x(φ) = hingeX + dx·cos φ + dz·sin φ
 *
 * which is a single sinusoid, so the φ that lands the tip on the target is a
 * closed form (see `solveSplayRad`) rather than something to iterate toward. The
 * renderer applies +s to the left pivot and −s to the right, so the solver hands
 * back that s, already sign-corrected per side.
 *
 * The result is clamped: a bad landmark frame must never fold the arms through
 * the head or throw them out sideways. Note the sign — the minimum is NEGATIVE,
 * because a frame wider than the wearer's head genuinely needs its arms to angle
 * INWARD, and pinning that at 0 would leave them floating off the temples.
 *
 * ── What this is not ────────────────────────────────────────────────────────
 * HEURISTIC. MediaPipe's face oval is a face boundary, not a head silhouette: it
 * runs near the front of the ear, so it reads a little narrower than the real
 * head, and the widest point along an arm's run is approximated by the widest of
 * the two side landmarks. Good enough to make an arm follow the head it is on;
 * not a facial measurement, and never presented to the wearer as one.
 */

import * as THREE from 'three';

/**
 * Face-oval landmarks down each side of the head, in MediaPipe's 468-point mesh.
 *
 * Two heights per side, because a temple arm has to clear the whole run: 127/356
 * sit up at the temple where the arm leaves the hinge, 234/454 down at the
 * tragion where it reaches the ear. Which index belongs to which side is NOT
 * assumed — sides are assigned from the sign of the measured x, so a mirrored
 * pipeline cannot silently swap them.
 */
export const HEAD_SIDE_LANDMARKS = [127, 356, 234, 454] as const;

/**
 * Clearance between the arm and the skin, in cm. The arm should rest along the
 * head, not vanish into it, and the face oval already reads slightly narrow.
 */
export const HEAD_CLEARANCE_CM = 0.3;

/**
 * Clamp on the solved angle, in degrees.
 *
 * The maximum matches the authored range in FrameCalibration (0–30). The
 * minimum is negative on purpose: a frame wider than the head needs its arms to
 * come inward to touch it. It stops short of the angle at which an arm would
 * cross into the face.
 */
export const AUTO_SPLAY_MIN_DEG = -10;
export const AUTO_SPLAY_MAX_DEG = 30;

/** Per-frame lerp toward the solved angle — an arm must never snap. */
export const SPLAY_SMOOTH = 0.15;

/**
 * Head half-widths, in face-local cm, measured out from the centre line. Both
 * are POSITIVE distances; the side they belong to is already resolved.
 */
export interface HeadHalfWidths {
  left: number;
  right: number;
}

/**
 * Solve the splay that lands one arm's tip on the side of the head.
 *
 * All arguments are face-local centimetres, except the returned angle (radians).
 * `dx`/`dz` are the tip's offset from the hinge with NO splay applied, in the
 * same face-local scale — see `PreparedArm.tip`, scaled up by the live model
 * scale.
 *
 * Returns null when the arm is degenerate (zero length) or the target is out of
 * its reach — an arm shorter than the gap it must span has no angle that works,
 * and inventing one would be worse than leaving the authored value in place.
 */
export function solveSplayRad(
  side: 'left' | 'right',
  hingeX: number,
  dx: number,
  dz: number,
  targetX: number,
): number | null {
  // x(φ) = hingeX + dx·cos φ + dz·sin φ = hingeX + R·sin(φ + ψ)
  const r = Math.hypot(dx, dz);
  if (!(r > 1e-6)) return null;
  const ratio = (targetX - hingeX) / r;
  if (!Number.isFinite(ratio) || Math.abs(ratio) > 1) return null;
  const psi = Math.atan2(dx, dz);
  const a = Math.asin(ratio);
  // A sinusoid crosses every reachable value TWICE per turn, and for an arm that
  // runs backward (dz < 0, so ψ ≈ ±π) `asin` alone returns the wrong one of the
  // two: a rotation of nearly half a turn, which swings the arm forward across
  // the wearer's face. Both solutions are therefore wrapped and the one nearest
  // zero — the arm staying behind the hinge where it belongs — is taken.
  const nearZero = [wrapToPi(a - psi), wrapToPi(Math.PI - a - psi)].reduce((best, c) =>
    Math.abs(c) < Math.abs(best) ? c : best,
  );
  // The renderer drives the left pivot with +s and the right with −s.
  return side === 'left' ? nearZero : -nearZero;
}

/** Fold an angle into (−π, π] so a solution never comes back a turn out. */
function wrapToPi(a: number): number {
  const twoPi = Math.PI * 2;
  let x = (a + Math.PI) % twoPi;
  if (x < 0) x += twoPi;
  return x - Math.PI;
}

/**
 * A running median of the last N samples.
 *
 * Same reasoning as the face-width lock in Glasses.tsx: landmarks are only
 * trustworthy near-frontal, so the head width is SAMPLED in that window and HELD
 * through rotation. Without the hold, the arms would visibly flap as soon as the
 * wearer turned their head — precisely when the splay is most visible. The
 * median (not the mean) keeps a single bad frame from moving the answer at all.
 */
export class RunningMedian {
  private readonly samples: number[] = [];

  constructor(private readonly window: number = 31) {}

  push(v: number): void {
    if (!Number.isFinite(v)) return;
    this.samples.push(v);
    if (this.samples.length > this.window) this.samples.shift();
  }

  /** The held value, or null until the first sample lands. */
  get value(): number | null {
    const n = this.samples.length;
    if (n === 0) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor(n / 2)];
  }

  reset(): void {
    this.samples.length = 0;
  }
}

/**
 * Widest point down each side of the head, in face-local cm.
 *
 * `deproject` turns one landmark index into a face-local point — the caller owns
 * that maths (it needs the camera FOV, the face distance and the face group), so
 * it is passed in rather than duplicated here. Returns null unless BOTH sides
 * were seen: one-sided data would splay one arm against a measurement and leave
 * the other on a guess, which reads worse than leaving both authored.
 */
export function measureHeadHalfWidths(
  deproject: (index: number, out: THREE.Vector3) => THREE.Vector3 | null,
  scratch: THREE.Vector3,
): HeadHalfWidths | null {
  let left = 0;
  let right = 0;
  for (const index of HEAD_SIDE_LANDMARKS) {
    const p = deproject(index, scratch);
    if (!p) continue;
    // Side comes from the sign of x, never from which index it was: the left
    // temple pivot is the one at negative x (see setupTempleSplay), so this is
    // the same convention the arms themselves use.
    if (p.x < 0) left = Math.max(left, -p.x);
    else right = Math.max(right, p.x);
  }
  if (!(left > 1e-6) || !(right > 1e-6)) return null;
  return { left, right };
}
