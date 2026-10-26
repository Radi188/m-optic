/**
 * buildGlasses.ts — shared, framework-agnostic Three.js build helpers for the
 * VTO, used by the R3F (/try-on) renderer. These are PORTED VERBATIM from the
 * imperative VirtualTryOn.tsx so behaviour is identical; the imperative version
 * keeps its own copies so the working build is untouched.
 *
 * Everything here is pure Three.js object construction (no React). The live
 * per-frame calibration (position/rotation/scale, temple splay, occluder fit,
 * front-cut clip) is applied by the R3F components in useFrame — these helpers
 * only build the static structure.
 *
 * Units are CENTIMETRES (MediaPipe metric space).
 */

import * as THREE from 'three';
const { max } = Math;
import { OCCLUDER_CONFIG } from '../../../src/features/try-on/core/frames';

// ── Constants (identical to VirtualTryOn.tsx) ───────────────────────────────

/** Normalise the glasses FRONT width to a human frame width (~14.5 cm). */
export const TARGET_FRAME_WIDTH_CM = 14.5;
/** Bake-on base orientation (frame faces +Z, up +Y). */
export const MODEL_BASE_ROTATION: [number, number, number] = [0, 0, 0];
/** Default temple splay (degrees) when a frame doesn't specify one. */
export const DEFAULT_TEMPLE_SPLAY_DEG = 10;
/** Temple-arm name matcher. */
const TEMPLE_NAME_RE = /temple|arm|leg|branch/i;
/** Lens mesh name matcher. */
const LENS_NAME_RE = /lens|lense/i;
/**
 * Face-on opacity of a clear lens. Deliberately very low — looking straight
 * through a lens you see the eye, not the glass. What makes it READ as glass is
 * the Fresnel term below, not this.
 */
const LENS_BASE_OPACITY = 0.1;
/** Extra opacity at full grazing angle, where real glass turns mirror-like. */
const LENS_FRESNEL_GAIN = 0.8;
/** Fresnel falloff exponent. ~3 lands close to the Schlick approximation. */
const LENS_FRESNEL_POWER = 3.0;

/**
 * Build a glass material for a lens mesh, seeded from what the artist authored.
 *
 * Colour and texture are carried over, so a brown, mirrored or gradient lens
 * still looks like itself; everything that makes it read as GLASS is added here.
 *
 * Why not `transmission` (three's real refraction)? The wearer's face is an HTML
 * <video> sitting BEHIND the canvas, not an object in the scene — so there is
 * nothing in the 3D world for a transmissive lens to refract, and it would
 * sample the empty transparent background instead. Alpha over the video is the
 * only way the eyes show through in this compositing model.
 *
 * That leaves FRESNEL as the thing that sells it. Real glass is nearly invisible
 * head-on and turns mirror-like at grazing angles; flat alpha is what makes a
 * lens look like a sticker. The shader patch below raises alpha towards opaque
 * as the surface turns away from the viewer, so the lens edge and the curve near
 * the rim catch the environment while the centre stays clear.
 *
 * Cloning matters: GLTFLoader hands the same material instance to every mesh
 * that shares it, so mutating in place could wreck the frame along with the lens.
 */
function makeLensMaterial(src: THREE.Material): THREE.Material {
  const authored = src as THREE.MeshStandardMaterial;

  const m = new THREE.MeshPhysicalMaterial({
    color: authored.color?.clone() ?? new THREE.Color(0xffffff),
    map: authored.map ?? null,
    transparent: true,
    opacity: LENS_BASE_OPACITY,
    // Polished, not metal: reflections come from the environment map, which the
    // try-on feeds from the live camera, so they match the wearer's real room.
    roughness: 0.04,
    metalness: 0,
    ior: 1.52, // crown glass / CR-39
    envMapIntensity: 1.4,
    // A second specular lobe over the top — this is the bright glint that reads
    // as a coated lens rather than a sheet of acetate.
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
    // Transparent surfaces must not write depth, or the lens punches a hole in
    // whatever is drawn behind it depending on order.
    depthWrite: false,
  });

  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // Schlick-style Fresnel: 0 looking straight through, 1 at grazing angles.
      float lensFresnel = pow(
        1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0),
        ${LENS_FRESNEL_POWER.toFixed(1)}
      );
      gl_FragColor.a = clamp(
        gl_FragColor.a + lensFresnel * ${LENS_FRESNEL_GAIN.toFixed(2)},
        0.0,
        1.0
      );
      #include <dithering_fragment>`,
    );
  };
  m.needsUpdate = true;
  return m;
}
/**
 * Explicit artist-authored bridge contact locator, if a GLB provides one — the
 * only way to stop guessing. Matched loosely on purpose: catalog models follow a
 * `Temple_L_Locator_GRP` style, so a bridge locator arrives as
 * `Bridge_Locator_GRP` rather than a bare `bridge_locator`.
 */
const BRIDGE_LOCATOR_RE = /bridge[_\s-]?locator/i;
/**
 * Meshes that must not drive the bridge-contact search.
 *
 * Beyond the obvious (lenses, temples) this excludes the hardware that FOLLOWS
 * THE LENS OUTLINE rather than touching the face: eyerims, and the nylon cord a
 * rimless frame suspends its lenses from. Measured on a real catalog model, the
 * inner end of `Nylon_Bot_*` reaches into the central search band and sits ~2.9 cm
 * BELOW the actual bridge — so it won the "lowest central point" test and seated
 * the whole frame down over the cheeks. Nose pads are deliberately NOT excluded:
 * they are what genuinely rests on the nose.
 */
const NON_FRAME_NAME_RE = /lens|lense|glass|temple|arm|leg|branch|nylon|eyerim|rim|shadow/i;
/**
 * Distance behind the frontmost rim (cm) for the rotation/seating pivot — the
 * nose-bridge contact point, so pantoscopic tilt and seating depth stay
 * independent.
 */
export const BRIDGE_CONTACT_INSET_CM = 1.0;

// ── Temple splay detection + hinge pivots ───────────────────────────────────

export interface TempleSetup {
  left: THREE.Object3D | null;
  right: THREE.Object3D | null;
  leftName: string;
  rightName: string;
}

function isAncestorOf(ancestor: THREE.Object3D, node: THREE.Object3D): boolean {
  let p = node.parent;
  while (p) {
    if (p === ancestor) return true;
    p = p.parent;
  }
  return false;
}

/**
 * Detect the two temple-arm objects and wrap each in a hinge pivot Group so they
 * can be splayed about +Y (glTF up) without detaching from the front. Two-tier:
 * by name, else geometric fallback (parts reaching furthest back with opposite
 * centroid X). MODEL-LOCAL space; call before shifting the model.
 */
export function setupTempleSplay(model: THREE.Object3D): TempleSetup {
  const none: TempleSetup = { left: null, right: null, leftName: '—', rightName: '—' };

  const matched: THREE.Object3D[] = [];
  model.traverse((node) => {
    if (node === model) return;
    if (TEMPLE_NAME_RE.test(node.name || '')) matched.push(node);
  });
  const namedTops = matched.filter(
    (m) => !matched.some((o) => o !== m && isAncestorOf(o, m)),
  );

  const boxOf = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
  const centroidX = (b: THREE.Box3) => (b.min.x + b.max.x) / 2;

  let pool: THREE.Object3D[];
  let via: 'name' | 'geometry';

  if (namedTops.length >= 2) {
    pool = namedTops;
    via = 'name';
  } else {
    let container = model;
    while (container.children.length === 1 && container.children[0].children.length > 0) {
      container = container.children[0];
    }
    const parts = container.children.filter((c) => {
      let hasMesh = false;
      c.traverse((n) => {
        if ((n as THREE.Mesh).isMesh) hasMesh = true;
      });
      return hasMesh;
    });
    const modelBox = boxOf(model);
    const frontZ = modelBox.max.z;
    const depth = max(modelBox.max.z - modelBox.min.z, 1e-6);
    pool = parts.filter((p) => boxOf(p).min.z < frontZ - 0.3 * depth);
    via = 'geometry';
  }

  if (pool.length < 2) {
    console.warn(
      `[VTO] Temple arms not identified (${via}); splay disabled. Candidates:`,
      pool.map((p) => p.name || '(unnamed)'),
    );
    return none;
  }

  const entries = pool
    .map((o) => ({ o, box: boxOf(o) }))
    .map((e) => ({ ...e, cx: centroidX(e.box) }))
    .sort((a, b) => a.cx - b.cx);
  const leftEntry = entries[0];
  const rightEntry = entries[entries.length - 1];

  if (leftEntry.cx >= 0 || rightEntry.cx <= 0) {
    console.warn('[VTO] Temple arm candidates not on opposite sides; splay disabled.');
    return none;
  }

  const makePivot = (entry: { o: THREE.Object3D; box: THREE.Box3 }, side: 'left' | 'right') => {
    const outerX = side === 'right' ? entry.box.max.x : entry.box.min.x;
    const frontZ = entry.box.max.z;
    const cy = (entry.box.min.y + entry.box.max.y) / 2;
    const hingeWorld = new THREE.Vector3(outerX, cy, frontZ);
    const pivot = new THREE.Group();
    pivot.name = `templePivot_${side}`;
    pivot.matrixAutoUpdate = true;
    model.add(pivot);
    model.updateMatrixWorld(true);
    pivot.position.copy(model.worldToLocal(hingeWorld.clone()));
    model.updateMatrixWorld(true);
    pivot.attach(entry.o);
    return pivot;
  };

  const left = makePivot(leftEntry, 'left');
  const right = makePivot(rightEntry, 'right');
  console.log(
    `[VTO] Temple arms via ${via} — left:"${leftEntry.o.name || '(unnamed)'}" right:"${rightEntry.o.name || '(unnamed)'}"`,
  );
  return {
    left,
    right,
    leftName: leftEntry.o.name || '(unnamed)',
    rightName: rightEntry.o.name || '(unnamed)',
  };
}

// ── Temple-arm render modes (full / fade / hidden) ──────────────────────────

/**
 * Fade window along the arm (0 = hinge, 1 = tip): opacity is full up to START,
 * then ramps to 0 by END. Lower values = arms fade out sooner / more.
 */
const ARM_FADE_START = 0.05;
const ARM_FADE_END = 0.6;

/** One temple-arm mesh with its original + fade materials, switched at runtime. */
export interface ArmMesh {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
  fade: THREE.Material | THREE.Material[];
  /** Which hinge this mesh hangs off — lets the renderer fade the far-side arm. */
  side: 'left' | 'right';
}

/**
 * Clone a material and patch it to ramp alpha to 0 along the arm using the
 * per-vertex `aArmFade` attribute (0 at the hinge → 1 at the tip).
 */
function makeFadeMaterial(src: THREE.Material): THREE.Material {
  const m = src.clone();
  m.transparent = true;
  m.depthWrite = false;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aArmFade;\nvarying float vArmFade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArmFade = aArmFade;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vArmFade;')
      .replace(
        '#include <dithering_fragment>',
        `gl_FragColor.a *= 1.0 - smoothstep(${ARM_FADE_START.toFixed(2)}, ${ARM_FADE_END.toFixed(2)}, vArmFade);\n#include <dithering_fragment>`,
      );
  };
  m.needsUpdate = true;
  return m;
}

/** A prepared temple arm: its meshes, plus the tip the auto-splay solves for. */
interface PreparedArm {
  meshes: ArmMesh[];
  /**
   * The arm's far end in PIVOT-LOCAL space — the vertex furthest from the hinge.
   * Pivot-local means it is unaffected by the model's outer transform AND by the
   * live splay rotation, so it is a constant of the model: exactly what the
   * auto-splay solver needs to work out where the tip lands at a given angle.
   */
  tip: THREE.Vector3;
}

/**
 * Prepare every mesh under a temple pivot: add a normalized `aArmFade` attribute
 * (distance from the hinge ÷ arm length) and create a matching fade material.
 * Pivot-local distances are invariant to the model's outer transform, so this
 * can run right after the hinge pivots are built.
 */
function prepareArm(pivot: THREE.Object3D, side: 'left' | 'right'): PreparedArm {
  pivot.updateMatrixWorld(true);
  const invPivot = pivot.matrixWorld.clone().invert();
  const meshes: THREE.Mesh[] = [];
  pivot.traverse((n) => {
    if ((n as THREE.Mesh).isMesh) meshes.push(n as THREE.Mesh);
  });

  // Pass 1: per-vertex distance from the hinge (pivot origin), track the max.
  const v = new THREE.Vector3();
  const rel = new THREE.Matrix4();
  const distMap = new Map<THREE.Mesh, Float32Array>();
  let maxD = 1e-6;
  const tip = new THREE.Vector3();
  for (const mesh of meshes) {
    rel.multiplyMatrices(invPivot, mesh.matrixWorld);
    const pos = mesh.geometry.getAttribute('position');
    const d = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(rel);
      const len = v.length();
      d[i] = len;
      if (len > maxD) {
        maxD = len;
        tip.copy(v);
      }
    }
    distMap.set(mesh, d);
  }

  // Pass 2: normalize → aArmFade attribute + fade material.
  const out: ArmMesh[] = [];
  for (const mesh of meshes) {
    const d = distMap.get(mesh)!;
    const fade = new Float32Array(d.length);
    for (let i = 0; i < d.length; i++) fade[i] = d[i] / maxD;
    mesh.geometry.setAttribute('aArmFade', new THREE.BufferAttribute(fade, 1));
    const original = mesh.material;
    const fadeMat = Array.isArray(original)
      ? original.map(makeFadeMaterial)
      : makeFadeMaterial(original);
    out.push({ mesh, original, fade: fadeMat, side });
  }
  return { meshes: out, tip };
}

// ── Glasses group build (auto-fit + lens material + splay structure) ─────────

export interface GlassesBuild {
  /** Calibration group — its transform is set live in useFrame from the store. */
  group: THREE.Group;
  leftPivot: THREE.Object3D | null;
  rightPivot: THREE.Object3D | null;
  leftName: string;
  rightName: string;
  /** Bridge contact point in `group` local cm after auto-fit/recentering. */
  bridgePoint: THREE.Vector3;
  /**
   * Centre of the lens meshes in group-local space, or null when none were
   * found. Lets the renderer anchor the frame on the wearer's eyes instead of
   * guessing a nose contact — see ANCHOR MODE in Glasses.tsx.
   */
  lensCenter: THREE.Vector3 | null;
  /** How the bridge contact was derived, surfaced in debug logs. */
  bridgeSource: 'locator' | 'geometry' | 'bbox';
  /** Temple-arm meshes (for full/fade/hidden switching). */
  armMeshes: ArmMesh[];
  /**
   * Each arm's far end in its own PIVOT-LOCAL space (null when that arm was not
   * identified). Read by the auto-splay: with the hinge at the pivot origin,
   * the tip fixes both how far back the arm runs and how far out it already
   * points before any splay is applied. See `solveSplayRad`.
   */
  leftArmTip: THREE.Vector3 | null;
  rightArmTip: THREE.Vector3 | null;
}

interface BridgeContact {
  point: THREE.Vector3;
  source: GlassesBuild['bridgeSource'];
}

/**
 * Find the visual nose-bridge contact in model-local units. A GLB-authored
 * Bridge_Locator wins; otherwise use the lowest central/front frame vertices so
 * the pivot follows the bottom of the bridge rather than the GLB origin.
 */
function computeBridgeContact(model: THREE.Object3D, temple: TempleSetup): BridgeContact {
  model.updateMatrixWorld(true);

  let locator: THREE.Object3D | null = null;
  model.traverse((node) => {
    if (!locator && BRIDGE_LOCATOR_RE.test(node.name || '')) locator = node;
  });
  if (locator) {
    const point = model.worldToLocal((locator as THREE.Object3D).getWorldPosition(new THREE.Vector3()));
    return { point, source: 'locator' };
  }

  const bbox = new THREE.Box3().setFromObject(model);
  const size = bbox.getSize(new THREE.Vector3());
  const width = max(size.x, 1e-6);
  const height = max(size.y, 1e-6);
  const depth = max(size.z, 1e-6);
  const bboxCenterX = (bbox.min.x + bbox.max.x) / 2;
  const bridgeX =
    temple.left && temple.right
      ? (temple.left.position.x + temple.right.position.x) / 2
      : bboxCenterX;
  const centralHalfWidth = width * 0.18;
  const frontMinZ = bbox.max.z - depth * 0.35;

  const vertex = new THREE.Vector3();
  const world = new THREE.Vector3();
  const candidates: THREE.Vector3[] = [];

  model.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    if (NON_FRAME_NAME_RE.test(node.name || '')) return;

    const mesh = node as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) return;

    for (let i = 0; i < pos.count; i++) {
      vertex.fromBufferAttribute(pos, i);
      world.copy(vertex).applyMatrix4(mesh.matrixWorld);
      const local = model.worldToLocal(world.clone());
      if (Math.abs(local.x - bridgeX) <= centralHalfWidth && local.z >= frontMinZ) {
        candidates.push(local);
      }
    }
  });

  if (candidates.length > 0) {
    let minY = Infinity;
    for (const p of candidates) minY = Math.min(minY, p.y);

    const bottomBandY = minY + height * 0.08;
    let frontZ = -Infinity;
    let count = 0;
    for (const p of candidates) {
      if (p.y <= bottomBandY) {
        frontZ = Math.max(frontZ, p.z);
        count++;
      }
    }

    return {
      point: new THREE.Vector3(
        bridgeX,
        minY,
        count > 0 && Number.isFinite(frontZ) ? frontZ : bbox.max.z,
      ),
      source: 'geometry',
    };
  }

  const insetModel = BRIDGE_CONTACT_INSET_CM / (TARGET_FRAME_WIDTH_CM / width);
  return {
    point: new THREE.Vector3(bridgeX, (bbox.min.y + bbox.max.y) / 2, bbox.max.z - insetModel),
    source: 'bbox',
  };
}

/**
 * Build the calibration group from a (cloned) GLB scene: temple hinge pivots,
 * bridge-contact re-centre, width normalisation to cm, lens material, render
 * order. Does NOT apply the live calibration transform.
 */
export function buildGlassesGroup(modelScene: THREE.Object3D): GlassesBuild {
  const model = modelScene;
  model.rotation.set(MODEL_BASE_ROTATION[0], MODEL_BASE_ROTATION[1], MODEL_BASE_ROTATION[2]);
  model.updateMatrixWorld(true);

  const temple = setupTempleSplay(model);
  model.updateMatrixWorld(true);

  // Prepare the temple arms for full/fade/hidden switching (fade attribute +
  // material). Done now while pivot-local distances are easy to derive.
  const armMeshes: ArmMesh[] = [];
  const leftArm = temple.left ? prepareArm(temple.left, 'left') : null;
  const rightArm = temple.right ? prepareArm(temple.right, 'right') : null;
  if (leftArm) armMeshes.push(...leftArm.meshes);
  if (rightArm) armMeshes.push(...rightArm.meshes);

  const bbox = new THREE.Box3().setFromObject(model);
  const size = bbox.getSize(new THREE.Vector3());
  const frameWidth = max(size.x, 1e-6);
  const autoScale = TARGET_FRAME_WIDTH_CM / frameWidth;

  const bridgeContact = computeBridgeContact(model, temple);
  const bridge = bridgeContact.point;
  model.position.sub(bridge);

  const pivotGroup = new THREE.Group();
  pivotGroup.scale.setScalar(autoScale);
  pivotGroup.add(model);

  const group = new THREE.Group();
  group.add(pivotGroup);

  // Render order (glasses draw AFTER the occluder) + lens see-through pass.
  //
  // The GLB's OWN materials are kept. An earlier version REPLACED any mesh named
  // "lens"/"lense" with one hardcoded glass material, so every product rendered
  // the same blue-grey tint no matter what it actually is. Colour, texture,
  // roughness and metalness now all come from the model.
  //
  // Lens meshes are the exception, and only because a try-on needs something the
  // product shot never did: to be looked THROUGH. Their material is rebuilt as
  // glass by makeLensMaterial(), seeded from the authored colour and texture.
  const lensMeshes: THREE.Mesh[] = [];
  model.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    const mesh = node as THREE.Mesh;
    mesh.renderOrder = 1;
    if (!LENS_NAME_RE.test(mesh.name)) return;
    lensMeshes.push(mesh);
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(makeLensMaterial)
      : makeLensMaterial(mesh.material);
  });

  // Lens centre, measured AFTER the model has been re-centred and scaled so the
  // value is already in the group's local space — the same space the live
  // transform works in. Both lenses together, so it lands on the centre line.
  let lensCenter: THREE.Vector3 | null = null;
  if (lensMeshes.length > 0) {
    group.updateMatrixWorld(true);
    const lensBox = new THREE.Box3();
    for (const m of lensMeshes) lensBox.expandByObject(m);
    if (!lensBox.isEmpty()) lensCenter = lensBox.getCenter(new THREE.Vector3());
  }

  return {
    group,
    leftPivot: temple.left,
    rightPivot: temple.right,
    leftName: temple.leftName,
    rightName: temple.rightName,
    bridgePoint: new THREE.Vector3(0, 0, 0),
    lensCenter,
    bridgeSource: bridgeContact.source,
    armMeshes,
    leftArmTip: leftArm?.tip ?? null,
    rightArmTip: rightArm?.tip ?? null,
  };
}

// ── Occluder build ──────────────────────────────────────────────────────────

export interface OccluderBuild {
  /** Root group (front shell + side shells), child of the matrix-driven face group. */
  root: THREE.Group;
  /** Shared depth-only material (front-cut clip plane attached). */
  material: THREE.MeshBasicMaterial;
  /** World-space front-cut plane, re-derived from the head pose each frame. */
  clipPlane: THREE.Plane;
  /** Front shell group (scale/zDepth applied live). */
  frontRoot: THREE.Group;
  /** Side shells group (scale/zDepth applied live). */
  sideGroup: THREE.Group;
  leftSide: THREE.Mesh;
  rightSide: THREE.Mesh;
}

/** Procedural ellipsoid head used when no occluder.glb is present. */
export function buildProceduralOccluder(mat: THREE.MeshBasicMaterial): THREE.Group {
  const group = new THREE.Group();
  group.name = 'proceduralOccluder';
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat);
  head.scale.set(8, 11, 10);
  head.position.set(0, -2, -7);
  head.renderOrder = 0;
  group.add(head);
  return group;
}

/**
 * Build the occluder structure: shared depth-only material with the front-cut
 * clip plane, an (empty) front shell group to be filled with the GLB or
 * procedural head, and the two side/ear shells. The caller fills frontRoot and
 * applies the live fit in useFrame.
 */
export function buildOccluder(): OccluderBuild {
  // DoubleSide: the face-mesh shell's winding comes from MediaPipe's tesselation
  // and is flipped again by the y-down→y-up deprojection, so backface culling
  // would silently drop its depth writes. The closed shells don't care.
  const material = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  material.depthWrite = true;
  material.depthTest = true;
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 1;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), OCCLUDER_CONFIG.frontCutZ);
  material.clippingPlanes = [clipPlane];
  material.clipShadows = false;

  const frontRoot = new THREE.Group();
  frontRoot.name = 'occluderFront';

  // Side/ear shells (shared material → depth-only + front-cut clip → never cover
  // the front frame; only z<=frontCutZ survives).
  const sideGeo = new THREE.SphereGeometry(1, 16, 12);
  const makeSide = (sign: 1 | -1) => {
    const m = new THREE.Mesh(sideGeo, material);
    m.renderOrder = 0;
    m.position.set(sign * OCCLUDER_CONFIG.sideX, OCCLUDER_CONFIG.sideY, OCCLUDER_CONFIG.sideZ);
    m.scale.set(OCCLUDER_CONFIG.sideThickness, OCCLUDER_CONFIG.sideHeight, OCCLUDER_CONFIG.sideBack);
    return m;
  };
  const rightSide = makeSide(1);
  const leftSide = makeSide(-1);
  const sideGroup = new THREE.Group();
  sideGroup.name = 'sideOccluders';
  sideGroup.add(rightSide, leftSide);

  const root = new THREE.Group();
  root.name = 'occluder';
  root.add(frontRoot, sideGroup);

  return { root, material, clipPlane, frontRoot, sideGroup, leftSide, rightSide };
}

/** Fixed X half-thickness of the side shells (cm). */
export const SIDE_THICKNESS = OCCLUDER_CONFIG.sideThickness;
