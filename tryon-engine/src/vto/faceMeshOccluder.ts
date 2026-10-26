/**
 * Face-mesh occluder — the depth shell built from the wearer's OWN face.
 *
 * The generic ellipsoid head (buildProceduralOccluder) only approximates where
 * the face is, so temple arms that pass behind the cheek re-emerge drawn across
 * it. MediaPipe already hands us 468 tracked points; triangulating those gives a
 * depth surface that follows the real face, and anything behind it is culled for
 * free by the depth buffer.
 *
 * Shares the occluder's depth-only material (colorWrite:false), but NOT its
 * clip plane. Keeping the frame in front of the shell is done by SINKING the
 * shell along each vertex's own view ray instead — see `sinkCm` below. Both
 * face-local alternatives are wrong here:
 *   • a clip plane slices off the nose tip, the one part of the face that
 *     reaches past it, leaving a hole in the depth shell;
 *   • clamping face-local z instead folds that protrusion flat, but face-local
 *     +z is only the view direction head-on. Under yaw it points sideways, so
 *     the moved vertices slide ACROSS the screen and the shell walks off the
 *     face — exactly the half-covered mesh a turned head showed.
 * Pushing a vertex along its view ray leaves x/z and y/z untouched, so the shell
 * projects onto the same pixels at every pose; only its depth changes.
 */

import * as THREE from 'three';
import { FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

/** Landmarks 0–467 are the mesh proper; 468+ are the iris refinement points. */
export const FACE_MESH_VERTEX_COUNT = 468;

/** Mirrors Glasses.tsx — a landmark can never sit closer than this to the lens. */
const MIN_LANDMARK_DEPTH_CM = 1;

let cachedIndex: Uint16Array | null = null;

/**
 * Triangle indices for the face mesh, derived once from the tesselation.
 *
 * FACE_LANDMARKS_TESSELATION is the triangulation's edge list emitted three
 * edges at a time — (a→b, b→c, c→a) — so every consecutive triple IS one
 * triangle and the `start` of each edge gives a corner. Measured against the
 * shipped table: 2556 edges → 852 triangles, every triple closed, none
 * degenerate. That makes this exact rather than a reconstruction, so the shell
 * has no pinholes for a temple arm to show through.
 */
export function faceMeshIndex(): Uint16Array {
  if (cachedIndex) return cachedIndex;
  const conn = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  const triCount = Math.floor(conn.length / 3);
  const idx = new Uint16Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    idx[t * 3] = conn[t * 3].start;
    idx[t * 3 + 1] = conn[t * 3 + 1].start;
    idx[t * 3 + 2] = conn[t * 3 + 2].start;
  }
  cachedIndex = idx;
  return idx;
}

export interface FaceMeshOccluder {
  mesh: THREE.Mesh;
  /**
   * Deproject the landmarks into the face group's local space and push them into
   * the geometry. Returns false (and leaves the mesh untouched) when the
   * landmarks are missing or too few — the caller should then fall back to the
   * procedural head.
   *
   * `sinkCm` pushes every vertex that far along its view ray, i.e. that far
   * under the skin, so the frame front always wins the depth test where it rests
   * against the face. It changes depth only — never screen position.
   */
  update(
    landmarks: NormalizedLandmark[] | null,
    faceGroup: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    sinkCm: number,
  ): boolean;
  dispose(): void;
}

/**
 * Build the (empty) face-mesh occluder. Vertices are written every frame by
 * `update`; the index buffer is fixed.
 */
export function createFaceMeshOccluder(material: THREE.Material): FaceMeshOccluder {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(FACE_MESH_VERTEX_COUNT * 3);
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attr);
  geometry.setIndex(new THREE.BufferAttribute(faceMeshIndex(), 1));

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'faceMeshOccluder';
  mesh.renderOrder = 0;
  // Positions are rewritten every frame, so a cached bounding volume would be a
  // frame stale and could cull the mesh right when the head moves fastest.
  mesh.frustumCulled = false;
  mesh.visible = false; // until the first successful update

  const scratch = new THREE.Vector3();

  const update: FaceMeshOccluder['update'] = (landmarks, faceGroup, camera, sinkCm) => {
    if (!landmarks || landmarks.length < FACE_MESH_VERTEX_COUNT) return false;

    // Same deprojection as the glasses' bridge anchor, so the shell lands in the
    // exact space the frame is positioned in. Distance comes from the face
    // group's own translation; the FOV converts normalized coords to cm.
    const D = faceGroup.position.length();
    if (!(D > 0)) return false;
    const halfTanY = Math.tan((camera.fov * (Math.PI / 180)) / 2);
    const halfTanX = halfTanY * camera.aspect;
    const zSign = faceGroup.position.z < 0 ? -1 : 1;

    // The sink is added to the deprojection depth BEFORE x/y are derived from it,
    // which is what keeps it a pure view-ray push: x and y scale with the same
    // depth, so the perspective divide gives back the original lm.x / lm.y.
    const sink = Number.isFinite(sinkCm) ? Math.max(0, sinkCm) : 0;

    for (let i = 0; i < FACE_MESH_VERTEX_COUNT; i++) {
      const lm = landmarks[i];
      // MediaPipe z is on the same scale as x (image width), hence halfTanX.
      const depth = Math.max(MIN_LANDMARK_DEPTH_CM, D + (lm.z ?? 0) * 2 * halfTanX * D) + sink;
      scratch.set(
        (lm.x - 0.5) * 2 * halfTanX * depth,
        (0.5 - lm.y) * 2 * halfTanY * depth,
        zSign * depth,
      );
      faceGroup.worldToLocal(scratch);
      positions[i * 3] = scratch.x;
      positions[i * 3 + 1] = scratch.y;
      positions[i * 3 + 2] = scratch.z;
    }

    attr.needsUpdate = true;
    return true;
  };

  return {
    mesh,
    update,
    dispose: () => geometry.dispose(),
  };
}
