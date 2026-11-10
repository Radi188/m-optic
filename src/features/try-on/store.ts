/**
 * Try-on calibration store — the website's vtoStore.ts (zustand) without the
 * dev-only calibration-panel fields (sliders, debug wireframes, bridge dots).
 *
 * The scene READS it inside useFrame through `useVtoStore.getState()`, never
 * through a selector, so per-frame reads cause no React re-renders. Shapes
 * mirror core/frames.ts (cm / radians) so values round-trip 1:1.
 */

import { create } from 'zustand';
import {
  OCCLUDER_CONFIG,
  DEFAULT_BRIDGE_Z_CM,
  DEFAULT_CALIBRATION,
  type TempleArmsMode,
  type VTOFrame,
} from './core/frames';

/** Under-skin sink for the face-mesh occluder (cm, along the view ray). */
export const DEFAULT_FACE_MESH_SINK_CM = 0.5;

/** How the frame is pinned to the face (see the website's store). */
export type AnchorMode = 'bridge' | 'eyes';

const DEFAULT_SPLAY_DEG = 10;

const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Clean [x, y, z], falling back component-wise for missing / non-finite entries. */
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
  positionOffset: [number, number, number];
  bridgeOffset: [number, number, number];
  scaleMultiplier: number;
  rotationOffset: [number, number, number];
  templeSplayDeg: number;
  /** Solve the splay per arm from the wearer's head (templeSplay.ts). */
  autoTempleSplay: boolean;
  templeArmsMode: TempleArmsMode;
  /** Real frame width in mm, or null to fit the frame to the face instead. */
  frameWidthMm: number | null;
  faceMeshSinkCm: number;
  anchorMode: AnchorMode;
  /** Bridge Z from the wearer's nose ridge. Off by default, as on the website. */
  autoBridgeDepth: boolean;
  showSideShells: boolean;
  occ: OccluderState;

  // 1€ pose-smoothing params (global — not reset on model switch).
  oneEuroMinCutoff: number;
  oneEuroBeta: number;

  /** Reset the calibration to a frame's saved values (per-model load). */
  loadFrame: (frame: VTOFrame) => void;
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

export const useVtoStore = create<VtoState>(set => ({
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
  // Eye anchoring is the website's default for every model; frames without
  // identifiable lens meshes fall back to the bridge path on their own.
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
  // 1€ defaults (minCutoff 1.0, beta 0.5; dcutoff is fixed at 1.0).
  oneEuroMinCutoff: 1.0,
  oneEuroBeta: 0.5,

  // HARDENED like the website: a frame from the API may carry a partial or
  // malformed calibration, and NaN in the live transform means an invisible
  // frame, so every field is validated and merged with the defaults.
  loadFrame: frame => {
    const cal = frame.calibration ?? DEFAULT_CALIBRATION;
    const scaleMultiplier =
      isFiniteNum(cal.scaleMultiplier) && cal.scaleMultiplier > 0 ? cal.scaleMultiplier : 1.0;
    set({
      positionOffset: vec3(cal.positionOffset, DEFAULT_CALIBRATION.positionOffset),
      rotationOffset: vec3(cal.rotationOffset, DEFAULT_CALIBRATION.rotationOffset),
      bridgeOffset: vec3(frame.bridgeOffset, [0, 0, DEFAULT_BRIDGE_Z_CM]),
      scaleMultiplier,
      templeSplayDeg: isFiniteNum(cal.templeSplayDeg) ? cal.templeSplayDeg : DEFAULT_SPLAY_DEG,
      autoTempleSplay: true,
      autoBridgeDepth: false,
      templeArmsMode: cal.templeArmsMode ?? DEFAULT_CALIBRATION.templeArmsMode ?? 'fade',
      frameWidthMm:
        isFiniteNum(frame.frameWidthMm) && frame.frameWidthMm > 0 ? frame.frameWidthMm : null,
      occ: occFromFrame(frame),
    });
  },
}));
