/**
 * VTO frame types and constants — ported from the M-Optic website
 * (m-optic-website: src/data/vto/frames.ts). Values are unchanged; only the
 * website's demo frame list is left out, since the app only tries on catalog
 * products.
 *
 * Shared by the app (which builds the frames from the API) and the WebView
 * engine in /tryon-engine (which renders them), so both sides agree on shapes.
 *
 * ── Calibration fields ──────────────────────────────────────────────────────
 *   positionOffset  [x, y, z]  in CENTIMETRES, relative to the bridge.
 *     x: + = wearer's right (in non-mirrored model space)
 *     y: + = up,  z: + = toward camera (forward).
 *   scaleMultiplier  fine-tuning multiplier on the auto size (1.0 = auto).
 *   rotationOffset  [rx, ry, rz]  Euler radians (order XYZ), small only.
 *   bridgeOffset  [x, y, z] cm added to the visual bridge before it is pinned
 *     to landmark 168. y = rest drop below the nasion; z = seating trim.
 */

export interface FrameCalibration {
  positionOffset: [number, number, number];
  scaleMultiplier: number;
  rotationOffset: [number, number, number];
  /** Fallback temple splay in degrees (0–30) before the head is measured. */
  templeSplayDeg?: number;
  templeArmsMode?: TempleArmsMode;
}

/** Temple-arm render mode: hidden, faded along their length, or full. */
export type TempleArmsMode = 'full' | 'fade' | 'hidden';

export interface VTOFrame {
  /** Unique id — the GLB asset id. */
  id: string;
  name: string;
  /** Absolute URL of the GLB. */
  glbPath: string;
  calibration: FrameCalibration;
  /** TRUE frame-front width in mm (hinge to hinge); omitted → face-width fit. */
  frameWidthMm?: number;
  bridgeOffset?: [number, number, number];
  occluder?: OccluderFit;
}

export interface OccluderFit {
  scale: number;
  zDepth: number;
  frontCutZ: number;
  sideX: number;
  sideBack: number;
  sideHeight: number;
}

/** Pantoscopic tilt — effectively flat; the models carry their own tilt. */
export const PANTOSCOPIC_TILT_DEG = 0.5;
export const PANTOSCOPIC_TILT_RAD = (PANTOSCOPIC_TILT_DEG * Math.PI) / 180;

/** Trim (cm) on the bridge standoff, on top of the measured nose ridge. */
export const DEFAULT_BRIDGE_Z_CM = -0.12;

export const DEFAULT_CALIBRATION: FrameCalibration = {
  positionOffset: [0, 0, -1.0],
  scaleMultiplier: 1.0,
  rotationOffset: [PANTOSCOPIC_TILT_RAD, 0, 0],
  templeSplayDeg: 10,
  templeArmsMode: 'fade',
};

export interface OccluderConfig {
  glbPath: string;
  occluderScale: number;
  occluderZDepth: number;
  frontCutZ: number;
  occluderOffset: [number, number];
  sideX: number;
  sideY: number;
  sideZ: number;
  sideThickness: number;
  sideBack: number;
  sideHeight: number;
}

/**
 * Head occluder config. The authored shell is optional: when
 * /mediapipe/occluder.glb is absent the engine builds a procedural head, and
 * while tracking runs the wearer's own landmark mesh is the occluder anyway.
 */
export const OCCLUDER_CONFIG: OccluderConfig = {
  glbPath: '/mediapipe/occluder.glb',
  occluderScale: 0.97,
  occluderZDepth: -0.3,
  frontCutZ: -2.5,
  occluderOffset: [0, 0],
  sideX: 6.5,
  sideY: -1,
  sideZ: -4,
  sideThickness: 3,
  sideBack: 6,
  sideHeight: 5,
};
