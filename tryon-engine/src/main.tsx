/**
 * Engine entry — the WebView page. Ported from the website's
 * VirtualTryOnR3F.tsx with its rendering untouched:
 *
 *   container (fullscreen, overflow-hidden)
 *     └─ cover-box (sized to the VIDEO aspect, covers the container, mirrored)
 *          ├─ <video>   selfie background
 *          └─ <Canvas>  transparent R3F overlay
 *
 * Camera matching is the website's: PerspectiveCamera(fov 63 VERTICAL,
 * aspect = videoW/videoH, near 1, far 10000 cm). MediaPipe analyses the raw
 * frames; the video and the canvas are mirrored together, once, by the
 * cover-box's scaleX(-1).
 *
 * Everything the wearer reads or taps (status, hints, frame switcher, shutter,
 * review card, face-shape badge) is native UI in the app — see
 * src/features/try-on/ui. This page only reports state through bridge.ts.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Scene from './r3f/Scene';
import { TrackingContext, useTracking } from './r3f/tracking-context';
import { useFaceTracking } from './useFaceTracking';
import { useVtoStore } from './store';
import { post } from './bridge';
import { composePhotoCard } from './vto/photoCard';
import type { VTOFrame } from '../../src/features/try-on/core/frames';

const FOV_Y = 63;
const NEAR_CM = 1;
const FAR_CM = 10000;
const CAM_W = 1280;
const CAM_H = 720;

/** How long the face must be missing before the app shows "position your face". */
const FACE_LOST_GRACE_MS = 400;

/** A frame as the app sends it: the GLB is already a data: URI. */
export type EngineFrame = VTOFrame;

// ── App → engine API ────────────────────────────────────────────────────────

let setFrameFromApp: ((frame: EngineFrame) => void) | null = null;
let pendingFrame: EngineFrame | null = null;
/** Caption printed on the saved card, written by the app in the wearer's language. */
export interface CardCaption {
  title?: string | null;
  subtitle?: string | null;
}
let captureFromApp: ((caption: CardCaption) => void) | null = null;

/** The website's own mark, served by the same origin as the MediaPipe files. */
const PHOTO_CARD_LOGO = '/images/logo/m-optic-logo-black.png';

declare global {
  interface Window {
    __vto: { setFrame(frame: EngineFrame): void; capture(caption?: CardCaption): void };
  }
}

window.__vto = {
  setFrame(frame) {
    if (setFrameFromApp) setFrameFromApp(frame);
    else pendingFrame = frame;
  },
  capture(caption = {}) {
    captureFromApp?.(caption);
  },
};

// ── Cover-box + camera rig (verbatim from the website) ──────────────────────

function useCoverBox(containerRef: React.RefObject<HTMLDivElement | null>, aspect: number | null) {
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !aspect) return;
    const update = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw / ch > aspect) setBox({ w: cw, h: cw / aspect });
      else setBox({ w: ch * aspect, h: ch });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, aspect]);
  return box;
}

function CameraRig({ aspect }: { aspect: number }) {
  const camera = useThree(s => s.camera);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera & { manual?: boolean };
    cam.manual = true;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
  }, [camera, aspect]);
  return null;
}

/**
 * Reports face found / lost to the app. Found is immediate; lost waits a beat
 * so a single dropped detection does not flash the hint. (The glasses
 * themselves still hide at once — Scene does that on the same frame.)
 * Also reports the first fitted frame once, for the time-to-first-fit metric.
 */
function FaceStatusReporter() {
  const { detectedRef } = useTracking();
  const lastSent = useRef<boolean | null>(null);
  const lostSince = useRef<number | null>(null);
  const firstFitSent = useRef(false);
  useFrame(() => {
    const detected = detectedRef.current;
    const now = performance.now();
    if (detected) {
      lostSince.current = null;
      if (!firstFitSent.current) {
        firstFitSent.current = true;
        post({ type: 'firstFit' });
      }
      if (lastSent.current !== true) {
        lastSent.current = true;
        post({ type: 'face', detected: true });
      }
      return;
    }
    lostSince.current ??= now;
    if (lastSent.current !== false && now - lostSince.current > FACE_LOST_GRACE_MS) {
      lastSent.current = false;
      post({ type: 'face', detected: false });
    }
  });
  return null;
}

// ── The page ────────────────────────────────────────────────────────────────

function TryOnEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [frame, setFrame] = useState<EngineFrame | null>(null);
  const [videoAspect, setVideoAspect] = useState<number>(CAM_W / CAM_H);

  const tracking = useFaceTracking();
  const loadFrame = useVtoStore(s => s.loadFrame);
  const coverBox = useCoverBox(containerRef, videoAspect);

  // The app can send a frame before React mounts; pick it up, and take later
  // ones straight away. Swapping a frame never touches the camera.
  //
  // The GLB arrives as a multi-MB data: URI. The website's code uses the path
  // as a React key and prints it in its logs, so it is turned into a short
  // blob: URL first (GLTFLoader reads either), and the previous one released.
  const blobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    let latest = 0;
    const accept = (f: EngineFrame) => {
      const ticket = ++latest;
      const toBlobUrl = f.glbPath.startsWith('data:')
        ? fetch(f.glbPath)
            .then(r => r.blob())
            .then(b => URL.createObjectURL(b))
        : Promise.resolve(f.glbPath);
      toBlobUrl
        .then(url => {
          if (ticket !== latest) {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            return;
          }
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url.startsWith('blob:') ? url : null;
          setFrame({ ...f, glbPath: url });
        })
        .catch(err =>
          post({
            type: 'glbError',
            frameId: f.id,
            reason: 'error',
            message: err instanceof Error ? err.message : String(err),
          }),
        );
    };
    setFrameFromApp = accept;
    if (pendingFrame) {
      accept(pendingFrame);
      pendingFrame = null;
    }
    return () => {
      setFrameFromApp = null;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (frame) loadFrame(frame);
  }, [frame, loadFrame]);

  // Camera permission was already asked by the app before this page opened,
  // so the camera starts straight away (the website's consent card is native).
  useEffect(() => {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') ?? probe.getContext('webgl'))) {
      setStatus('failed');
      post({ type: 'status', status: 'no-webgl' });
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('failed');
      post({ type: 'status', status: 'error', message: 'getUserMedia unavailable' });
      return;
    }
    let cancelled = false;
    post({ type: 'status', status: 'loading' });
    tracking
      .start(video)
      .then(() => {
        if (cancelled) return;
        setVideoAspect((video.videoWidth || CAM_W) / (video.videoHeight || CAM_H));
        setStatus('ready');
        post({ type: 'status', status: 'ready' });
      })
      .catch(err => {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        console.error('[VTO] camera/init failed:', name, err);
        setStatus('failed');
        post({
          type: 'status',
          status: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error',
          message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
      });
    return () => {
      cancelled = true;
      tracking.stop();
    };
  }, [tracking]);

  // Photo: the website's takePhoto — composite the mirrored video and the
  // mirrored R3F canvas at the canvas's full backing-store resolution.
  const takePhoto = useCallback(async (caption: CardCaption) => {
    const video = videoRef.current;
    const gl = glRef.current;
    if (!video || !gl) {
      post({ type: 'photoError', message: 'not ready' });
      return;
    }
    try {
      const canvas = gl.domElement;
      const out = document.createElement('canvas');
      out.width = canvas.width;
      out.height = canvas.height;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1); // match the on-screen selfie mirror
      ctx.drawImage(video, 0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0, out.width, out.height);

      // The screen shows only the part of the cover-box inside the container,
      // so the photo is cropped to the same window.
      const container = containerRef.current;
      const box = { w: coverBox.w || out.width, h: coverBox.h || out.height };
      let crop = out;
      if (container && box.w > 0 && box.h > 0) {
        const sx = out.width / box.w;
        const sy = out.height / box.h;
        const cw = Math.min(out.width, Math.round(container.clientWidth * sx));
        const ch = Math.min(out.height, Math.round(container.clientHeight * sy));
        crop = document.createElement('canvas');
        crop.width = cw;
        crop.height = ch;
        crop
          .getContext('2d')
          ?.drawImage(out, (out.width - cw) / 2, (out.height - ch) / 2, cw, ch, 0, 0, cw, ch);
      }
      // The saved file is the card, not the bare frame (the website's
      // photoCard, at full resolution), and the app reviews this same image —
      // so what the wearer approves is exactly what gets saved.
      let card = crop;
      try {
        card = await composePhotoCard(crop, {
          logoSrc: PHOTO_CARD_LOGO,
          title: caption.title ?? null,
          subtitle: caption.subtitle ?? null,
          metrics: null,
        });
      } catch {
        // Composition is a nicety; never lose the shot over it.
      }
      post({
        type: 'photo',
        dataUrl: card.toDataURL('image/jpeg', 0.92),
        width: card.width,
        height: card.height,
      });
    } catch (err) {
      post({ type: 'photoError', message: err instanceof Error ? err.message : String(err) });
    }
  }, [coverBox]);

  useEffect(() => {
    captureFromApp = takePhoto;
    return () => {
      captureFromApp = null;
    };
  }, [takePhoto]);

  const trackingValue = useMemo(
    () => ({
      matrixRef: tracking.matrixRef,
      landmarksRef: tracking.landmarksRef,
      detectedRef: tracking.detectedRef,
    }),
    [tracking.matrixRef, tracking.landmarksRef, tracking.detectedRef],
  );

  const reportGlbFailure = useCallback(
    (reason: 'empty' | 'error') => (_path: string, err?: unknown) => {
      if (!frame) return;
      post({
        type: 'glbError',
        frameId: frame.id,
        reason,
        message: err instanceof Error ? err.message : undefined,
      });
    },
    [frame],
  );

  return (
    <div ref={containerRef} style={styles.container}>
      <div
        style={{
          ...styles.coverBox,
          width: coverBox.w || '100%',
          height: coverBox.h || '100%',
        }}
      >
        <video ref={videoRef} playsInline muted style={styles.fill} aria-hidden="true" />
        {status === 'ready' && frame && (
          <Canvas
            style={styles.fill}
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            camera={{ fov: FOV_Y, near: NEAR_CM, far: FAR_CM, position: [0, 0, 0] }}
            onCreated={({ gl }) => {
              glRef.current = gl;
              gl.localClippingEnabled = true;
              gl.setClearColor(0x000000, 0);
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.0;
            }}
          >
            <CameraRig aspect={videoAspect} />
            <TrackingContext.Provider value={trackingValue}>
              <FaceStatusReporter />
              <Scene
                glbPath={frame.glbPath}
                video={videoRef.current}
                onFaceShape={shape => post({ type: 'faceShape', shape })}
                onGlbError={reportGlbFailure('error')}
                onGlbEmpty={reportGlbFailure('empty')}
                onGlassesLoadingChange={loading => post({ type: 'glasses', loading })}
              />
            </TrackingContext.Provider>
          </Canvas>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: '#000',
  },
  coverBox: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%) scaleX(-1)',
  },
  fill: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
};

createRoot(document.getElementById('root')!).render(<TryOnEngine />);
