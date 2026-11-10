/**
 * useFaceTracking — MediaPipe Face Landmarker on the camera's frame-processor
 * thread, exposed to the renderer as the same refs the website's hook
 * publishes (matrix, landmarks, detected).
 *
 *   camera thread   frameOutput.onFrame → landmarker.detect(frame) (native)
 *   JS thread       poll() once per rendered frame → readLatest() into refs
 *
 * Nothing crosses per frame except one ~6 KB buffer copy that the renderer
 * asks for itself; no image data, no React state updates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommonResolutions, useFrameOutput, type Frame } from 'react-native-vision-camera';
import {
  createFaceLandmarker,
  RESULT_LAYOUT as L,
  type FaceLandmarker,
} from 'react-native-moptic-vto';
import type { NormalizedLandmark } from './core/faceShape';
import type { TrackingRefs } from './render/tracking';

export interface TrackingStats {
  delegate: string;
  inferenceMs: number;
  detectionFps: number;
}

export interface FaceTracking extends TrackingRefs {
  /** Pass to <Camera outputs>. */
  frameOutput: ReturnType<typeof useFrameOutput>;
  /** The landmarker is initialised (model loaded, delegate chosen). */
  ready: boolean;
  error: Error | null;
  /** Analysed frame aspect (width / height, upright), once known. */
  frameAspectRef: { current: number | null };
  /**
   * Copy the latest native result into the refs. Returns true when it is a
   * new result (so the renderer knows a frame is worth drawing).
   */
  poll(): boolean;
  /** Rolling numbers for the dev log. */
  stats(): TrackingStats;
}

export function useFaceTracking(active: boolean): FaceTracking {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Create the landmarker off the JS thread while the camera starts.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let created: FaceLandmarker | null = null;
    setError(null);
    createFaceLandmarker()
      .then(lm => {
        created = lm;
        if (cancelled) {
          lm.close();
          lm.dispose();
          return;
        }
        if (__DEV__) console.log(`[VTO] FaceLandmarker delegate: ${lm.delegate}`);
        setLandmarker(lm);
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
      if (created) {
        created.close();
        created.dispose();
      }
      setLandmarker(null);
    };
  }, [active]);

  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      try {
        if (landmarker != null) landmarker.detect(frame);
      } catch (e) {
        console.error(`[VTO] detect failed: ${e}`);
      } finally {
        frame.dispose();
      }
    },
    [landmarker],
  );

  const frameOutput = useFrameOutput({
    // ~480 px inference input (spec: 256–480); the preview stays full-res.
    targetResolution: CommonResolutions.VGA_4_3,
    // MediaPipe takes BGRA (iOS) / RGBA bitmaps (Android).
    pixelFormat: 'rgb',
    // Upright buffers (Android front frames arrive rotated 270° otherwise).
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame,
  });

  // ── Refs the scene reads ──────────────────────────────────────────────────
  const matrixRef = useRef<number[] | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const detectedRef = useRef(false);
  const frameAspectRef = useRef<number | null>(null);

  const buffer = useMemo(() => new Float32Array(L.count), []);
  const matrix = useMemo(() => new Array<number>(16).fill(0), []);
  const landmarks = useMemo<NormalizedLandmark[]>(
    () => Array.from({ length: L.maxLandmarks }, () => ({ x: 0, y: 0, z: 0 })),
    [],
  );
  const lastSeq = useRef(0);
  const statsRef = useRef({ seqAt: 0, at: 0, fps: 0 });

  const poll = useCallback((): boolean => {
    if (!landmarker) {
      detectedRef.current = false;
      return false;
    }
    const seq = landmarker.readLatest(buffer.buffer as ArrayBuffer);
    if (seq === lastSeq.current) return false;
    lastSeq.current = seq;

    const w = buffer[L.frameWidth];
    const h = buffer[L.frameHeight];
    if (w > 0 && h > 0) frameAspectRef.current = w / h;

    const found = buffer[L.detected] === 1;
    detectedRef.current = found;
    if (found) {
      for (let i = 0; i < 16; i++) matrix[i] = buffer[L.matrix + i];
      const count = Math.min(Math.trunc(buffer[L.landmarkCount]), L.maxLandmarks);
      for (let i = 0, o = L.header; i < count; i++, o += 3) {
        const lm = landmarks[i];
        lm.x = buffer[o];
        lm.y = buffer[o + 1];
        lm.z = buffer[o + 2];
      }
      matrixRef.current = matrix;
      landmarksRef.current = count === landmarks.length ? landmarks : landmarks.slice(0, count);
    }
    return true;
  }, [landmarker, buffer, matrix, landmarks]);

  const stats = useCallback((): TrackingStats => {
    const now = Date.now();
    const s = statsRef.current;
    if (now - s.at >= 1000) {
      s.fps = s.at ? ((lastSeq.current - s.seqAt) * 1000) / (now - s.at) : 0;
      s.at = now;
      s.seqAt = lastSeq.current;
    }
    return {
      delegate: landmarker?.delegate ?? '—',
      inferenceMs: Math.round(buffer[L.inferenceMs] * 10) / 10,
      detectionFps: Math.round(s.fps),
    };
  }, [landmarker, buffer]);

  // A fresh landmarker starts from an empty result.
  useEffect(() => {
    lastSeq.current = 0;
    detectedRef.current = false;
    matrixRef.current = null;
    landmarksRef.current = null;
  }, [landmarker]);

  const ready = landmarker != null;
  return useMemo(
    () => ({
      frameOutput,
      ready,
      error,
      matrixRef,
      landmarksRef,
      detectedRef,
      frameAspectRef,
      poll,
      stats,
    }),
    [frameOutput, ready, error, poll, stats],
  );
}
