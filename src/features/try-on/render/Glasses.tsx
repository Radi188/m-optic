/**
 * Glasses — ported from the website (src/components/r3f/Glasses.tsx).
 *
 * Build (once per model): clone the parsed GLB, then buildGlassesGroup
 * (auto-fit to ~14.5 cm front width, lens material, temple hinge pivots).
 *
 * Per frame (useFrame, store read via getState → no re-render): position /
 * rotation (incl. pantoscopic tilt) from the store; auto-scale from the real
 * frame width (hinge_to_hinge) or the outer-eye distance (33 / 263) × 1.5;
 * anchor on landmark 168 with the nose-ridge push; per-arm temple splay; far
 * arm fading. The maths is the website's, unchanged.
 *
 * Native differences only: the GLB arrives as a parsed glTF (loaded by
 * glbLoader.ts, not useLoader), the calibration-panel debug dots and logs are
 * gone, and the model's GPU resources are disposed on unmount so opening the
 * try-on repeatedly does not leak.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildGlassesGroup, TARGET_FRAME_WIDTH_CM } from './buildGlasses';
import { useVtoStore } from '../store';
import { OneEuroFilter } from '../core/oneEuroFilter';
import {
  AUTO_SPLAY_MAX_DEG,
  AUTO_SPLAY_MIN_DEG,
  HEAD_CLEARANCE_CM,
  RunningMedian,
  SPLAY_SMOOTH,
  measureHeadHalfWidths,
  solveSplayRad,
} from '../core/templeSplay';
import { useTracking } from './tracking';

const { tan, hypot, abs, PI: pi } = Math;

/** Minimal shape of the parsed glTF JSON we read for the extension/zero-mesh logs. */
interface GltfJson {
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  meshes?: unknown[];
  nodes?: unknown[];
}

const DEG2RAD = pi / 180;

// MediaPipe FaceMesh OUTER EYE CORNERS (canthi) — the face-width reference.
const OUTER_EYE_R = 33; // wearer's right
const OUTER_EYE_L = 263; // wearer's left
/** MediaPipe nose-bridge/top-of-nose anchor. */
const NOSE_BRIDGE = 168;
/**
 * Eyelid landmarks, upper and lower, for each eye. Their midpoint tracks the
 * pupil vertically without needing the iris refinement points (468+), which are
 * not guaranteed to be present in every landmarker build.
 */
const EYE_LIDS_R = [159, 145] as const; // wearer's right: upper, lower
const EYE_LIDS_L = [386, 374] as const; // wearer's left: upper, lower
/** Prevent invalid projection math if the face pose briefly reports near-zero depth. */
const MIN_LANDMARK_DEPTH_CM = 1;
/** Match the pose filter derivative cutoff used in Scene.tsx. */
const ONE_EURO_DCUTOFF = 1.0;


/**
 * Frame front width as a multiple of the outer-canthal distance. Average outer-
 * eye distance ≈ 9.5 cm and a typical frame front ≈ 14.5 cm, so ~1.5 makes the
 * Scale slider sit near 1.0 on an average face. Lower = snugger.
 */
const FRAME_WIDTH_TO_OUTER_EYE = 1.5;

/** Per-frame lerp factor for the auto-scale (kept gentle — size shouldn't pop). */
const SCALE_SMOOTH = 0.3;

/**
 * Nose-ridge follow → Bridge Z.
 *
 * The frame is pinned to landmark 168 (the nasion), but its bridge does not rest
 * there: `bridgeOffset.y` drops the real contact a couple of centimetres DOWN
 * the nose. Over that drop the ridge runs forward — that is what a nose is — so
 * a contact placed at the nasion's depth ends up INSIDE the face lower down, and
 * the face-mesh occluder correctly hides it. That is the bridge being eaten.
 *
 * So we measure how far forward the ridge has come at the height the contact
 * actually lands, straight off the wearer's own mesh, and push the frame out by
 * exactly that. Nothing here is a constant of anatomy: a flat bridge gets a small
 * push, a prominent one a bigger push, each from their own face.
 */
const NOSE_RIDGE = [168, 6, 197, 195, 5] as const;
/** Ceiling on the push, so one bad frame of landmarks cannot fling the frame. */
const NOSE_RIDGE_MAX_CM = 1.2;
/** Running-median window per ridge sample (same idea as the width lock). */
const NOSE_RIDGE_SAMPLES = 31;

/**
 * Face width is a CONSTANT property of the user, but the landmark measurement is
 * only reliable near-frontal (z noise + foreshortening grow with yaw). So we only
 * sample the width when |yaw| < this, keep a running median, and HOLD it during
 * rotation — the frame size is then identical frontal vs turned.
 */
const FRONTAL_YAW_DEG = 12;
/** Running-median window of frontal width samples. */
const WIDTH_SAMPLES = 31;

/**
 * Far-side temple-arm fading.
 *
 * Once the head turns, the arm on the AWAY side swings behind the skull, where
 * it reads as drawn straight across the cheek — glasses worn *through* the face.
 * Past the trigger that arm is switched to the fade material: it stays present
 * (the pair still looks complete in profile) but dissolves toward the tip, and
 * because the fade material keeps depthTest on, the head occluder clips the part
 * that would cross the face.
 *
 * The trigger is the camera-space depth GAP between the two hinges rather than
 * the yaw angle: the hinges sit ~13 cm apart, so the gap is ~13·sin(yaw) cm and
 * carries the same information, while sidestepping every sign convention in the
 * MediaPipe matrix and the mirrored preview. Two thresholds give hysteresis so
 * an arm can't strobe on and off while the head is held near the trigger angle.
 */
const FAR_ARM_HIDE_DEPTH_CM = 2.8; // ≈12° yaw — fade the far arm past this
const FAR_ARM_SHOW_DEPTH_CM = 1.8; // ≈8° yaw — restore it fully below this

interface Props {
  /** The parsed GLB (glbLoader.ts). */
  gltf: GLTF;
  /** The matrix-driven face group (read for smoothed distance + scale). */
  faceRef: React.RefObject<THREE.Group | null>;
  /** Called when the GLB decoded to ZERO meshes (broken catalog asset). */
  onEmpty?: () => void;
}

/** Free every geometry, material and texture under `root`. */
function disposeTree(root: THREE.Object3D, extra: THREE.Material[] = []): void {
  const materials = new Set<THREE.Material>(extra);
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const m = mesh.material;
    (Array.isArray(m) ? m : [m]).forEach(x => x && materials.add(x));
  });
  for (const m of materials) {
    for (const value of Object.values(m)) {
      if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
    }
    m.dispose();
  }
}

export default function Glasses({ gltf, faceRef, onEmpty }: Props) {
  const scene = gltf.scene;
  const { landmarksRef } = useTracking();
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;

  const { build: built, isEmpty } = useMemo(() => {
    const json = (gltf.parser?.json ?? {}) as GltfJson;
    let meshCount = 0;
    scene.traverse(o => {
      if ((o as THREE.Mesh).isMesh) meshCount++;
    });
    if (meshCount === 0) {
      console.warn(
        `[VTO] GLB has NO meshes. json.meshes=${json.meshes?.length ?? 0} ` +
          `extensionsRequired=[${(json.extensionsRequired ?? []).join(', ') || 'none'}]`,
      );
    }
    const b = buildGlassesGroup(scene.clone(true));
    if (__DEV__) console.log(`[VTO] GLB built: meshes=${meshCount} bridge=${b.bridgeSource}`);
    return { build: b, isEmpty: meshCount === 0 };
  }, [scene, gltf]);

  useEffect(() => {
    if (isEmpty) onEmpty?.();
  }, [isEmpty, onEmpty]);

  // The clone shares geometry/textures with the parsed source, and nothing else
  // holds either once the model is swapped, so both go together.
  useEffect(
    () => () => {
      const fades = built.armMeshes.flatMap(a => (Array.isArray(a.fade) ? a.fade : [a.fade]));
      const originals = built.armMeshes.flatMap(a =>
        Array.isArray(a.original) ? a.original : [a.original],
      );
      disposeTree(built.group, [...fades, ...originals]);
      disposeTree(scene);
    },
    [built, scene],
  );

  // Smoothed scale state + last-applied temple-arms mode (avoid redundant work).
  const curScaleRef = useRef(1);
  // Locked face-width measurement (cm) + the frontal-only sample window.
  const frontalSamplesRef = useRef<number[]>([]);
  const lockedEyeDistRef = useRef<number | null>(null);
  // Detected landmarks are noisier than the facial matrix, so the real nose
  // position gets its own 1€ filters using the same live tuning params.
  const nosePosFilters = useMemo(
    () => [new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()],
    [],
  );
  const noseSnappedRef = useRef(false);
  const lastNoseTsRef = useRef<number | null>(null);
  // Scratch Euler for yaw extraction (no per-frame allocation).
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const landmarkCamera = useMemo(() => new THREE.Vector3(), []);
  const smoothedLandmarkCamera = useMemo(() => new THREE.Vector3(), []);
  const landmarkFace = useMemo(() => new THREE.Vector3(), []);
  const effectiveBridge = useMemo(() => new THREE.Vector3(), []);
  const bridgeOffset = useMemo(() => new THREE.Vector3(), []);
  const bridgeParentOffset = useMemo(() => new THREE.Vector3(), []);
  const fallbackPosition = useMemo(() => new THREE.Vector3(), []);
  // Far-arm culling: which side is currently dropped (null = both drawn).
  const farArmSideRef = useRef<'left' | 'right' | null>(null);
  const hingeWorld = useMemo(() => new THREE.Vector3(), []);
  // ── Auto temple splay ─────────────────────────────────────────────────────
  // Head half-widths are sampled near-frontal and HELD (same reasoning as the
  // face-width lock above), and the applied angle is lerped so an arm never
  // snaps. Scratch vectors are module-lifetime to keep useFrame allocation-free.
  const headWidthMedians = useMemo(
    () => ({ left: new RunningMedian(), right: new RunningMedian() }),
    [],
  );
  const splayRef = useRef<{ left: number; right: number } | null>(null);
  // Nose-bridge depth: sampled under the same frontal gate as the widths, held
  // through rotation, and smoothed by its own median window.
  // Per ridge landmark: how far BELOW the nasion it sits, and how far FORWARD —
  // both face-local cm, both median-held so rotation cannot move them.
  const ridgeDrop = useMemo(
    () => NOSE_RIDGE.map(() => new RunningMedian(NOSE_RIDGE_SAMPLES)),
    [],
  );
  const ridgeForward = useMemo(
    () => NOSE_RIDGE.map(() => new RunningMedian(NOSE_RIDGE_SAMPLES)),
    [],
  );
  const nasionFace = useMemo(() => new THREE.Vector3(), []);
  const ridgeFace = useMemo(() => new THREE.Vector3(), []);
  const headLmCamera = useMemo(() => new THREE.Vector3(), []);
  const headLmFace = useMemo(() => new THREE.Vector3(), []);
  const armTipWorld = useMemo(() => new THREE.Vector3(), []);
  const armTipFace = useMemo(() => new THREE.Vector3(), []);
  const hingeFace = useMemo(() => new THREE.Vector3(), []);
  // A new model means a new arm geometry, so the smoothed angle from the old one
  // must not carry over. The HEAD measurement is a property of the wearer and is
  // deliberately kept.
  useEffect(() => {
    splayRef.current = null;
  }, [built]);

  /**
   * How far forward the ridge has come, `dropCm` below the nasion.
   *
   * The samples are a handful of points down the nose, so the answer between
   * two of them is interpolated; past the last one it holds, since guessing
   * beyond the measured ridge is exactly how a frame ends up floating.
   */
  const ridgeForwardAt = (dropCm: number): number | null => {
    let prevDrop: number | null = null;
    let prevForward = 0;

    for (let i = 0; i < NOSE_RIDGE.length; i++) {
      const drop = ridgeDrop[i].value;
      const forward = ridgeForward[i].value;
      if (drop == null || forward == null) continue;

      if (dropCm <= drop) {
        if (prevDrop == null) return forward * (drop <= 0 ? 1 : dropCm / drop);
        const span = drop - prevDrop;
        const t = span > 1e-4 ? (dropCm - prevDrop) / span : 0;
        return prevForward + (forward - prevForward) * t;
      }

      prevDrop = drop;
      prevForward = forward;
    }

    return prevDrop == null ? null : prevForward;
  };

  useFrame(() => {
    const s = useVtoStore.getState();
    const g = built.group;

    g.rotation.set(s.rotationOffset[0], s.rotationOffset[1], s.rotationOffset[2]);

    // ── Face-width auto-scale (rotation-invariant + locked) ──────────────────
    let target = s.scaleMultiplier; // fallback (no landmarks): plain multiplier
    let hasBridgeAnchor = false;
    const lms = landmarksRef.current;
    const face = faceRef.current;
    if (lms && lms.length > OUTER_EYE_L && face) {
      const a = lms[OUTER_EYE_R];
      const b = lms[OUTER_EYE_L];
      // Smoothed face distance (cm) = length of the face group's translation.
      const D = face.position.length();
      // Camera tan half-FOVs (vertical fov; horizontal from aspect).
      const halfTanY = tan((camera.fov * DEG2RAD) / 2);
      const halfTanX = halfTanY * camera.aspect;
      // STEP 1 — FULL 3D outer-eye distance. Include z (MediaPipe z is on the
      // same scale as x), so the distance no longer foreshortens during yaw.
      const dTanX = (b.x - a.x) * 2 * halfTanX;
      const dTanY = (b.y - a.y) * 2 * halfTanY;
      const dTanZ = (b.z - a.z) * 2 * halfTanX; // z uses the x (width) scale
      const eyeDist3D = D * hypot(dTanX, dTanY, dTanZ);

      // STEP 2 — only MEASURE when near-frontal (where landmarks are reliable),
      // keep a running median, and HOLD it during rotation → size never changes.
      euler.setFromQuaternion(face.quaternion); // order 'YXZ' (set on the Euler)
      const yawDeg = abs(euler.y) / DEG2RAD;
      if (eyeDist3D > 1e-3 && yawDeg < FRONTAL_YAW_DEG) {
        const arr = frontalSamplesRef.current;
        arr.push(eyeDist3D);
        if (arr.length > WIDTH_SAMPLES) arr.shift();
        const sorted = [...arr].sort((x, y) => x - y);
        lockedEyeDistRef.current = sorted[Math.floor(sorted.length / 2)]; // median
      }

      // Drive scale from the LOCKED width (fallback to the live 3D measurement
      // until the first frontal sample exists).
      const eyeDistCm = lockedEyeDistRef.current ?? eyeDist3D;
      if (eyeDistCm > 1e-3) {
        // TRUE SIZE when the catalog knows the frame's real width: a 48 mm frame
        // then renders smaller than a 58 mm one on the same face, instead of both
        // being stretched to the same multiple of the wearer's face. Without that
        // measurement we can only fit to the face, which is the old behaviour.
        const targetFrontCm =
          s.frameWidthMm != null ? s.frameWidthMm / 10 : eyeDistCm * FRAME_WIDTH_TO_OUTER_EYE;
        // Divide out the face group's own scale so this is independent of whether
        // the MediaPipe matrix carries scale (group is its child).
        const faceScale = face.scale.x || 1;
        const autoScale = targetFrontCm / (TARGET_FRAME_WIDTH_CM * faceScale);
        target = autoScale * s.scaleMultiplier;
      }

      // Normalized x/y scaled by the landmark's own depth, then pulled into the
      // face group: the result is face-local cm with the head pose already
      // undone. Same deprojection the nose anchor below uses.
      const zSign = face.position.z < 0 ? -1 : 1;
      const lmToFace = (index: number, out: THREE.Vector3): THREE.Vector3 | null => {
        const lm = lms[index];
        if (!lm) return null;
        const depth = Math.max(MIN_LANDMARK_DEPTH_CM, D + (lm.z ?? 0) * 2 * halfTanX * D);
        headLmCamera.set(
          (lm.x - 0.5) * 2 * halfTanX * depth,
          (0.5 - lm.y) * 2 * halfTanY * depth,
          zSign * depth,
        );
        return out.copy(face.worldToLocal(headLmCamera));
      };

      // ── Head width for the auto temple splay ─────────────────────────────
      // Sampled under the SAME frontal gate as the face width: off-axis, the
      // far-side outline foreshortens and its z degrades, and a head width read
      // mid-turn would swing the arms exactly when they are most visible. Held
      // values carry through rotation instead.
      if (s.autoTempleSplay && yawDeg < FRONTAL_YAW_DEG) {
        const widths = measureHeadHalfWidths(lmToFace, headLmFace);
        if (widths) {
          headWidthMedians.left.push(widths.left);
          headWidthMedians.right.push(widths.right);
        }
      }

      // ── Nose ridge for the auto Bridge Z ─────────────────────────────────
      // Walk the ridge from the nasion toward the tip and record, for each
      // point, its drop below the nasion and its forward gain from it. Frontal
      // gate again: off-axis the ridge foreshortens and its z is the first
      // thing to degrade.
      if (s.autoBridgeDepth && yawDeg < FRONTAL_YAW_DEG) {
        const nasion = lmToFace(NOSE_BRIDGE, nasionFace);
        if (nasion) {
          for (let i = 0; i < NOSE_RIDGE.length; i++) {
            const point = lmToFace(NOSE_RIDGE[i], ridgeFace);
            if (!point) continue;
            ridgeDrop[i].push(nasion.y - point.y);
            ridgeForward[i].push(point.z - nasion.z);
          }
        }
      }

      // ── ANCHOR MODE ──────────────────────────────────────────────────────
      // The anchor is always built around landmark 168 (nasion). In 'eyes' mode
      // only its HEIGHT is replaced, by the midpoint of the four eyelid
      // landmarks.
      //
      // X and Z deliberately stay on the nose in both modes. The eye midpoint is
      // an excellent height reference and a poor lateral one: yaw foreshortens
      // and partly occludes the far eye, MediaPipe's estimate for it degrades,
      // and the midpoint slides toward the near eye — which drags the frame off
      // the nose exactly when the head turns. The nasion sits on the centre line
      // and stays put.
      const useEyeAnchor = s.anchorMode === 'eyes' && built.lensCenter !== null;
      const eyeIdx = [...EYE_LIDS_R, ...EYE_LIDS_L];
      const haveAnchor =
        NOSE_BRIDGE < lms.length && (!useEyeAnchor || eyeIdx.every((i) => i < lms.length));

      if (haveAnchor) {
        const noseLm = lms[NOSE_BRIDGE];
        let anchorY = noseLm.y;
        if (useEyeAnchor) {
          let sumY = 0;
          for (const i of eyeIdx) sumY += lms[i].y;
          anchorY = sumY / eyeIdx.length;
        }
        // Mixing normalized components before deprojection is safe: x and y are
        // each scaled by the SAME depth, and that depth comes from z — which is
        // the nose's in both modes.
        const nose = { x: noseLm.x, y: anchorY, z: noseLm.z ?? 0 };
        // Deproject the DETECTED landmark 168 into the same camera/metric space
        // as the glasses. Rotation still comes from the matrix parent; position
        // comes from this user's real nose, not the average canonical face.
        const landmarkDepth = Math.max(
          MIN_LANDMARK_DEPTH_CM,
          D + nose.z * 2 * halfTanX * D,
        );
        const cameraZSign = face.position.z < 0 ? -1 : 1;
        landmarkCamera.set(
          (nose.x - 0.5) * 2 * halfTanX * landmarkDepth,
          (0.5 - nose.y) * 2 * halfTanY * landmarkDepth,
          cameraZSign * landmarkDepth,
        );

        const now = performance.now();
        const dt =
          lastNoseTsRef.current == null
            ? 1 / 60
            : Math.min(Math.max((now - lastNoseTsRef.current) / 1000, 1e-4), 0.1);
        lastNoseTsRef.current = now;

        for (const f of nosePosFilters) {
          f.minCutoff = s.oneEuroMinCutoff;
          f.beta = s.oneEuroBeta;
          f.dcutoff = ONE_EURO_DCUTOFF;
        }

        if (!noseSnappedRef.current) {
          nosePosFilters[0].reset(landmarkCamera.x);
          nosePosFilters[1].reset(landmarkCamera.y);
          nosePosFilters[2].reset(landmarkCamera.z);
          smoothedLandmarkCamera.copy(landmarkCamera);
          noseSnappedRef.current = true;
        } else {
          smoothedLandmarkCamera.set(
            nosePosFilters[0].filter(landmarkCamera.x, dt),
            nosePosFilters[1].filter(landmarkCamera.y, dt),
            nosePosFilters[2].filter(landmarkCamera.z, dt),
          );
        }

        // Convert the smoothed real-nose world target into the parent face group.
        // This compensates the parent's matrix translation while preserving its
        // clean matrix rotation for orientation.
        landmarkFace.copy(face.worldToLocal(smoothedLandmarkCamera));
        hasBridgeAnchor = true;
      }
    }

    // Smooth the applied scale toward the target.
    curScaleRef.current += (target - curScaleRef.current) * SCALE_SMOOTH;
    g.scale.setScalar(curScaleRef.current);

    // Which model-space point gets pinned to the anchor.
    //
    // 'eyes' mode takes ONLY the vertical component from the measured lens
    // centre — height is the thing that needed measuring, and it is what removes
    // the per-shape drop. X and Z keep the bridge path deliberately: the lens
    // centre sits forward of the bridge contact, so pinning its z would push the
    // whole frame back into the head, far enough that the face-mesh occluder
    // starts eating the frame front and the temples appear cut off.
    //
    // Bridge X / Bridge Z therefore still work in eyes mode; only Bridge Y stops
    // mattering.
    const anchorOnEyes = s.anchorMode === 'eyes' && built.lensCenter !== null;
    bridgeOffset.set(s.bridgeOffset[0], s.bridgeOffset[1], s.bridgeOffset[2]);

    // ── Bridge Z from the measured nose ──────────────────────────────────────
    // The authored value is the baseline, tuned on one face; a bridge deeper
    // than that face's pushes the frame further out so it rests on the nose
    // instead of sinking into it. One-way on purpose (see the MIN constant): a
    // flatter bridge keeps the authored depth rather than moving behind it,
    // which is what the occluder eats. Held through rotation (the median only
    // takes frontal samples), so the depth never shifts mid-turn.
    if (s.autoBridgeDepth) {
      // Where the contact actually lands, in face-local cm: `bridgeOffset.y`
      // is model space, so it takes the frame's own scale to become a drop on
      // this face.
      const contactDrop = Math.abs(bridgeOffset.y) * curScaleRef.current;
      const forward = ridgeForwardAt(contactDrop);
      if (forward != null) {
        // The sign of the measurement is which way face-local z leaves the
        // face — a ridge always runs forward — so no convention is assumed.
        const outward = Math.sign(forward) || 1;
        bridgeOffset.z +=
          outward * THREE.MathUtils.clamp(Math.abs(forward), 0, NOSE_RIDGE_MAX_CM);
      }
    }
    if (anchorOnEyes) {
      effectiveBridge.set(
        built.bridgePoint.x + bridgeOffset.x,
        (built.lensCenter as THREE.Vector3).y,
        built.bridgePoint.z + bridgeOffset.z,
      );
    } else {
      effectiveBridge.copy(built.bridgePoint).add(bridgeOffset);
    }
    bridgeParentOffset
      .copy(effectiveBridge)
      .multiplyScalar(curScaleRef.current)
      .applyEuler(g.rotation);

    if (hasBridgeAnchor) {
      // Landmark 168 is the anchor. Move the frame origin so the corrected visual
      // bridge point, not the GLB origin, sits exactly on that landmark.
      g.position.copy(landmarkFace).sub(bridgeParentOffset);
    } else {
      noseSnappedRef.current = false;
      lastNoseTsRef.current = null;
      fallbackPosition
        .set(s.positionOffset[0], s.positionOffset[1], s.positionOffset[2])
        .sub(bridgeParentOffset);
      g.position.copy(fallbackPosition);
    }

    // ── Temple splay: left (−X) = +splay, right (+X) = −splay ────────────────
    // (Still applied for full/fade; harmless for hidden since the arm meshes
    // aren't rendered.)
    //
    // The authored angle is the floor: one number for every head. When the head
    // has been measured, each arm instead gets the angle that lands its tip on
    // THAT side of THAT head — so the arms flare out on a wide head, come in on
    // a narrow one, and differ from each other on an asymmetric one.
    const authoredSplay = s.templeSplayDeg * DEG2RAD;
    let splayLeft = authoredSplay;
    let splayRight = authoredSplay;

    const heldLeft = headWidthMedians.left.value;
    const heldRight = headWidthMedians.right.value;
    if (
      s.autoTempleSplay &&
      face &&
      built.leftPivot &&
      built.rightPivot &&
      built.leftArmTip &&
      built.rightArmTip &&
      heldLeft !== null &&
      heldRight !== null
    ) {
      // `g`'s transform was written above, so the hinges' world matrices are a
      // frame stale without this refresh.
      g.updateMatrixWorld(true);
      const solve = (
        side: 'left' | 'right',
        pivot: THREE.Object3D,
        tipLocal: THREE.Vector3,
        headHalfWidth: number,
      ): number | null => {
        hingeFace.copy(face.worldToLocal(pivot.getWorldPosition(hingeWorld)));
        // The tip in face-local cm AT THE CURRENT ANGLE. Only its DISTANCE from
        // the hinge is used, and a rotation about Y cannot change that, so this
        // is just a way to read the model→face scale off the live transform
        // instead of re-deriving the chain of scales by hand.
        armTipFace.copy(face.worldToLocal(pivot.localToWorld(armTipWorld.copy(tipLocal))));
        const tipLen = tipLocal.length();
        if (!(tipLen > 1e-6)) return null;
        const k = hingeFace.distanceTo(armTipFace) / tipLen;
        // k converts the tip offset into face-local cm but not into face-local
        // AXES: dx/dz below stay on the model's axes, which `g.rotation` holds
        // about 1° off the face's (pantoscopic tilt about X, a whisker of ry).
        // That is under 2% of the lateral term and well inside the landmark
        // noise this is solving against, so it is left alone rather than
        // re-deriving the tip through the rotation every frame.

        // Target: the side of the head, on the same signed axis as the hinge.
        const targetX =
          side === 'left' ? -(headHalfWidth + HEAD_CLEARANCE_CM) : headHalfWidth + HEAD_CLEARANCE_CM;
        return solveSplayRad(side, hingeFace.x, k * tipLocal.x, k * tipLocal.z, targetX);
      };

      const solvedLeft = solve('left', built.leftPivot, built.leftArmTip, heldLeft);
      const solvedRight = solve('right', built.rightPivot, built.rightArmTip, heldRight);
      // Both or neither: one solved arm beside one authored arm would read as a
      // crooked frame rather than as a fitted one.
      if (solvedLeft !== null && solvedRight !== null) {
        const lo = AUTO_SPLAY_MIN_DEG * DEG2RAD;
        const hi = AUTO_SPLAY_MAX_DEG * DEG2RAD;
        splayLeft = Math.min(Math.max(solvedLeft, lo), hi);
        splayRight = Math.min(Math.max(solvedRight, lo), hi);
      }
    }

    // Lerp toward the target so a re-measurement opens the arms rather than
    // snapping them; the first solve is taken as-is so nothing swings in from
    // the authored angle on the opening frame.
    const prev = splayRef.current;
    const applied = prev ?? { left: splayLeft, right: splayRight };
    if (prev) {
      prev.left += (splayLeft - prev.left) * SPLAY_SMOOTH;
      prev.right += (splayRight - prev.right) * SPLAY_SMOOTH;
    } else {
      splayRef.current = applied;
    }
    if (built.leftPivot) built.leftPivot.rotation.y = applied.left;
    if (built.rightPivot) built.rightPivot.rotation.y = -applied.right;

    // ── Far-side arm detection (see FAR_ARM_HIDE_DEPTH_CM) ───────────────────
    if (built.leftPivot && built.rightPivot) {
      // The hinges hang off `g`, whose transform was just written above, so the
      // world matrices are a frame stale without this refresh.
      g.updateMatrixWorld(true);
      // Camera space looks down −Z: the more negative hinge is the further one.
      const zLeft = built.leftPivot
        .getWorldPosition(hingeWorld)
        .applyMatrix4(camera.matrixWorldInverse).z;
      const zRight = built.rightPivot
        .getWorldPosition(hingeWorld)
        .applyMatrix4(camera.matrixWorldInverse).z;
      const depthGap = zLeft - zRight;
      const gap = abs(depthGap);

      if (gap > FAR_ARM_HIDE_DEPTH_CM) {
        farArmSideRef.current = depthGap < 0 ? 'left' : 'right';
      } else if (gap < FAR_ARM_SHOW_DEPTH_CM) {
        farArmSideRef.current = null;
      }
      // Between the two thresholds the previous decision simply stands.
    } else {
      farArmSideRef.current = null; // no hinges detected → nothing to fade
    }

    // Temple-arms render mode + far-side treatment. The far arm is FADED rather
    // than dropped, so the frame still reads as a complete pair from an angle;
    // the fade material keeps depthTest on, so the head occluder clips whatever
    // would otherwise run across the cheek.
    const farSide = farArmSideRef.current;
    const armsHidden = s.templeArmsMode === 'hidden';
    for (const a of built.armMeshes) {
      a.mesh.visible = !armsHidden;
      if (armsHidden) continue;
      const next = s.templeArmsMode === 'fade' || a.side === farSide ? a.fade : a.original;
      // Reassigning every frame would thrash three's material cache.
      if (a.mesh.material !== next) a.mesh.material = next;
    }

  });

  return <primitive object={built.group} />;
}
