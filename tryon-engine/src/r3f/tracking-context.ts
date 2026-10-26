
import { createContext, useContext } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** Tracking refs shared from useFaceTracking into the R3F scene (read in useFrame). */
export interface TrackingRefs {
  matrixRef: React.MutableRefObject<number[] | null>;
  landmarksRef: React.MutableRefObject<NormalizedLandmark[] | null>;
  detectedRef: React.MutableRefObject<boolean>;
}

export const TrackingContext = createContext<TrackingRefs | null>(null);

export function useTracking(): TrackingRefs {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used inside <TrackingContext.Provider>');
  return ctx;
}
