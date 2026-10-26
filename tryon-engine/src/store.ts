/**
 * vtoStore — zustand store for the R3F Virtual Try-On calibration.
 *
 * The CalibrationPanel (and frame switching) WRITE here; the R3F scene READS it
 * inside useFrame via `useVtoStore.getState()` — NOT via a selector subscription
 * — so per-frame reads never trigger React re-renders. Slider components may use
 * normal selector hooks (re-rendering the panel is fine).
 *
 * Shapes mirror frames.ts (cm / radians) so values round-trip 1:1.
 */

import { create } from 'zustand';
import {
  OCCLUDER_CONFIG,
  DEFAULT_BRIDGE_Z_CM,
  DEFAULT_CALIBRATION,
  type VTOFrame,
  type TempleArmsMode,
} from '../../src/features/try-on/core/frames';

/**
 * Default under-skin sink for the FACE MESH occluder (cm, along the view ray).
 *
 * The mesh follows the real face and the glasses physically sit in front of that
 * surface, so it only needs enough relief to absorb tracking jitter around the
 * lens area. Pushing it back along each vertex's OWN view ray is what keeps the
 * shell registered to the face under yaw — a face-local cut or clamp moves
 * vertices sideways on screen once the head turns.
 */
export const DEFAULT_FACE_MESH_SINK_CM = 0.5;

/** How the frame is pinned to the face — see `anchorMode`. */
export type AnchorMode = 'bridge' | 'eyes';

/** Default temple splay (degrees) when a frame doesn't specify one. */
const DEFAULT_SPLAY_DEG = 10;

/** True only for a real, finite number (rejects undefined / NaN / Infinity). */
function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Sanitise a [x, y, z] tuple, falling back COMPONENT-WISE to `fallback` for any
 * missing / non-finite entry. Guarantees a clean numeric vector reaches the store
 * so the placement math can never receive undefined / NaN.
 */
function vec3(input: unknown, fallback: readonly [number, number, number]): [number, number, number] {
  const a = Array.isArray(input) ? input : [];
  return [
    isFiniteNum(a[0]) ? a[0] : fallback[0],
    isFiniteNum(a[1]) ? a[1] : fallback[1],
    isFiniteNum(a[2]) ? a[2] : fallback[2],
  ];
}

export interface OccluderState {
  scale: number;
  zDepth: number;
  frontCutZ: number;
  sideX: number;
  sideBack: number;
  sideHeight: number;
}

interface VtoState {
  // Live calibration (read every frame by the scene)
  positionOffset: [number, number, number];
  bridgeOffset: [number, number, number];
  scaleMultiplier: number;
  rotationOffset: [number, number, number];
  templeSplayDeg: number;
  /**
   * Solve the splay per arm from the wearer's own head instead of using
   * `templeSplayDeg` (see templeSplay.ts). On for customers; the calibration
   * panel's splay slider turns it off, because a slider you can move while
   * something else is driving the value is a slider that lies.
   */
  autoTempleSplay: boolean;
  templeArmsMode: TempleArmsMode;
  /** Real frame width in mm, or null to fit the frame to the face instead. */
  frameWidthMm: number | null;
  /**
   * How far the FACE MESH occluder is pushed under the skin (cm), kept separate
   * from `occ.frontCutZ` (which belongs to the coarse ellipsoid shells). The
   * mesh tracks the real face, so it needs far less relief than a shell that
   * bulges past it; unlike the shells' plane cut it loses no geometry, so the
   * cheeks keep occluding — which is exactly where a temple arm crosses.
   */
  faceMeshSinkCm: number;
  /**
   * Where the frame is pinned to the face.
   *
   * 'bridge' — the legacy path: a GUESSED nose-contact point is pinned to
   *   landmark 168, then dropped by `bridgeOffset.y`. Only as accurate as the
   *   guess and the hand-tuned drop, which is why each frame shape needs its own
   *   numbers.
   * 'eyes' — pins the model's own LENS CENTRE to the wearer's eye centre. This
   *   is how opticians fit a frame (optical centre at pupil height) and needs no
   *   per-shape tuning, because both sides of the equation are measured rather
   *   than guessed.
   */
  anchorMode: AnchorMode;
  /**
   * Take the frame's forward placement (Bridge Z) from the wearer's own nose
   * instead of the authored value.
   *
   * With this on, Glasses.tsx measures how far the wearer's nose ridge has run
   * forward at the height the bridge contact lands and pushes the frame out by
   * that, with `bridgeOffset.z` left as the trim on top. OFF by default: the
   * authored numbers are tuned against a real face, and the measurement is only
   * worth adding once a frame visibly misseats. The Bridge Z slider also turns
   * it off, for the same reason the splay slider turns off the auto splay.
   */
  autoBridgeDepth: boolean;
  /**
   * Draw the side/ear shells at all. Turning them off isolates the tracked face
   * mesh, which is the only way to judge how much of the face it actually covers
   * — the shells overlap the same screen area and hide the answer.
   */
  showSideShells: boolean;
  occ: OccluderState;
  showOccluder: boolean;
  showBridgeDebug: boolean;

  // 1€ filter pose-smoothing params (GLOBAL — NOT reset on model switch).
  oneEuroMinCutoff: number;
  oneEuroBeta: number;

  // Debug / UI (may drive re-renders)
  templeDebug: { left: string; right: string };

  // Actions
  loadFrame: (frame: VTOFrame) => void;
  setCalibration: (c: {
    positionOffset: [number, number, number];
    scaleMultiplier: number;
    rotationOffset: [number, number, number];
  }) => void;
  setSplay: (deg: number) => void;
  setBridgeOffset: (offset: [number, number, number]) => void;
  setTempleArmsMode: (mode: TempleArmsMode) => void;
  setOcc: (partial: Partial<OccluderState>) => void;
  setShowOccluder: (show: boolean) => void;
  setFaceMeshSinkCm: (cm: number) => void;
  setShowSideShells: (show: boolean) => void;
  setAnchorMode: (mode: AnchorMode) => void;
  setAutoBridgeDepth: (auto: boolean) => void;
  setShowBridgeDebug: (show: boolean) => void;
  setTempleDebug: (d: { left: string; right: string }) => void;
  setOneEuro: (minCutoff: number, beta: number) => void;
}

function occFromFrame(frame: VTOFrame): OccluderState {
  const f = frame.occluder;
  return {
    scale: f?.scale ?? OCCLUDER_CONFIG.occluderScale,
    zDepth: f?.zDepth ?? OCCLUDER_CONFIG.occluderZDepth,
    frontCutZ: f?.frontCutZ ?? OCCLUDER_CONFIG.frontCutZ,
    sideX: f?.sideX ?? OCCLUDER_CONFIG.sideX,
    sideBack: f?.sideBack ?? OCCLUDER_CONFIG.sideBack,
    sideHeight: f?.sideHeight ?? OCCLUDER_CONFIG.sideHeight,
  };
}

export const useVtoStore = create<VtoState>((set) => ({
  positionOffset: [0, 0, -0.8],
  bridgeOffset: [0, 0, DEFAULT_BRIDGE_Z_CM],
  scaleMultiplier: 1,
  rotationOffset: [0, 0, 0],
  templeSplayDeg: DEFAULT_SPLAY_DEG,
  autoTempleSplay: true,
  templeArmsMode: 'fade',
  frameWidthMm: null,
  faceMeshSinkCm: DEFAULT_FACE_MESH_SINK_CM,
  showSideShells: true,
  // Eye anchoring is the default for every model: height comes from the wearer's
  // measured eye centre rather than a per-shape drop. Frames whose lens meshes
  // can't be identified fall back to the bridge path on their own (see
  // `built.lensCenter` in Glasses.tsx), so this is safe catalog-wide.
  anchorMode: 'eyes',
  autoBridgeDepth: false,
  occ: {
    scale: OCCLUDER_CONFIG.occluderScale,
    zDepth: OCCLUDER_CONFIG.occluderZDepth,
    frontCutZ: OCCLUDER_CONFIG.frontCutZ,
    sideX: OCCLUDER_CONFIG.sideX,
    sideBack: OCCLUDER_CONFIG.sideBack,
    sideHeight: OCCLUDER_CONFIG.sideHeight,
  },
  showOccluder: false,
  // Calibration aid only — the cyan landmark / red bridge dots must never show to
  // customers. Turn it on from the calibration panel's "Bridge debug" toggle,
  // which starts unchecked and would otherwise disagree with a `true` default.
  showBridgeDebug: false,
  // 1€ defaults (Casiez suggested starting point for this use).
  oneEuroMinCutoff: 1.0,
  oneEuroBeta: 0.5,
  templeDebug: { left: '—', right: '—' },

  // Reset the whole store to a frame's saved calibration (per-model load).
  // HARDENED: a frame coming from an API may have a missing / partial / malformed
  // calibration. Spreading `undefined` would push NaN/undefined into the live
  // transform and silently produce an invisible frame, so every field is merged
  // with DEFAULT_CALIBRATION and validated before it reaches the store.
  loadFrame: (frame) => {
    const cal = frame.calibration ?? DEFAULT_CALIBRATION;
    const positionOffset = vec3(cal.positionOffset, DEFAULT_CALIBRATION.positionOffset);
    const rotationOffset = vec3(cal.rotationOffset, DEFAULT_CALIBRATION.rotationOffset);
    // A catalog frame with no authored offset still needs the nose standoff,
    // otherwise its bridge is pinned flat on the skin and the occluder eats it.
    const bridgeOffset = vec3(frame.bridgeOffset, [0, 0, DEFAULT_BRIDGE_Z_CM]);
    // Scale MUST be a finite, strictly-positive multiplier; otherwise the group
    // collapses to 0 (invisible) or explodes. Fall back to 1.0.
    const scaleMultiplier =
      isFiniteNum(cal.scaleMultiplier) && cal.scaleMultiplier > 0 ? cal.scaleMultiplier : 1.0;
    const templeSplayDeg = isFiniteNum(cal.templeSplayDeg) ? cal.templeSplayDeg : DEFAULT_SPLAY_DEG;
    const templeArmsMode = cal.templeArmsMode ?? DEFAULT_CALIBRATION.templeArmsMode ?? 'fade';
    // A malformed width would scale the frame to nothing or to infinity, so only
    // a finite positive number is trusted; anything else falls back to face-fit.
    const frameWidthMm =
      isFiniteNum(frame.frameWidthMm) && frame.frameWidthMm > 0 ? frame.frameWidthMm : null;

    console.log('[VTO] loadFrame', {
      id: frame.id,
      glbPath: frame.glbPath,
      calibration: { positionOffset, scaleMultiplier, rotationOffset, templeSplayDeg, templeArmsMode },
      bridgeOffset,
      frameWidthMm,
    });
    if (!frame.calibration) {
      console.warn(`[VTO] frame "${frame.id}" has NO calibration — using DEFAULT_CALIBRATION.`);
    }

    set({
      positionOffset,
      bridgeOffset,
      scaleMultiplier,
      rotationOffset,
      templeSplayDeg,
      // A newly loaded frame starts on the auto solves again: the authored
      // numbers are fallbacks, not choices the wearer made.
      autoTempleSplay: true,
      autoBridgeDepth: false,
      templeArmsMode,
      frameWidthMm,
      occ: occFromFrame(frame),
    });
  },

  setCalibration: (c) =>
    set({
      positionOffset: c.positionOffset,
      scaleMultiplier: c.scaleMultiplier,
      rotationOffset: c.rotationOffset,
    }),
  // Moving the splay slider is a deliberate manual override, so it also takes
  // the arms off the auto solve — otherwise the next tracked frame would
  // overwrite the value the tuner just set.
  setSplay: (deg) => set({ templeSplayDeg: deg, autoTempleSplay: false }),
  // Like the splay slider: hand-tuning Bridge Z is a deliberate override, so it
  // takes the frame off the measured depth rather than fighting it every frame.
  setBridgeOffset: (offset) => set({ bridgeOffset: [...offset] }),
  setAutoBridgeDepth: (auto) => set({ autoBridgeDepth: auto }),
  setTempleArmsMode: (mode) => set({ templeArmsMode: mode }),
  setOcc: (partial) => set((s) => ({ occ: { ...s.occ, ...partial } })),
  setShowOccluder: (show) => set({ showOccluder: show }),
  setFaceMeshSinkCm: (cm) => set({ faceMeshSinkCm: cm }),
  setShowSideShells: (show) => set({ showSideShells: show }),
  setAnchorMode: (mode) => set({ anchorMode: mode }),
  setShowBridgeDebug: (show) => set({ showBridgeDebug: show }),
  setTempleDebug: (d) => set({ templeDebug: d }),
  setOneEuro: (minCutoff, beta) => set({ oneEuroMinCutoff: minCutoff, oneEuroBeta: beta }),
}));
