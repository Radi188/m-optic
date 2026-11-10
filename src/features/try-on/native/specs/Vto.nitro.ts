/**
 * Nitro specs for the try-on native module. `yarn specs` (nitrogen) turns
 * these into the C++/Swift/Kotlin glue under ../nitrogen/generated.
 */

import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

export interface FaceLandmarkerOptions {
  /** Try the GPU delegate first and fall back to CPU (the website's behaviour). */
  preferGpu: boolean;
  minFaceDetectionConfidence: number;
  minFacePresenceConfidence: number;
  minTrackingConfidence: number;
}

/**
 * MediaPipe Face Landmarker (VIDEO running mode, one face, facial
 * transformation matrix on, blendshapes off): the same options as the
 * website's faceTracker.ts.
 *
 * `detect` runs on the camera's frame-processor thread. The result stays on the
 * native side; the renderer copies the latest one out with `readLatest` once
 * per rendered frame, so no image data and no per-frame messages cross to the
 * JS thread.
 */
export interface FaceLandmarker
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** 'GPU' or 'CPU': the delegate that actually initialised. */
  readonly delegate: string;
  /**
   * Run detection on one camera frame. The frame is analysed upright and
   * UNMIRRORED (its orientation and mirroring metadata are applied), so the
   * landmarks match the raw camera image the way the website's do.
   * Returns true when a face was found.
   */
  detect(frame: Frame): boolean;
  /**
   * Copy the latest result into `out` (a Float32Array's buffer, see
   * RESULT_LAYOUT in ../index.ts). Returns its sequence number, which grows by
   * one for every analysed frame (0 until the first one).
   */
  readLatest(out: ArrayBuffer): number;
  /** Release the MediaPipe graph. Further `detect` calls do nothing. */
  close(): void;
}

export interface PhotoCardRequest {
  /** Camera photo (plain file path). */
  photoPath: string;
  /** The photo's orientation metadata ('up' | 'right' | 'down' | 'left'). */
  photoOrientation: string;
  /** Whether the photo's pixels are mirrored. */
  photoMirrored: boolean;
  /** PNG of the try-on GL view (the visible window, unmirrored). '' = none. */
  overlayPath: string;
  /** Size of the full analysed-frame "cover box" in output pixels. */
  coverWidth: number;
  coverHeight: number;
  /** The visible window inside the cover box, in output pixels. */
  viewX: number;
  viewY: number;
  viewWidth: number;
  viewHeight: number;
  /** Mirror the composite, like the on-screen selfie view. */
  mirror: boolean;
  title: string;
  subtitle: string;
  /** Font for the caption (an app font name; falls back to the system font). */
  fontFamily: string;
  boldFontFamily: string;
  /** Where to write the JPEG. */
  outputPath: string;
  /** 0–1 */
  jpegQuality: number;
}

export interface PhotoCardResult {
  path: string;
  width: number;
  height: number;
}

export interface VtoFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Load the model and initialise the graph (GPU, else CPU) off the JS
   * thread, so opening the try-on never blocks the UI.
   */
  createFaceLandmarker(options: FaceLandmarkerOptions): Promise<FaceLandmarker>;
  /**
   * Compose the saved try-on photo card: the camera photo, cropped and
   * mirrored like the screen, the glasses on top, on a white card with the
   * M-Optic mark and the frame/colour caption (the website's photoCard.ts).
   */
  composePhotoCard(request: PhotoCardRequest): Promise<PhotoCardResult>;
  /**
   * Decode an image the OS can read (WebP, …) and write it as a PNG, off the
   * JS thread. expo-gl decodes textures with stb_image, which has no WebP, so
   * the catalog's WebP textures are converted once when a model is prepared.
   * Plain file paths (no file://).
   */
  transcodeToPng(inputPath: string, outputPath: string): Promise<void>;
}
