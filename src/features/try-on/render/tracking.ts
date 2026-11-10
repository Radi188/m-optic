/**
 * Tracking refs shared from useFaceTracking into the scene (read in useFrame) —
 * the same shapes the website's tracking-context.ts carries, so the ported
 * scene code reads them unchanged:
 *   matrixRef     number[16], column-major facial transformation matrix (cm)
 *   landmarksRef  normalised landmarks of the analysed frame
 *   detectedRef   a face is in the latest result
 */

import { createContext, useContext } from 'react';
import type { NormalizedLandmark } from '../core/faceShape';

export interface TrackingRefs {
  matrixRef: { current: number[] | null };
  landmarksRef: { current: NormalizedLandmark[] | null };
  detectedRef: { current: boolean };
}

export const TrackingContext = createContext<TrackingRefs | null>(null);

export function useTracking(): TrackingRefs {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used inside <TrackingContext.Provider>');
  return ctx;
}
