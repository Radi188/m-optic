/**
 * The website's cover-box, as numbers: the analysed frame is object-fit:
 * cover'ed into the view (exactly how the camera preview is shown), and the
 * view sees the centred window of it. The GL camera renders that window with
 * `setViewOffset`; the photo compositor crops the same window.
 */

export interface CoverGeometry {
  /** Full analysed-frame box, cover-fitted to the view, in view points. */
  coverWidth: number;
  coverHeight: number;
  /** The visible window inside it. */
  viewX: number;
  viewY: number;
  viewWidth: number;
  viewHeight: number;
}

/** object-fit: cover of a `frameAspect` image into a `width`×`height` view. */
export function coverGeometry(width: number, height: number, frameAspect: number): CoverGeometry {
  const coverWidth = width / height > frameAspect ? width : height * frameAspect;
  const coverHeight = width / height > frameAspect ? width / frameAspect : height;
  return {
    coverWidth,
    coverHeight,
    viewX: (coverWidth - width) / 2,
    viewY: (coverHeight - height) / 2,
    viewWidth: width,
    viewHeight: height,
  };
}
