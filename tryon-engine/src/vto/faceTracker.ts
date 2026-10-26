/**
 * faceTracker.ts — MediaPipe Face Landmarker tracking layer.
 *
 * Replaces the old Jeeliz FaceFilter tracker. MediaPipe outputs a full 6DOF head
 * pose as a 4×4 "facial transformation matrix" that maps Google's canonical face
 * model into runtime camera space (metric units = CENTIMETRES). Driving a Three.js
 * group directly with that matrix makes the glasses lock to the face and rotate
 * rigidly with head yaw/pitch/roll — no large manual offsets, no swing.
 *
 * All assets are self-hosted under /public/mediapipe (see scripts/copy-mediapipe.mjs);
 * nothing is loaded from a CDN.
 */

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

/** Self-hosted WASM bundle directory (copied from node_modules). */
const WASM_PATH = '/mediapipe/wasm';
/** Self-hosted model file (downloaded by the copy script). */
const MODEL_PATH = '/mediapipe/face_landmarker.task';

/**
 * Vertical field-of-view (degrees) of MediaPipe's virtual perspective camera.
 *
 * The facial transformation matrix is computed against a fixed virtual camera
 * defined in MediaPipe's face-geometry module
 * (mediapipe/modules/face_geometry/data/geometry_pipeline_metadata_landmarks.pbtxt):
 *
 *     perspective_camera { vertical_fov_degrees: 63.0  near: 1.0  far: 10000.0 }
 *
 * The horizontal FOV is derived from the input frame's aspect ratio. To overlay
 * the matrix-driven glasses on the video, the Three.js PerspectiveCamera must use
 * this same vertical FOV (and aspect = video width / height, near/far in cm).
 */
export const MEDIAPIPE_FOV_Y_DEG = 63;
/** Near/far planes of MediaPipe's virtual camera, in centimetres. */
export const MEDIAPIPE_NEAR_CM = 1;
export const MEDIAPIPE_FAR_CM = 10000;

export type { FaceLandmarkerResult };

/**
 * Which delegate the most recently created FaceLandmarker actually initialised
 * with. Read by the detection hook for its perf log. 'unknown' until created.
 */
export const faceLandmarkerInfo: { delegate: 'GPU' | 'CPU' | 'unknown' } = {
  delegate: 'unknown',
};

/**
 * Create a Face Landmarker for real-time video (6DOF head pose enabled,
 * blendshapes OFF). Tries the GPU delegate first and falls back to CPU if the
 * browser can't initialise it — logging which one is active.
 */
export async function createFaceLandmarker(): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    outputFacialTransformationMatrixes: true, // REQUIRED — this is the head pose
    outputFaceBlendshapes: false, // OFF — not needed for static glasses
  });

  try {
    const lm = await FaceLandmarker.createFromOptions(vision, options('GPU'));
    faceLandmarkerInfo.delegate = 'GPU';
    console.log('[VTO] FaceLandmarker delegate: GPU ✓');
    return lm;
  } catch (err) {
    console.warn('[VTO] GPU delegate failed to initialise — falling back to CPU.', err);
    const lm = await FaceLandmarker.createFromOptions(vision, options('CPU'));
    faceLandmarkerInfo.delegate = 'CPU';
    console.log('[VTO] FaceLandmarker delegate: CPU (fallback)');
    return lm;
  }
}

/**
 * Open the front (selfie) camera and stream it into the given <video> element.
 * Resolves once the first frame's dimensions are known so callers can size the
 * renderer/camera to the real capture resolution.
 *
 * Display mirroring is handled in CSS (see VirtualTryOn), NOT here — the raw,
 * un-mirrored frames are what MediaPipe analyses.
 */
export async function startCamera(
  video: HTMLVideoElement,
  idealWidth = 1280,
  idealHeight = 720,
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: idealWidth },
      height: { ideal: idealHeight },
    },
    audio: false,
  });

  video.srcObject = stream;
  video.playsInline = true;
  video.muted = true;

  await new Promise<void>((resolve) => {
    const onReady = () => {
      video.removeEventListener('loadeddata', onReady);
      resolve();
    };
    video.addEventListener('loadeddata', onReady);
  });
  await video.play();

  return stream;
}
