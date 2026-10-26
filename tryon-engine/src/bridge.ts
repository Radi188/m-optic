/**
 * The engine's side of the WebView bridge.
 *
 * Engine → app: JSON messages through `window.ReactNativeWebView.postMessage`.
 * Only small state goes across per event (never per frame, never image data —
 * except the one photo the wearer asked for).
 *
 * App → engine: the app calls `window.__vto.*` through `injectJavaScript`
 * (see main.tsx for the functions it exposes).
 */

import type { FaceShape } from '../../src/features/try-on/core/faceShapeTypes';

export type EngineStatus = 'loading' | 'ready' | 'denied' | 'error' | 'no-webgl';

export type EngineMessage =
  | { type: 'status'; status: EngineStatus; message?: string }
  | { type: 'face'; detected: boolean }
  | { type: 'glasses'; loading: boolean }
  | { type: 'glbError'; frameId: string; reason: 'empty' | 'error'; message?: string }
  | { type: 'faceShape'; shape: FaceShape | null }
  | {
      type: 'stats';
      delegate: string;
      inferenceMs: number;
      detectionFps: number;
      renderFps: number;
    }
  | { type: 'firstFit' }
  | { type: 'photo'; dataUrl: string; width: number; height: number }
  | { type: 'photoError'; message: string };

type RNWindow = Window & { ReactNativeWebView?: { postMessage(data: string): void } };

export function post(message: EngineMessage): void {
  const rn = (window as RNWindow).ReactNativeWebView;
  if (rn) rn.postMessage(JSON.stringify(message));
}

export function reportStats(s: {
  delegate: string;
  inferenceMs: number;
  detectionFps: number;
  renderFps: number;
}): void {
  post({ type: 'stats', ...s });
}
