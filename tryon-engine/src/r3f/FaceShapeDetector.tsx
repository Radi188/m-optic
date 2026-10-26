
/**
 * FaceShapeDetector — samples the tracked landmarks and reports a face shape.
 *
 * Renders nothing. Lives in the scene purely because that is where the tracking
 * refs and the video-matched camera aspect are available.
 *
 * Sampling stays conservative: measurement is pose-corrected (measureFace
 * un-rotates the outline by the head pose), so mild yaw/pitch no longer skews
 * the widths, but a strongly turned head hides the far side of the face oval
 * behind the nose and the tracker guesses it — hence the frontal gate is
 * relaxed, not removed. Sampling is slow, and the answer is a majority vote, so
 * the badge settles on one shape instead of flickering between neighbours.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  FaceShapeVoter,
  classifyFaceShape,
  measureFace,
  type FaceShape,
} from '../vto/faceShape';
import { useTracking } from './tracking-context';

/** Beyond this the far half of the face oval is inferred rather than seen. */
const FRONTAL_LIMIT_DEG = 20;
/** Sampling interval (ms) — the shape of a face does not change at 60 fps. */
const SAMPLE_MS = 150;

const DEG2RAD = Math.PI / 180;

export default function FaceShapeDetector({
  onDetect,
}: {
  /** Fired only when the winning shape CHANGES (including the first result). */
  onDetect: (shape: FaceShape | null) => void;
}) {
  const { matrixRef, landmarksRef, detectedRef } = useTracking();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const voter = useMemo(() => new FaceShapeVoter(), []);
  const poseMat = useMemo(() => new THREE.Matrix4(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);

  const lastSampleRef = useRef(0);
  const reportedRef = useRef<FaceShape | null>(null);

  // Clear on unmount so a re-opened try-on does not inherit the last face.
  useEffect(() => {
    return () => {
      voter.reset();
      reportedRef.current = null;
    };
  }, [voter]);

  useFrame(() => {
    if (!detectedRef.current) return;

    const now = performance.now();
    if (now - lastSampleRef.current < SAMPLE_MS) return;
    lastSampleRef.current = now;

    const m = matrixRef.current;
    const lms = landmarksRef.current;
    if (!m || m.length !== 16 || !lms) return;

    // Reject anything but a near-frontal pose before measuring.
    poseMat.fromArray(m);
    poseMat.decompose(pos, quat, scl);
    euler.setFromQuaternion(quat);
    const yawDeg = Math.abs(euler.y) / DEG2RAD;
    const pitchDeg = Math.abs(euler.x) / DEG2RAD;
    if (yawDeg > FRONTAL_LIMIT_DEG || pitchDeg > FRONTAL_LIMIT_DEG) return;

    // camera.aspect is pinned to the exact video aspect by CameraRig, which is
    // the frame MediaPipe normalised these landmarks against; poseMat supplies
    // the viewing distance and the rotation measureFace undoes.
    const metrics = measureFace(lms, camera, poseMat);
    if (!metrics) return;

    voter.add(classifyFaceShape(metrics));
    const winner = voter.result();
    if (winner && winner !== reportedRef.current) {
      reportedRef.current = winner;
      onDetect(winner);
    }
  });

  return null;
}
