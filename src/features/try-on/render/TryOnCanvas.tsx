/**
 * TryOnCanvas — the transparent GL view laid over the camera preview.
 *
 * Camera matching (the website's CameraRig + cover-box, done natively):
 *   PerspectiveCamera(fov 63 VERTICAL, near 1, far 10000 cm), aspect = the
 *   ANALYSED FRAME's aspect. The frame is cover-fitted to the screen exactly
 *   like the preview (resizeMode 'cover'); instead of rendering an oversized
 *   cover box and cropping it, `setViewOffset` renders only the visible window
 *   of that same frustum — the same pixels, ~40% less fill on a tall phone.
 *
 * Rendering is on demand: a frame is drawn only when the tracker produced a
 * new result (or the model / layout changed), so the JS thread draws at the
 * camera rate instead of the display rate.
 *
 * Mirroring is NOT done here: the screen mirrors preview + this view together,
 * once, on a wrapper (see TryOnScreen).
 */

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Scene from './Scene';
import { TrackingContext } from './tracking';
import type { FaceTracking } from '../useFaceTracking';
import { coverGeometry } from '../core/coverGeometry';

export { coverGeometry };

export const FOV_Y_DEG = 63;
export const NEAR_CM = 1;
export const FAR_CM = 10000;

/** How long the face must be missing before the UI shows "position your face". */
const FACE_LOST_GRACE_MS = 400;

export interface GlSnapshot {
  uri: string;
  width: number;
  height: number;
}

export interface TryOnCanvasHandle {
  /** Render the current pose and save the GL view as a PNG (drawing-buffer size). */
  snapshot(): Promise<GlSnapshot>;
}

interface Props {
  tracking: FaceTracking;
  gltf: GLTF | null;
  /** Layout size of the view, in points. */
  width: number;
  height: number;
  onFace?: (detected: boolean) => void;
  onFirstFit?: () => void;
  onGlbEmpty?: () => void;
}

/** Keeps the camera on the analysed frame's frustum, cropped like the preview. */
function CameraRig({ tracking, width, height }: { tracking: FaceTracking; width: number; height: number }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera & { manual?: boolean };
  const invalidate = useThree(s => s.invalidate);
  const applied = useRef<string>('');

  useEffect(() => {
    camera.manual = true;
    camera.fov = FOV_Y_DEG;
    camera.near = NEAR_CM;
    camera.far = FAR_CM;
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  // The frame aspect is only known once the first frame was analysed, and can
  // change if the session renegotiates, so it is re-checked every tick (cheap).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const aspect = tracking.frameAspectRef.current ?? 3 / 4;
      const key = `${aspect.toFixed(4)}:${width}x${height}`;
      if (key === applied.current || width <= 0 || height <= 0) return;
      applied.current = key;
      const g = coverGeometry(width, height, aspect);
      // setViewOffset sets camera.aspect = coverWidth / coverHeight = aspect.
      camera.setViewOffset(g.coverWidth, g.coverHeight, g.viewX, g.viewY, g.viewWidth, g.viewHeight);
      camera.updateProjectionMatrix();
      invalidate();
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [camera, tracking, width, height, invalidate]);
  return null;
}

/**
 * Pulls the latest tracking result once per display frame and draws only when
 * it is new. Also reports face found/lost (lost after a short grace, so one
 * dropped detection does not flash the hint) and the first fitted frame.
 */
function Driver({
  tracking,
  hasModel,
  onFace,
  onFirstFit,
}: {
  tracking: FaceTracking;
  hasModel: boolean;
  onFace?: (detected: boolean) => void;
  onFirstFit?: () => void;
}) {
  const invalidate = useThree(s => s.invalidate);
  const cb = useRef({ onFace, onFirstFit });
  cb.current = { onFace, onFirstFit };
  const hasModelRef = useRef(hasModel);
  hasModelRef.current = hasModel;

  useEffect(() => {
    invalidate();
  }, [hasModel, invalidate]);

  useEffect(() => {
    let raf = 0;
    let lastSent: boolean | null = null;
    let lostSince: number | null = null;
    let firstFitSent = false;
    let renders = 0;
    let statsAt = Date.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!tracking.poll()) return;
      invalidate();
      renders++;

      const detected = tracking.detectedRef.current;
      const now = Date.now();
      if (detected) {
        lostSince = null;
        if (!firstFitSent && hasModelRef.current) {
          firstFitSent = true;
          cb.current.onFirstFit?.();
        }
        if (lastSent !== true) {
          lastSent = true;
          cb.current.onFace?.(true);
        }
      } else {
        lostSince ??= now;
        if (lastSent !== false && now - lostSince > FACE_LOST_GRACE_MS) {
          lastSent = false;
          cb.current.onFace?.(false);
        }
      }

      if (__DEV__ && now - statsAt >= 1000) {
        const s = tracking.stats();
        console.log(
          `[TryOn] delegate=${s.delegate} inference=${s.inferenceMs}ms ` +
            `detectionFps=${s.detectionFps} renderFps=${Math.round((renders * 1000) / (now - statsAt))}`,
        );
        renders = 0;
        statsAt = now;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [tracking, invalidate]);
  return null;
}

/** Exposes a snapshot function bound to this canvas's renderer. */
const SnapshotBridge = forwardRef<TryOnCanvasHandle>((_, ref) => {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  const camera = useThree(s => s.camera);
  useImperativeHandle(
    ref,
    () => ({
      async snapshot() {
        // Draw the current pose now, then read that exact frame back.
        gl.render(scene, camera);
        const shot = await GLView.takeSnapshotAsync(gl.getContext() as never, {
          format: 'png',
          compress: 1,
        });
        return { uri: String(shot.localUri ?? shot.uri), width: shot.width, height: shot.height };
      },
    }),
    [gl, scene, camera],
  );
  return null;
});

const TryOnCanvas = forwardRef<TryOnCanvasHandle, Props>(
  ({ tracking, gltf, width, height, onFace, onFirstFit, onGlbEmpty }, ref) => {
    const trackingValue = React.useMemo(
      () => ({
        matrixRef: tracking.matrixRef,
        landmarksRef: tracking.landmarksRef,
        detectedRef: tracking.detectedRef,
      }),
      [tracking.matrixRef, tracking.landmarksRef, tracking.detectedRef],
    );

    return (
      <Canvas
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: FOV_Y_DEG, near: NEAR_CM, far: FAR_CM, position: [0, 0, 0] }}
        onCreated={({ gl }) => {
          // expo-gl has no renderbufferStorageMultisample, and three renders
          // any KHR_materials_transmission material into a 4-sample target
          // that it then resolves with blitFramebuffer. Back that target with
          // a plain single-sample renderbuffer. (buildGlasses now turns the
          // catalog's transmissive frame parts into plain translucency, so
          // this is a safety net for a model that still reaches that path.)
          type Storage = (target: number, format: number, w: number, h: number) => void;
          const ctx = gl.getContext() as unknown as {
            renderbufferStorage: Storage;
            renderbufferStorageMultisample: (t: number, samples: number, f: number, w: number, h: number) => void;
          };
          ctx.renderbufferStorageMultisample = (target, _samples, format, w, h) =>
            ctx.renderbufferStorage(target, format, w, h);
          gl.localClippingEnabled = true; // the occluder's front-cut plane
          gl.setClearColor(0x000000, 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <CameraRig tracking={tracking} width={width} height={height} />
        <TrackingContext.Provider value={trackingValue}>
          <Driver tracking={tracking} hasModel={gltf != null} onFace={onFace} onFirstFit={onFirstFit} />
          <SnapshotBridge ref={ref} />
          <Scene gltf={gltf} onGlbEmpty={onGlbEmpty} />
        </TrackingContext.Provider>
      </Canvas>
    );
  },
);

export default TryOnCanvas;
