/**
 * Scene — ported from the website (src/components/r3f/Scene.tsx).
 *
 *   <group faceRef>  ← driven every frame by the MediaPipe head-pose matrix
 *     <Glasses/>     ← calibration group (matrix-driven via parent + store)
 *     <Occluder/>    ← depth-only head + side shells (same matrix)
 *
 * Pose smoothing is the website's: 1€ filters on position (3) and the
 * hemisphere-aligned quaternion (4), snap on the first frame after the face is
 * found again, hide at once when it is lost.
 *
 * Native difference: the environment map is three's procedural RoomEnvironment
 * (the website feeds the live <video> into PMREM, which a native camera
 * preview cannot be without a GPU texture bridge).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Glasses from './Glasses';
import Occluder from './Occluder';
import { useTracking } from './tracking';
import { useVtoStore } from '../store';
import { OneEuroFilter } from '../core/oneEuroFilter';

const { min, max } = Math;

/** Derivative cutoff (Hz) for the 1€ filters — standard 1.0. */
const ONE_EURO_DCUTOFF = 1.0;
/** Scale changes very little (rigid matrix) → gentle constant lerp. */
const SCALE_SMOOTH = 0.3;
/** Same strength the website gives its environment map. */
const ENVIRONMENT_INTENSITY = 0.55;

/**
 * Reflections for metal and acetate. Built once per GL context; skipped (lights
 * only) if the context cannot render the half-float targets PMREM needs.
 */
function Environment() {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  useEffect(() => {
    let target: THREE.WebGLRenderTarget | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let room: RoomEnvironment | null = null;
    try {
      pmrem = new THREE.PMREMGenerator(gl);
      room = new RoomEnvironment();
      target = pmrem.fromScene(room, 0.04);
      scene.environment = target.texture;
      scene.environmentIntensity = ENVIRONMENT_INTENSITY;
    } catch (err) {
      console.warn('[VTO] environment map disabled:', err);
      scene.environment = null;
    }
    return () => {
      scene.environment = null;
      target?.dispose();
      pmrem?.dispose();
      room?.dispose();
    };
  }, [gl, scene]);
  return null;
}

export default function Scene({
  gltf,
  onGlbEmpty,
}: {
  /** The parsed GLB, or null while the selected colourway is loading. */
  gltf: GLTF | null;
  onGlbEmpty?: () => void;
}) {
  const { matrixRef, detectedRef } = useTracking();
  const faceRef = useRef<THREE.Group>(null);
  const poseMat = useMemo(() => new THREE.Matrix4(), []);
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tQuat = useMemo(() => new THREE.Quaternion(), []);
  const tScale = useMemo(() => new THREE.Vector3(), []);
  const snappedRef = useRef(false);

  const posFilters = useMemo(() => [new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()], []);
  const quatFilters = useMemo(
    () => [new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()],
    [],
  );
  const qPrevInput = useMemo(() => new THREE.Quaternion(), []);
  const lastTsRef = useRef<number | null>(null);

  // Priority -1: <Glasses>/<Occluder> are children and must read THIS frame's
  // face pose, not the previous one (see the website's note on this).
  useFrame(() => {
    const g = faceRef.current;
    if (!g) return;
    const m = matrixRef.current;
    if (!(m && m.length === 16 && detectedRef.current)) {
      g.visible = false;
      // The next detection snaps instead of smoothing in from a stale pose.
      snappedRef.current = false;
      lastTsRef.current = null;
      return;
    }

    const now = performance.now();
    const dt = lastTsRef.current == null ? 1 / 60 : min(max((now - lastTsRef.current) / 1000, 1e-4), 0.1);
    lastTsRef.current = now;

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

    g.position.set(
      posFilters[0].filter(tPos.x, dt),
      posFilters[1].filter(tPos.y, dt),
      posFilters[2].filter(tPos.z, dt),
    );

    if (qPrevInput.dot(tQuat) < 0) tQuat.set(-tQuat.x, -tQuat.y, -tQuat.z, -tQuat.w);
    g.quaternion
      .set(
        quatFilters[0].filter(tQuat.x, dt),
        quatFilters[1].filter(tQuat.y, dt),
        quatFilters[2].filter(tQuat.z, dt),
        quatFilters[3].filter(tQuat.w, dt),
      )
      .normalize();
    qPrevInput.copy(tQuat);

    g.scale.lerp(tScale, SCALE_SMOOTH);
    g.visible = true;
  }, -1);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[0.5, 1, 2]} intensity={1.2} />
      <directionalLight position={[-1, 0.5, -1]} intensity={0.4} color="#c8d0ff" />
      <Environment />

      <group ref={faceRef} visible={false}>
        {gltf ? <Glasses key={gltf.scene.uuid} gltf={gltf} faceRef={faceRef} onEmpty={onGlbEmpty} /> : null}
        <Occluder />
      </group>
    </>
  );
}
