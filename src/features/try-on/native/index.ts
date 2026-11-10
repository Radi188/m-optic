/**
 * JS side of the try-on native module (react-native-moptic-vto).
 *
 *   createFaceLandmarker()  MediaPipe Face Landmarker, called from a
 *                           VisionCamera frame processor (`detect(frame)`)
 *   composePhotoCard()      the saved try-on photo card
 *   transcodeToPng()        WebP model textures → PNG for expo-gl
 *
 * The landmarker keeps its latest result natively; the renderer copies it out
 * with `readLatest` (see RESULT_LAYOUT) once per rendered frame.
 */

import { NitroModules } from 'react-native-nitro-modules';
import type {
  FaceLandmarker,
  FaceLandmarkerOptions,
  PhotoCardRequest,
  PhotoCardResult,
  VtoFactory,
} from './specs/Vto.nitro';

export type { FaceLandmarker, FaceLandmarkerOptions, PhotoCardRequest, PhotoCardResult };

/** Float offsets in the `readLatest` buffer. Mirrors ResultLayout natively. */
export const RESULT_LAYOUT = {
  matrix: 0,
  detected: 16,
  frameWidth: 17,
  frameHeight: 18,
  inferenceMs: 19,
  landmarkCount: 20,
  header: 24,
  maxLandmarks: 478,
  count: 24 + 478 * 3,
} as const;

let factory: VtoFactory | null = null;
function getFactory(): VtoFactory {
  factory ??= NitroModules.createHybridObject<VtoFactory>('VtoFactory');
  return factory;
}

/** The website's MediaPipe defaults (faceTracker.ts leaves them at 0.5). */
export const DEFAULT_LANDMARKER_OPTIONS: FaceLandmarkerOptions = {
  preferGpu: true,
  minFaceDetectionConfidence: 0.5,
  minFacePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

export function createFaceLandmarker(
  options: Partial<FaceLandmarkerOptions> = {},
): Promise<FaceLandmarker> {
  return getFactory().createFaceLandmarker({ ...DEFAULT_LANDMARKER_OPTIONS, ...options });
}

export function composePhotoCard(request: PhotoCardRequest): Promise<PhotoCardResult> {
  return getFactory().composePhotoCard(request);
}

/** Decode an image (WebP, …) and write it as PNG. Plain paths, no file://. */
export function transcodeToPng(inputPath: string, outputPath: string): Promise<void> {
  return getFactory().transcodeToPng(inputPath, outputPath);
}
