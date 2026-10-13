import { useWindowDimensions } from 'react-native';
import { Breakpoints, MaxWidth } from '../theme';

/**
 * Window-based layout info. Uses the live window (not the device), so iPad
 * split view, Slide Over and rotation all get the right layout.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= Breakpoints.tablet;

  return {
    width,
    height,
    isTablet,
    /** Width of a `Layout.readable` column. */
    readableWidth: Math.min(width, MaxWidth.readable),
    /** Width of a `Layout.wide` column. */
    wideWidth: Math.min(width, MaxWidth.wide),
    /**
     * Side inset that turns a full-width bottom sheet into a readable-width
     * card centred on iPad. 0 on phones.
     */
    sheetInset: Math.max(0, (width - MaxWidth.readable) / 2),
    /** Product grid columns: 2 on phones, 3 on iPad portrait, 4 when wider. */
    productColumns: width >= 1000 ? 4 : isTablet ? 3 : 2,
  };
}
