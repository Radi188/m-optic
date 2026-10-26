
/**
 * Occluder — depth-only head occluder, matrix-driven (child of the face group).
 *
 * Structure (depth-only materials; the shells clip at a front-cut plane, the
 * face mesh sinks under the skin along the view ray instead — no geometry lost,
 * no drift off the face when the head turns):
 *   • face mesh — the wearer's OWN 468 tracked landmarks, triangulated. Used
 *     whenever tracking is live; this is what actually keeps a temple arm off
 *     the cheek, since it follows the real face rather than approximating it.
 *   • front shell — the authored /mediapipe/occluder.glb if present, else a
 *     procedural ellipsoid head (loaded imperatively so the absent-file case can
 *     fall back gracefully; drei useGLTF can't fall back when the file 404s).
 *     Only drawn while the face mesh is unavailable, so the two never fight.
 *   • two side/ear shells — cover the temple→ear zones at head width, past
 *     where the face mesh ends.
 *
 * Every frame, useFrame:
 *   • applies the live occluder fit (scale, under-skin Z, side dims) from the store,
 *   • re-derives the world-space front-cut plane from the head-pose matrix so it
 *     follows yaw/pitch/roll (keeps only z<=frontCutZ → front frame never covered),
 *   • toggles the debug wireframe (Show occluder).
 *
 * colorWrite:false + depthWrite + renderOrder 0 (below glasses' 1).
 */

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildOccluder,
  buildProceduralOccluder,
  SIDE_THICKNESS,
} from '../vto/buildGlasses';
import { createFaceMeshOccluder } from '../vto/faceMeshOccluder';
import { OCCLUDER_CONFIG } from '../../../src/features/try-on/core/frames';
import { useVtoStore } from '../store';
import { useTracking } from './tracking-context';

export default function Occluder() {
  const { matrixRef, landmarksRef } = useTracking();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const built = useMemo(() => buildOccluder(), []);
  const poseMat = useMemo(() => new THREE.Matrix4(), []);

  // The tracked face shell gets its OWN material clone rather than sharing the
  // shells': it takes NO clip plane (faceMesh.update sinks it under the skin
  // along the view ray instead, which loses no geometry and survives yaw) and a
  // stronger depth bias, so the frame front always wins where it rests on skin.
  const faceMat = useMemo(() => {
    const m = built.material.clone();
    m.clippingPlanes = null;
    m.polygonOffsetFactor = 2;
    m.polygonOffsetUnits = 2;
    return m;
  }, [built]);
  useEffect(() => () => faceMat.dispose(), [faceMat]);

  const faceMesh = useMemo(() => createFaceMeshOccluder(faceMat), [faceMat]);
  useEffect(() => {
    built.root.add(faceMesh.mesh);
    return () => {
      built.root.remove(faceMesh.mesh);
      faceMesh.dispose();
    };
  }, [built, faceMesh]);

  // Fill the front shell: try the authored GLB, else procedural head.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      try {
        const gltf = await new GLTFLoader().loadAsync(OCCLUDER_CONFIG.glbPath);
        if (cancelled) return;
        gltf.scene.traverse((node) => {
          if (!(node as THREE.Mesh).isMesh) return;
          const mesh = node as THREE.Mesh;
          mesh.material = built.material;
          mesh.renderOrder = 0;
        });
        built.frontRoot.add(gltf.scene);
      } catch {
        if (cancelled) return;
        built.frontRoot.add(buildProceduralOccluder(built.material));
        console.info('[VTO] occluder.glb not found — using procedural head occluder.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [built]);

  useFrame(() => {
    const { occ, showOccluder, faceMeshSinkCm, showSideShells } = useVtoStore.getState();

    // Face mesh first: it is a child of the face group, so that group is its
    // parent and supplies both the distance and the local space to write into.
    const faceGroup = built.root.parent;
    const hasFaceMesh = faceGroup
      ? faceMesh.update(landmarksRef.current, faceGroup, camera, faceMeshSinkCm)
      : false;
    // Hiding the group drops them from the depth pass too, not just from view —
    // which is the point: it shows what the face mesh occludes on its own.
    built.sideGroup.visible = showSideShells;
    faceMesh.mesh.visible = hasFaceMesh;
    // The ellipsoid is the fallback only — drawing both would let the coarser
    // shell write depth in front of the real face and re-create the artefact.
    built.frontRoot.visible = !hasFaceMesh;

    // Front shell + side group: overall scale & under-skin depth.
    built.frontRoot.scale.setScalar(occ.scale);
    built.frontRoot.position.z = occ.zDepth;
    built.sideGroup.scale.setScalar(occ.scale);
    built.sideGroup.position.z = occ.zDepth;

    // Side shells: head half-width (X), back extent (Z), vertical size (Y).
    built.rightSide.position.x = occ.sideX;
    built.rightSide.scale.set(SIDE_THICKNESS, occ.sideHeight, occ.sideBack);
    built.leftSide.position.x = -occ.sideX;
    built.leftSide.scale.set(SIDE_THICKNESS, occ.sideHeight, occ.sideBack);

    // Front-cut plane for the SHELLS from the head pose (face group is at the
    // scene root, so the pose matrix IS its world matrix). Keeps them where
    // face-local z <= frontCutZ, so the coarse ellipsoid never covers the frame.
    // The face mesh needs no plane — it is sunk under the skin in update().
    const m = matrixRef.current;
    if (m && m.length === 16) {
      poseMat.fromArray(m);
      built.clipPlane.normal.set(0, 0, -1);
      built.clipPlane.constant = occ.frontCutZ;
      built.clipPlane.applyMatrix4(poseMat);
    }

    // Debug: visible green wireframe vs invisible depth-only.
    const mat = built.material;
    mat.colorWrite = showOccluder;
    mat.wireframe = showOccluder;
    mat.transparent = showOccluder;
    mat.opacity = showOccluder ? 0.4 : 1;
    mat.depthWrite = !showOccluder;
    mat.depthTest = !showOccluder;
    mat.color.set(showOccluder ? 0x00ff88 : 0xffffff);

    // Mirror the debug state onto the clone so "Show occluder" reveals BOTH the
    // shells and the tracked face mesh. Both are green; the face mesh takes pure
    // green against the shells' spring green, so the two stay distinguishable
    // where they overlap at the temples.
    const fm = faceMesh.mesh.material as THREE.MeshBasicMaterial;
    fm.colorWrite = showOccluder;
    fm.wireframe = showOccluder;
    fm.transparent = showOccluder;
    fm.opacity = showOccluder ? 0.4 : 1;
    fm.depthWrite = !showOccluder;
    fm.depthTest = !showOccluder;
    fm.color.set(showOccluder ? 0x00ff00 : 0xffffff);
  });

  return <primitive object={built.root} />;
}
