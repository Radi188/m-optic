
/**
 * useFaceTracking — MediaPipe Face Landmarker ref-bridge for the R3F renderer.
 *
 * Detection can run on the MAIN THREAD (original behaviour) or in a WEB WORKER
 * (experiment), toggled by USE_WORKER below. EITHER WAY it publishes the exact
 * same refs in the exact same formats, so nothing downstream (Scene smoothing,
 * Glasses auto-scale, occluder, camera/FOV, calibration) changes:
 *   • matrixRef     — number[16], column-major 4×4 facial transformation matrix (cm)
 *   • landmarksRef  — NormalizedLandmark[] (image coords 0–1; indices 33/263 used)
 *   • detectedRef   — boolean
 *   • errorRef      — first error message (surfaced in the panel)
 *
 * Refs (not React state) avoid per-frame re-renders; the render loop reads them.
 *
 * ── A/B FLAG ────────────────────────────────────────────────────────────────
 * Flip `USE_WORKER` (just below) to compare. true = worker, false = main thread.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { reportStats } from './bridge';

/**
 * EXPERIMENT TOGGLE — true = detect in a Web Worker, false = main thread.
 * OFF for the latency test: the GPU delegate needs the main thread's WebGL
 * context, so we isolate inference latency on the main thread first (re-enable
 * the worker later if needed).
 */
const USE_WORKER = false;

/**
 * Detection input height (px). The frame fed to detectForVideo() is downscaled
 * to this height (aspect preserved) — inference cost scales with pixel count, so
 * 480 is much faster than native 720/1080. Display/render stay full-res; landmark
 * coords are NORMALISED (0–1) and the matrix uses the (unchanged) input ASPECT,
 * so both remain valid for the full-res overlay. Set 0 to disable downscaling.
 */
const DETECT_HEIGHT = 480;

/** Worker → main message shapes. */
type WorkerOut =
  | { type: 'READY' }
  | { type: 'ERROR'; message: string }
  | {
      type: 'RESULT';
      timestamp: number;
      detected: boolean;
      matrix?: Float32Array;
      landmarks?: Float32Array;
      count?: number;
    };

export interface FaceTracking {
  matrixRef: React.MutableRefObject<number[] | null>;
  landmarksRef: React.MutableRefObject<NormalizedLandmark[] | null>;
  detectedRef: React.MutableRefObject<boolean>;
  errorRef: React.MutableRefObject<string | null>;
  /** Open the camera + start detection on the given <video>. Resolves when ready. */
  start: (video: HTMLVideoElement) => Promise<void>;
  /** Stop detection, close the landmarker/worker, stop the camera tracks. */
  stop: () => void;
}

export function useFaceTracking(): FaceTracking {
  const matrixRef = useRef<number[] | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const detectedRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  // Main-thread path
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  // Worker path
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const workerBusyRef = useRef(false);
  const vfcHandleRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // Reusable landmark objects (avoid per-frame allocation when unpacking).
  const landmarkScratchRef = useRef<NormalizedLandmark[] | null>(null);
  // Reusable downscale canvas for the detection input (STEP 3).
  const detectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(-1);
  const startedRef = useRef(false); // StrictMode double-init guard

  /** Unpack a worker landmark Float32Array (x,y,z…) into stable {x,y,z} objects. */
  const unpackLandmarks = useCallback((f32: Float32Array, count: number): NormalizedLandmark[] => {
    let scratch = landmarkScratchRef.current;
    if (!scratch || scratch.length !== count) {
      scratch = new Array(count);
      for (let i = 0; i < count; i++) scratch[i] = { x: 0, y: 0, z: 0 } as NormalizedLandmark;
      landmarkScratchRef.current = scratch;
    }
    for (let i = 0; i < count; i++) {
      const o = scratch[i] as { x: number; y: number; z: number };
      o.x = f32[i * 3];
      o.y = f32[i * 3 + 1];
      o.z = f32[i * 3 + 2];
    }
    return scratch;
  }, []);

  const start = useCallback(
    async (video: HTMLVideoElement) => {
      if (startedRef.current) return;
      startedRef.current = true;
      videoElRef.current = video;

      const { startCamera, createFaceLandmarker, faceLandmarkerInfo } = await import(
        './vto/faceTracker'
      );

      // 1. Camera (permission already granted by the consent handler).
      const stream = await startCamera(video, 1280, 720);
      streamRef.current = stream;

      // ── Instrumentation (STEP 1) ────────────────────────────────────────────
      // Logged every ~1s: rolling-avg inference ms (last ~60 detect calls),
      // effective DETECTION fps (poses/sec that update the ref), and render fps
      // (achieved frame-callback rate). Also prints the active delegate + detect H.
      const stats = {
        renderTicks: 0, // frame-callback ticks ≈ achieved render fps
        detPoses: 0, // poses that updated the ref
        dropped: 0, // worker frames skipped (busy)
        inferSamples: [] as number[], // rolling detect ms (cap 60)
        inferSum: 0,
        last: performance.now(),
      };
      const pushInfer = (ms: number) => {
        stats.inferSamples.push(ms);
        stats.inferSum += ms;
        if (stats.inferSamples.length > 60) stats.inferSum -= stats.inferSamples.shift() ?? 0;
      };
      const logStats = () => {
        const now = performance.now();
        const dt = now - stats.last;
        if (dt < 1000) return;
        const renderFps = (stats.renderTicks / dt) * 1000;
        const detFps = (stats.detPoses / dt) * 1000;
        const avgInfer = stats.inferSamples.length ? stats.inferSum / stats.inferSamples.length : 0;
        const dropPerSec = (stats.dropped / dt) * 1000;
        console.log(
          `[VTO] worker=${USE_WORKER} delegate=${faceLandmarkerInfo.delegate} ` +
            `detectH=${DETECT_HEIGHT || 'full'} | inference=${avgInfer.toFixed(1)}ms ` +
            `detectionFps=${detFps.toFixed(0)} renderFps=${renderFps.toFixed(0)}` +
            (USE_WORKER ? ` dropped=${dropPerSec.toFixed(0)}/s` : ''),
        );
        // The app shows these in development and logs the active delegate.
        reportStats({
          delegate: faceLandmarkerInfo.delegate,
          inferenceMs: Math.round(avgInfer * 10) / 10,
          detectionFps: Math.round(detFps),
          renderFps: Math.round(renderFps),
        });
        stats.renderTicks = 0;
        stats.detPoses = 0;
        stats.dropped = 0;
        stats.last = now;
        // inferSamples is a rolling window — intentionally not reset here.
      };

      // Downscale the detection input to DETECT_HEIGHT (aspect preserved) via a
      // reusable canvas; returns the video unchanged if no downscale is needed.
      const getDetectSource = (v: HTMLVideoElement): HTMLVideoElement | HTMLCanvasElement => {
        if (DETECT_HEIGHT <= 0 || v.videoHeight === 0 || v.videoHeight <= DETECT_HEIGHT) return v;
        const aspect = v.videoWidth / v.videoHeight;
        const h = DETECT_HEIGHT;
        const w = Math.round(h * aspect);
        let c = detectCanvasRef.current;
        if (!c) {
          c = document.createElement('canvas');
          detectCanvasRef.current = c;
          detectCtxRef.current = c.getContext('2d', { alpha: false, desynchronized: true });
        }
        if (c.width !== w || c.height !== h) {
          c.width = w;
          c.height = h;
        }
        const ctx = detectCtxRef.current;
        if (!ctx) return v;
        ctx.drawImage(v, 0, 0, w, h);
        return c;
      };

      // ── MAIN-THREAD PATH (original behaviour) ────────────────────────────────
      const landmarker = await createFaceLandmarker();
      landmarkerRef.current = landmarker;
      let errLogged = false;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        stats.renderTicks++; // ≈ achieved render fps (rAF rate, drops if blocked)
        logStats();
        const lm = landmarkerRef.current;
        if (!lm || video.readyState < 2) return;
        if (video.currentTime === lastTimeRef.current) return;
        lastTimeRef.current = video.currentTime;
        try {
          // STEP 3: feed a downscaled frame; display/render stay full-res.
          const src = getDetectSource(video);
          const t0 = performance.now();
          const result = lm.detectForVideo(src, performance.now());
          pushInfer(performance.now() - t0); // rolling inference ms
          const mtx = result.facialTransformationMatrixes?.[0]?.data;
          const lms = result.faceLandmarks?.[0];
          if (mtx && mtx.length === 16) {
            matrixRef.current = mtx;
            landmarksRef.current = lms ?? null;
            detectedRef.current = true;
            stats.detPoses++; // effective detection fps
          } else {
            detectedRef.current = false;
          }
        } catch (e) {
          if (!errLogged) {
            errLogged = true;
            const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
            console.error('[VTO] detection loop error (continuing):', e);
            errorRef.current = msg;
          }
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [unpackLandmarks],
  );

  const stop = useCallback(() => {
    // Cancel both scheduling paths.
    if (vfcHandleRef.current != null && videoElRef.current) {
      (
        videoElRef.current as HTMLVideoElement & { cancelVideoFrameCallback?: (h: number) => void }
      ).cancelVideoFrameCallback?.(vfcHandleRef.current);
    }
    vfcHandleRef.current = null;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    // Camera.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Worker (terminate frees its WASM/GPU context + any in-flight ImageBitmap).
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CLOSE' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    workerReadyRef.current = false;
    workerBusyRef.current = false;

    // Main-thread landmarker.
    landmarkerRef.current?.close();
    landmarkerRef.current = null;

    matrixRef.current = null;
    landmarksRef.current = null;
    landmarkScratchRef.current = null;
    detectCanvasRef.current = null;
    detectCtxRef.current = null;
    detectedRef.current = false;
    lastTimeRef.current = -1;
    startedRef.current = false;
    videoElRef.current = null;
  }, []);

  return useMemo(
    () => ({ matrixRef, landmarksRef, detectedRef, errorRef, start, stop }),
    [matrixRef, landmarksRef, detectedRef, errorRef, start, stop],
  );
}
