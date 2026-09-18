// hooks/useAllowScreenCapture.ts
import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { acquireScreenCapturePermit } from '../native/screenGuard';

/**
 * Lets the user screenshot and screen-record this screen; the rest of the app
 * stays blocked. See ../native/screenGuard for which features get this and why.
 *
 * The permit is tied to navigation focus as well as `enabled`, so a screen that
 * stays mounted underneath another one (stack screens do) hands the block back
 * as soon as the user navigates away.
 *
 * @param enabled false suspends the permit — e.g. a viewer modal that is closed.
 */
export const useAllowScreenCapture = (enabled: boolean = true): void => {
  const isFocused = useIsFocused();
  const active = enabled && isFocused;

  useEffect(() => {
    if (!active) return;
    return acquireScreenCapturePermit();
  }, [active]);
};
