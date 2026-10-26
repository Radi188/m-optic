/**
 * Face shapes and the frames that flatter them — ported from the M-Optic
 * website (m-optic-website: src/components/vto/faceShape.ts). The measuring
 * maths runs in the WebView engine; this is the part the app's UI needs.
 *
 * A style suggestion, never a measurement.
 */

export const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'oblong', 'diamond'] as const;
export type FaceShape = (typeof FACE_SHAPES)[number];

export type FrameShapeKey =
  | 'square'
  | 'rectangle'
  | 'round'
  | 'oval'
  | 'aviator'
  | 'cat_eye'
  | 'wayfarer'
  | 'rimless'
  | 'oversized'
  | 'geometric';

/** CONTRAST: angular frames on soft faces, curved frames on angular ones. */
export const FRAME_RECOMMENDATIONS: Record<FaceShape, FrameShapeKey[]> = {
  oval: ['square', 'rectangle', 'aviator'],
  round: ['rectangle', 'square', 'cat_eye'],
  square: ['round', 'oval', 'aviator'],
  heart: ['round', 'oval', 'rimless'],
  oblong: ['oversized', 'round', 'wayfarer'],
  diamond: ['cat_eye', 'oval', 'rimless'],
};
