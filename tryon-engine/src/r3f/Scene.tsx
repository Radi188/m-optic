
/**
 * Scene — the R3F scene graph.
 *
 *   <group faceRef>  ← driven every frame by the MediaPipe head-pose matrix
 *     <Glasses/>     ← calibration group (matrix-driven via parent + store)
 *     <Occluder/>    ← depth-only head + side shells (same matrix)
 *
 * faceRef is decomposed from the pose matrix (position/quaternion/scale) exactly
 * like the imperative build; both children inherit it. Lights + optional self-
 * environment from the live camera feed (the app always has one, so the
 * website's optional HDR fallback is not ported).
 */

import React, { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
const { min, max } = Math;
import * as THREE from 'three';
import Glasses from './Glasses';
import Occluder from './Occluder';
import VideoEnvironment from './VideoEnvironment';
import FaceShapeDetector from './FaceShapeDetector';
import { useTracking } from './tracking-context';
import { useVtoStore } from '../store';
import { OneEuroFilter } from '../vto/oneEuroFilter';
import type { FaceShape } from '../vto/faceShape';

/** Derivative cutoff (Hz) for the 1€ filters — standard 1.0. minCutoff/beta are live. */
const ONE_EURO_DCUTOFF = 1.0;
/** Scale changes very little (rigid matrix) → keep a gentle constant lerp. */
const SCALE_SMOOTH = 0.3;

/**
 * Error boundary around the GLB-loading <Glasses>. Unlike SilentBoundary it
 * REPORTS the failure: a CORS/404/parse error (useGLTF throws it here) is logged
 * with the URL and bubbled up via onError so the shell can show a visible overlay
 * — instead of a blank canvas with only the debug dots. Reset per model by `key`.
 */
class GlbErrorBoundary extends Component<
  { glbPath: string; onError?: (glbPath: string, err: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(`[VTO] GLB FAILURE — failed to load/parse: ${this.props.glbPath}`, error);
    this.props.onError?.(this.props.glbPath, error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Suspense fallback for the GLB that REPORTS the wait instead of drawing
 * nothing.
 *
 * A frame is several MB, so between the camera starting and the model arriving
 * there is a stretch where the wearer sees their own video and no glasses — with
 * a null fallback that is indistinguishable from a broken try-on. Mounting means
 * "still loading", unmounting means the model is on screen, so the shell can say
 * so without polling anything.
 *
 * The callback is held in a ref: an inline arrow from the parent would change
 * identity on every render and re-run the effect, which would report a
 * load-finished/load-started pair on each one and flicker the overlay.
 */
function GlbLoadingSignal({ onChange }: { onChange?: (loading: boolean) => void }) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    cb.current?.(true);
    return () => cb.current?.(false);
  }, []);
  return null;
}

export default function Scene({
  glbPath,
  video,
  onGlbError,
  onGlbEmpty,
  onFaceShape,
  onGlassesLoadingChange,
}: {
  glbPath: string;
  /**
   * The live camera <video>. Supplied, it becomes the environment map so the
   * frame reflects the wearer's actual room; omitted, lighting falls back to the
   * optional HDR and the fixed lights.
   */
  video?: HTMLVideoElement | null;
  onGlbError?: (glbPath: string, err: unknown) => void;
  /** Fired when the GLB loaded but decoded to ZERO meshes (broken asset). */
  onGlbEmpty?: (glbPath: string) => void;
  /** Fired when the detected face shape settles or changes. */
  onFaceShape?: (shape: FaceShape | null) => void;
  /**
   * True while the GLB is still loading, false once it is rendering (or once a
   * failure has been handed to `onGlbError` — the wait is over either way, and
   * the shell shows the error instead).
   */
  onGlassesLoadingChange?: (loading: boolean) => void;
}) {
  const { matrixRef, detectedRef } = useTracking();
  const faceRef = useRef<THREE.Group>(null);
  const poseMat = useMemo(() => new THREE.Matrix4(), []);
  // Scratch targets + first-frame snap guard for smoothing.
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tQuat = useMemo(() => new THREE.Quaternion(), []);
  const tScale = useMemo(() => new THREE.Vector3(), []);
  const snappedRef = useRef(false);

  // 1€ filters: 3 for position (x,y,z) + 4 for quaternion (x,y,z,w). Params
  // (minCutoff/beta) are pushed from the store each frame; dcutoff is fixed.
  const posFilters = useMemo(
    () => [new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()],
    [],
  );
  const quatFilters = useMemo(
    () => [new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()],
    [],
  );
  // Last RAW (hemisphere-aligned) quaternion, so component filtering stays continuous.
  const qPrevInput = useMemo(() => new THREE.Quaternion(), []);
  // Previous frame timestamp (ms) for dt.
  const lastTsRef = useRef<number | null>(null);

  // Drive the face group from the head-pose matrix every frame, with SPEED-
  // ADAPTIVE 1€ smoothing: tight tracking during fast yaw, rock-steady when still.
  // renderPriority -1: <Glasses> and <Occluder> are CHILDREN, so React commits
  // their effects — and therefore their useFrame subscriptions — before this one.
  // Without a priority they would read the face group's PREVIOUS-frame rotation
  // while deprojecting the CURRENT frame's landmarks, and that one-frame mismatch
  // shows up as the frame sliding off the nose during a turn. R3F sorts ascending
  // by priority and only treats priority > 0 as "take over rendering", so a
  // negative value reorders without disabling the automatic render.
  useFrame(() => {
    const g = faceRef.current;
    if (!g) return;
    const m = matrixRef.current;
    if (!(m && m.length === 16 && detectedRef.current)) {
      g.visible = false;
      return;
    }

    // dt from real frame timestamps (seconds), clamped against 0 / tab-refocus spikes.
    const now = performance.now();
    const dt = lastTsRef.current == null ? 1 / 60 : min(max((now - lastTsRef.current) / 1000, 1e-4), 0.1);
    lastTsRef.current = now;

    // Push live tuning params onto every filter.
    const { oneEuroMinCutoff: mc, oneEuroBeta: beta } = useVtoStore.getState();
    for (const f of posFilters) {
      f.minCutoff = mc;
      f.beta = beta;
      f.dcutoff = ONE_EURO_DCUTOFF;
    }
    for (const f of quatFilters) {
      f.minCutoff = mc;
      f.beta = beta;
      f.dcutoff = ONE_EURO_DCUTOFF;
    }

    poseMat.fromArray(m);
    poseMat.decompose(tPos, tQuat, tScale);

    if (!snappedRef.current) {
      // First detected frame: snap (initialise filters, no smoothing).
      g.position.copy(tPos);
      g.quaternion.copy(tQuat);
      g.scale.copy(tScale);
      posFilters[0].reset(tPos.x);
      posFilters[1].reset(tPos.y);
      posFilters[2].reset(tPos.z);
      quatFilters[0].reset(tQuat.x);
      quatFilters[1].reset(tQuat.y);
      quatFilters[2].reset(tQuat.z);
      quatFilters[3].reset(tQuat.w);
      qPrevInput.copy(tQuat);
      snappedRef.current = true;
      g.visible = true;
      return;
    }

    // POSITION — one 1€ filter per axis.
    g.position.set(
      posFilters[0].filter(tPos.x, dt),
      posFilters[1].filter(tPos.y, dt),
      posFilters[2].filter(tPos.z, dt),
    );

    // ROTATION — hemisphere-align the new quaternion to the previous raw input
    // (avoid sign flips), filter each component, then re-normalise.
    if (qPrevInput.dot(tQuat) < 0) {
      tQuat.set(-tQuat.x, -tQuat.y, -tQuat.z, -tQuat.w);
    }
    g.quaternion
      .set(
        quatFilters[0].filter(tQuat.x, dt),
        quatFilters[1].filter(tQuat.y, dt),
        quatFilters[2].filter(tQuat.z, dt),
        quatFilters[3].filter(tQuat.w, dt),
      )
      .normalize();
    qPrevInput.copy(tQuat);

    // SCALE — gentle constant lerp (size never pops; matrix scale ≈ rigid).
    g.scale.lerp(tScale, SCALE_SMOOTH);
    g.visible = true;
  }, -1);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[0.5, 1, 2]} intensity={1.2} />
      <directionalLight position={[-1, 0.5, -1]} intensity={0.4} color="#c8d0ff" />

      {/* The room the wearer is actually in — strictly better than a canned HDR,
          so the HDR below is only mounted when there is no camera feed to use. */}
      {video ? <VideoEnvironment video={video} /> : null}

      {onFaceShape ? <FaceShapeDetector onDetect={onFaceShape} /> : null}

      <group ref={faceRef}>
        {/* Error boundary: a missing/invalid GLB (e.g. the demo /vto/models/*.glb
            placeholders) must not crash the whole Canvas — video + occluder stay. */}
        <GlbErrorBoundary key={glbPath} glbPath={glbPath} onError={onGlbError}>
          <Suspense fallback={<GlbLoadingSignal onChange={onGlassesLoadingChange} />}>
            <Glasses glbPath={glbPath} faceRef={faceRef} onEmpty={onGlbEmpty} />
          </Suspense>
        </GlbErrorBoundary>
        <Occluder />
      </group>
    </>
  );
}
