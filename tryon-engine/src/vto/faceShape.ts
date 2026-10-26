/**
 * Face-shape classification from MediaPipe landmarks.
 *
 * Optical retail sorts faces into six shapes and recommends frames that
 * contrast with them (angular frames soften a round face, round frames soften a
 * square jaw). The 468 landmarks the tracker already produces carry every
 * measurement that classification needs, so this costs no extra inference.
 *
 * Measured the way faceMeshOccluder builds its depth shell: landmarks are
 * DEPROJECTED into centimetres with the same FOV maths, then rotated into
 * face-local space by the tracked head pose. Two reasons that matters here:
 *   • normalized x/y are foreshortened by yaw and pitch, so a raw span shrinks
 *     when the head turns — the same face would classify differently frame to
 *     frame. Undoing the pose measures the face, not the angle it is held at.
 *   • widths are read off the FACE_OVAL contour by interpolating the outline at
 *     a given height, instead of assuming one hand-picked landmark sits at the
 *     widest point of the brow or jaw. The numbers follow the real outline.
 *
 * HEURISTIC, NOT GROUND TRUTH. There is no objective boundary between "oval"
 * and "oblong" — the thresholds below follow the ratios used in optician
 * practice and were chosen to be stable, not to be provably correct. Treat the
 * result as a styling suggestion, never as a measurement.
 */

import * as THREE from 'three';
import { FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'oblong', 'diamond'] as const;
export type FaceShape = (typeof FACE_SHAPES)[number];

/** Frame silhouettes we can suggest. Keys map to i18n labels, not to API ids. */
export type FrameShapeKey =
  | 'square'
  | 'rectangle'
  | 'round'
  | 'oval'
  | 'aviator'
  | 'cat_eye'
  | 'wayfarer'
  | 'rimless'
  | 'oversized'
  | 'geometric';

/**
 * Which frames flatter which face. The rule throughout is CONTRAST: angular
 * frames on soft faces, curved frames on angular ones, width where the face is
 * narrow.
 */
export const FRAME_RECOMMENDATIONS: Record<FaceShape, FrameShapeKey[]> = {
  // Balanced already — almost anything works; these keep proportions.
  oval: ['square', 'rectangle', 'aviator'],
  // Angles and width add definition to soft curves.
  round: ['rectangle', 'square', 'cat_eye'],
  // Curves soften a strong jaw and brow.
  square: ['round', 'oval', 'aviator'],
  // Wide brow, narrow chin — weight belongs at the bottom.
  heart: ['round', 'oval', 'rimless'],
  // A long face wants height and width, not a thin letterbox.
  oblong: ['oversized', 'round', 'wayfarer'],
  // Widest at the cheekbones — lift the brow line instead.
  diamond: ['cat_eye', 'oval', 'rimless'],
};

// ── Face-oval contour ───────────────────────────────────────────────────────

const REQUIRED_LANDMARKS = 468;

/** Mirrors faceMeshOccluder — a landmark can never sit closer than this. */
const MIN_LANDMARK_DEPTH_CM = 1;

/**
 * Heights along the face where the classic optical widths are read, as a
 * fraction of face length (0 = chin, 1 = top of the forehead).
 */
const CHIN_T = 0.12;
const JAW_T = 0.3;
/** The cheekbone width is the widest point of the mid-face, not a fixed height. */
const CHEEK_T_MIN = 0.35;
const CHEEK_T_MAX = 0.7;
const FOREHEAD_T = 0.86;

let cachedOval: number[] | null = null;

/** The unique landmark indices making up the face-oval outline. */
function faceOvalIndices(): number[] {
  if (cachedOval) return cachedOval;
  const seen = new Set<number>();
  for (const c of FaceLandmarker.FACE_LANDMARKS_FACE_OVAL) {
    seen.add(c.start);
    seen.add(c.end);
  }
  cachedOval = [...seen];
  return cachedOval;
}

export interface FaceMetrics {
  /** Face length ÷ cheekbone width. High = long face. */
  lengthRatio: number;
  /** Jaw width ÷ cheekbone width. High = square/strong jaw. */
  jawRatio: number;
  /** Forehead width ÷ cheekbone width. High = wide brow. */
  foreheadRatio: number;
  /**
   * Chin width ÷ jaw width. High = the jawline keeps its width down to the
   * chin (square); low = it tapers to a point (round, heart, diamond). This is
   * what separates a square face from a round one of the same proportions.
   */
  chinRatio: number;
}

/** One outline point in face-local cm, with its height along the face. */
interface ProfilePoint {
  t: number;
  x: number;
}

/**
 * Horizontal outline position at height `t`, linearly interpolated between the
 * two contour points that bracket it. Outside the sampled range the nearest
 * point is held, so a `t` just past the chin or crown degrades rather than
 * returning nothing.
 */
function edgeAt(profile: ProfilePoint[], t: number): number {
  if (t <= profile[0].t) return profile[0].x;
  const last = profile[profile.length - 1];
  if (t >= last.t) return last.x;
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      return span > 1e-6 ? a.x + ((t - a.t) / span) * (b.x - a.x) : a.x;
    }
  }
  return last.x;
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _inv = new THREE.Quaternion();
const _p = new THREE.Vector3();

/**
 * Measure the proportions of the real face outline.
 *
 * `poseMatrix` is the tracker's head-pose matrix (the same one that drives the
 * face group): its translation gives the viewing distance the deprojection
 * needs, and its rotation is undone so the measurements are pose-invariant.
 *
 * Returns null when the landmarks are missing/too few or the pose is unusable —
 * the caller should simply skip the sample.
 */
export function measureFace(
  landmarks: NormalizedLandmark[],
  camera: THREE.PerspectiveCamera,
  poseMatrix: THREE.Matrix4,
): FaceMetrics | null {
  if (landmarks.length < REQUIRED_LANDMARKS) return null;

  poseMatrix.decompose(_pos, _quat, _scl);
  const D = _pos.length();
  if (!(D > 0)) return null;
  _inv.copy(_quat).invert();

  const halfTanY = Math.tan((camera.fov * (Math.PI / 180)) / 2);
  const halfTanX = halfTanY * camera.aspect;
  const zSign = _pos.z < 0 ? -1 : 1;

  // Deproject the outline into face-local cm: same formula as the occluder's
  // shell, then translated to the head origin and un-rotated by the head pose.
  const left: ProfilePoint[] = [];
  const right: ProfilePoint[] = [];
  const ys: number[] = [];
  const pts: { x: number; y: number }[] = [];

  for (const i of faceOvalIndices()) {
    const lm = landmarks[i];
    if (!lm) return null;
    // MediaPipe z is on the same scale as x (image width), hence halfTanX.
    const depth = Math.max(MIN_LANDMARK_DEPTH_CM, D + (lm.z ?? 0) * 2 * halfTanX * D);
    _p.set(
      (lm.x - 0.5) * 2 * halfTanX * depth,
      (0.5 - lm.y) * 2 * halfTanY * depth,
      zSign * depth,
    );
    _p.sub(_pos).applyQuaternion(_inv);
    pts.push({ x: _p.x, y: _p.y });
    ys.push(_p.y);
  }

  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const length = yMax - yMin;
  if (!(length > 1e-6)) return null;

  for (const { x, y } of pts) {
    const point: ProfilePoint = { t: (y - yMin) / length, x };
    (x >= 0 ? right : left).push(point);
  }
  if (left.length < 3 || right.length < 3) return null;
  left.sort((a, b) => a.t - b.t);
  right.sort((a, b) => a.t - b.t);

  const widthAt = (t: number) => edgeAt(right, t) - edgeAt(left, t);

  // Cheekbone width = the widest the mid-face gets, scanned rather than assumed.
  let cheekW = 0;
  for (let t = CHEEK_T_MIN; t <= CHEEK_T_MAX + 1e-9; t += 0.01) {
    cheekW = Math.max(cheekW, widthAt(t));
  }
  if (!(cheekW > 1e-6)) return null;

  const jawW = widthAt(JAW_T);
  if (!(jawW > 1e-6)) return null;

  return {
    lengthRatio: length / cheekW,
    jawRatio: jawW / cheekW,
    foreheadRatio: widthAt(FOREHEAD_T) / cheekW,
    chinRatio: widthAt(CHIN_T) / jawW,
  };
}

/**
 * Sort the proportions into a shape. Order matters: the distinctive shapes
 * (long, wide-brow, narrow-both-ends) are claimed first, and oval is the
 * "nothing stands out" default — which is exactly what oval means.
 */
export function classifyFaceShape(m: FaceMetrics): FaceShape {
  if (m.lengthRatio >= 1.45) return 'oblong';
  if (m.foreheadRatio - m.jawRatio >= 0.12) return 'heart';
  if (m.foreheadRatio <= 0.8 && m.jawRatio <= 0.8) return 'diamond';
  // Angular = the outline stays wide at the gonion AND does not taper into the
  // chin. Width alone used to call every wide-jawed round face "square".
  const angular = m.jawRatio >= 0.86 && m.chinRatio >= 0.72;
  if (m.lengthRatio <= 1.25) return angular ? 'square' : 'round';
  if (angular && m.lengthRatio <= 1.35) return 'square';
  return 'oval';
}

/**
 * Majority vote over a rolling window of samples.
 *
 * A per-frame classification flickers between neighbours (a face near the
 * oval/oblong boundary would relabel constantly), so the badge is driven by the
 * most common answer over many frames instead of the latest one.
 */
export class FaceShapeVoter {
  private readonly votes: FaceShape[] = [];

  constructor(private readonly window: number = 20) {}

  add(shape: FaceShape): void {
    this.votes.push(shape);
    if (this.votes.length > this.window) this.votes.shift();
  }

  /** The winning shape, or null until enough samples have accumulated. */
  result(minSamples = 8): FaceShape | null {
    if (this.votes.length < minSamples) return null;
    const tally = new Map<FaceShape, number>();
    let best: FaceShape | null = null;
    let bestCount = 0;
    for (const v of this.votes) {
      const n = (tally.get(v) ?? 0) + 1;
      tally.set(v, n);
      if (n > bestCount) {
        bestCount = n;
        best = v;
      }
    }
    return best;
  }

  reset(): void {
    this.votes.length = 0;
  }
}
