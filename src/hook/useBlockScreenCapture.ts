import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { acquireScreenCaptureBlock } from '../native/screenGuard';

/**
 * Blocks screenshots and screen recording while this screen is focused — for
 * screens that show prices. See ../native/screenGuard for the full list.
 *
 * Tied to navigation focus as well as `enabled`, so a screen that stays
 * mounted underneath another one (stack screens and tabs do) lifts its block
 * as soon as the user moves on.
 *
 * @param enabled false lifts the block — e.g. while a capturable viewer is open
 *   over the screen, or on a tab of the screen that shows no prices.
 */
export const useBlockScreenCapture = (enabled: boolean = true): void => {
  const isFocused = useIsFocused();
  const active = enabled && isFocused;

  useEffect(() => {
    if (!active) return;
    return acquireScreenCaptureBlock();
  }, [active]);
};
