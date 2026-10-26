/**
 * Per-product try-on calibration — ported from the M-Optic website
 * (m-optic-website: src/data/vto/product-calibration.ts). The numbers are the
 * website's, tuned on a real face; do not change them to "fix" a fit problem
 * here — a mismatch is a camera-matching, crop or mirroring bug.
 *
 * Shapes are matched on `frame_shape.id` first and by name second. The API
 * localises the name ("Square" / "ការ៉េ"), so the name patterns cover English
 * and Khmer.
 */

import {
  PANTOSCOPIC_TILT_RAD,
  type FrameCalibration,
  type VTOFrame,
} from './frames';

/** The parts of an API product the calibration reads. */
export interface CalibrationProduct {
  name?: string | null;
  item_name?: string | null;
  frame_shape?: { id: number; name?: string | null } | null;
  measurements?: { hinge_to_hinge?: number | null } | null;
  assets?: { id: number | string; url: string; type?: string | null; format?: string | null }[] | null;
}

export interface ProductCalibration {
  calibration: FrameCalibration;
  bridgeOffset: [number, number, number];
}

const BRIDGE_Z_CM = -0.12;

interface ShapeProfile {
  label: string;
  ids: number[];
  nameRe: RegExp;
  profile: ProductCalibration;
}

const DEFAULT_PROFILE: ProductCalibration = {
  calibration: {
    positionOffset: [0.05, 2.2, -1.15],
    scaleMultiplier: 1.2,
    rotationOffset: [PANTOSCOPIC_TILT_RAD, 0, 0],
    templeSplayDeg: 10,
    templeArmsMode: 'fade',
  },
  bridgeOffset: [0, 2.5, BRIDGE_Z_CM],
};

/** Live taxonomy: 1 Round · 2 Square · 3 Rectangle · 4 Oval · 11 Rimless. */
const SHAPE_PROFILES: ShapeProfile[] = [
  {
    label: 'Rimless',
    ids: [11],
    nameRe: /rimless|គ្មានស៊ុម/i,
    profile: {
      calibration: {
        positionOffset: [0.05, 1.4, -1.15],
        scaleMultiplier: 1.18,
        rotationOffset: [PANTOSCOPIC_TILT_RAD, 0, 0],
        templeSplayDeg: 10,
        templeArmsMode: 'fade',
      },
      bridgeOffset: [0, 1.5, BRIDGE_Z_CM],
    },
  },
  {
    label: 'Square',
    ids: [2],
    nameRe: /square|ការ៉េ/i,
    profile: {
      calibration: {
        positionOffset: [0.05, 2.2, -1.15],
        scaleMultiplier: 1.2,
        rotationOffset: [PANTOSCOPIC_TILT_RAD, 0, 0],
        templeSplayDeg: 10,
        templeArmsMode: 'fade',
      },
      bridgeOffset: [0, 2.9, BRIDGE_Z_CM],
    },
  },
  // UNTUNED on the website too — default numbers until measured on a face.
  { label: 'Round', ids: [1], nameRe: /round|មូល/i, profile: DEFAULT_PROFILE },
  { label: 'Rectangle', ids: [3], nameRe: /rectangle|ចតុកោណ/i, profile: DEFAULT_PROFILE },
  { label: 'Oval', ids: [4], nameRe: /oval|ពងក្រពើ/i, profile: DEFAULT_PROFILE },
];

function matchProfile(product: CalibrationProduct): ShapeProfile | null {
  const shape = product.frame_shape;
  if (!shape || !('id' in shape)) return null;
  return (
    SHAPE_PROFILES.find(
      p =>
        p.ids.includes(shape.id) ||
        (typeof shape.name === 'string' && p.nameRe.test(shape.name)),
    ) ?? null
  );
}

export function isRimlessFrame(product: CalibrationProduct): boolean {
  return matchProfile(product)?.label === 'Rimless';
}

export function calibrationForProduct(product: CalibrationProduct): ProductCalibration {
  return matchProfile(product)?.profile ?? DEFAULT_PROFILE;
}

/** Hand-entered hinge_to_hinge outside this window is treated as missing. */
const FRAME_WIDTH_MM_MIN = 100;
const FRAME_WIDTH_MM_MAX = 180;

const plausibleWidthMm = (mm: number | null | undefined): number | undefined =>
  typeof mm === 'number' &&
  Number.isFinite(mm) &&
  mm >= FRAME_WIDTH_MM_MIN &&
  mm <= FRAME_WIDTH_MM_MAX
    ? mm
    : undefined;

/**
 * True frame-front width in mm, or undefined → the engine fits the frame to
 * the face (outer-eye distance × 1.5). A colourway falls back to its parent.
 */
export function frameWidthMmForProduct(
  product: CalibrationProduct,
  fallback?: CalibrationProduct | null,
): number | undefined {
  return (
    plausibleWidthMm(product.measurements?.hinge_to_hinge) ??
    plausibleWidthMm(fallback?.measurements?.hinge_to_hinge)
  );
}

/** The product's try-on GLB assets (`type === '3d_model' && format === 'glb'`). */
export function glbAssets(assets: CalibrationProduct['assets']) {
  return (Array.isArray(assets) ? assets : []).filter(
    a => a.type === '3d_model' && a.format === 'glb',
  );
}

/**
 * Build the try-on frames from a product's (or colourway's) 3D assets.
 * `parent` supplies the width a colourway is missing and the calibration
 * shape when the colourway carries none.
 */
export function buildProductVTOFrames(
  product: CalibrationProduct,
  assets: CalibrationProduct['assets'],
  parent?: CalibrationProduct | null,
): VTOFrame[] {
  const shapeSource = product.frame_shape ? product : parent ?? product;
  const { calibration, bridgeOffset } = calibrationForProduct(shapeSource);
  const frameWidthMm = frameWidthMmForProduct(product, parent);
  const name = product.name || product.item_name || parent?.name || '';
  return glbAssets(assets).map(a => ({
    id: String(a.id),
    name,
    calibration,
    bridgeOffset,
    frameWidthMm,
    glbPath: a.url,
  }));
}
