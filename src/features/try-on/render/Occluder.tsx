/**
 * Occluder — depth-only head occluder, matrix-driven (child of the face
 * group). Ported from the website (src/components/r3f/Occluder.tsx):
 *
 *   • face mesh — the wearer's own 468 tracked landmarks, triangulated, sunk
 *     under the skin along each view ray. Used whenever tracking is live.
 *   • front shell — the procedural ellipsoid head, only while the face mesh is
 *     unavailable. (The website first tries an authored /mediapipe/occluder.glb
 *     and falls back to this same head when it is missing; the app ships no
 *     occluder.glb, so it goes straight to the fallback.)
 *   • two side/ear shells, clipped at the face-local front-cut plane so they
 *     never cover the frame front.
 *
 * colorWrite:false + depthWrite + renderOrder 0 (below the glasses' 1). The
 * calibration panel's debug wireframe is not ported.
 */

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { buildOccluder, buildProceduralOccluder, SIDE_THICKNESS } from './buildGlasses';
import { createFaceMeshOccluder } from './faceMeshOccluder';
import { useVtoStore } from '../store';
import { useTracking } from './tracking';

export default function Occluder() {
  const { matrixRef, landmarksRef } = useTracking();
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const built = useMemo(() => buildOccluder(), []);
  const poseMat = useMemo(() => new THREE.Matrix4(), []);

  // The face shell gets its own material: no clip plane (it is sunk along the
  // view ray instead) and a stronger depth bias so the frame front wins.
  const faceMat = useMemo(() => {
    const m = built.material.clone();
    m.clippingPlanes = null;
    m.polygonOffsetFactor = 2;
    m.polygonOffsetUnits = 2;
    return m;
  }, [built]);

  const faceMesh = useMemo(() => createFaceMeshOccluder(faceMat), [faceMat]);

  useEffect(() => {
    built.root.add(faceMesh.mesh);
    const head = buildProceduralOccluder(built.material);
    built.frontRoot.add(head);
    return () => {
      built.root.remove(faceMesh.mesh);
      faceMesh.dispose();
      faceMat.dispose();
      head.traverse(o => (o as THREE.Mesh).geometry?.dispose());
      built.leftSide.geometry.dispose();
      built.material.dispose();
    };
  }, [built, faceMesh, faceMat]);

  useFrame(() => {
    const { occ, faceMeshSinkCm, showSideShells } = useVtoStore.getState();

    const faceGroup = built.root.parent;
    const hasFaceMesh = faceGroup
      ? faceMesh.update(landmarksRef.current, faceGroup, camera, faceMeshSinkCm)
      : false;
    built.sideGroup.visible = showSideShells;
    faceMesh.mesh.visible = hasFaceMesh;
    // The ellipsoid is the fallback only — drawing both would let the coarser
    // shell write depth in front of the real face.
    built.frontRoot.visible = !hasFaceMesh;

    built.frontRoot.scale.setScalar(occ.scale);
    built.frontRoot.position.z = occ.zDepth;
    built.sideGroup.scale.setScalar(occ.scale);
    built.sideGroup.position.z = occ.zDepth;

    built.rightSide.position.x = occ.sideX;
    built.rightSide.scale.set(SIDE_THICKNESS, occ.sideHeight, occ.sideBack);
    built.leftSide.position.x = -occ.sideX;
    built.leftSide.scale.set(SIDE_THICKNESS, occ.sideHeight, occ.sideBack);

    // Front-cut plane for the shells from the head pose (the face group is at
    // the scene root, so the pose matrix IS its world matrix).
    const m = matrixRef.current;
    if (m && m.length === 16) {
      poseMat.fromArray(m);
      built.clipPlane.normal.set(0, 0, -1);
      built.clipPlane.constant = occ.frontCutZ;
      built.clipPlane.applyMatrix4(poseMat);
    }
  });

  return <primitive object={built.root} />;
}
