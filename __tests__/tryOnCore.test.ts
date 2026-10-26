import {
  buildProductVTOFrames,
  calibrationForProduct,
  frameWidthMmForProduct,
  glbAssets,
  isRimlessFrame,
} from '../src/features/try-on/core/productCalibration';
import { FRAME_RECOMMENDATIONS, FACE_SHAPES } from '../src/features/try-on/core/faceShapeTypes';
import en from '../src/localizations/locales/en.json';
import km from '../src/localizations/locales/km.json';

const glb = { id: 7, url: 'https://x/a.glb', type: '3d_model', format: 'glb' };

describe('try-on calibration (ported from the website)', () => {
  it('matches the shape by id', () => {
    expect(calibrationForProduct({ frame_shape: { id: 2, name: 'whatever' } }).bridgeOffset[1]).toBe(2.9);
    expect(isRimlessFrame({ frame_shape: { id: 11 } })).toBe(true);
  });

  it('matches a Khmer shape name when the id is unknown', () => {
    expect(calibrationForProduct({ frame_shape: { id: 999, name: 'ការ៉េ' } }).bridgeOffset[1]).toBe(2.9);
    expect(isRimlessFrame({ frame_shape: { id: 999, name: 'គ្មានស៊ុម' } })).toBe(true);
    expect(calibrationForProduct({ frame_shape: { id: 999, name: 'Rimless' } }).bridgeOffset[1]).toBe(1.5);
  });

  it('falls back to the default profile for an unknown or missing shape', () => {
    expect(calibrationForProduct({ frame_shape: { id: 9, name: 'Geometric' } }).bridgeOffset).toEqual([0, 2.5, -0.12]);
    expect(calibrationForProduct({}).calibration.scaleMultiplier).toBe(1.2);
  });
});

describe('frame width from hinge_to_hinge', () => {
  it('uses a plausible width', () => {
    expect(frameWidthMmForProduct({ measurements: { hinge_to_hinge: 136 } })).toBe(136);
  });

  it('treats a bad width as missing, so the frame fits the face instead', () => {
    expect(frameWidthMmForProduct({ measurements: { hinge_to_hinge: 13.6 } })).toBeUndefined();
    expect(frameWidthMmForProduct({ measurements: { hinge_to_hinge: 0 } })).toBeUndefined();
    expect(frameWidthMmForProduct({ measurements: { hinge_to_hinge: null } })).toBeUndefined();
    expect(frameWidthMmForProduct({ measurements: { hinge_to_hinge: 1360 } })).toBeUndefined();
  });

  it('takes a colourway width from its parent', () => {
    expect(frameWidthMmForProduct({ measurements: null }, { measurements: { hinge_to_hinge: 140 } })).toBe(140);
  });
});

describe('try-on frames from a product', () => {
  it('only counts 3d_model + glb assets', () => {
    expect(
      glbAssets([
        glb,
        { id: 8, url: 'https://x/a.jpg', type: 'gallery', format: 'jpg' },
        { id: 9, url: 'https://x/a.usdz', type: '3d_model', format: 'usdz' },
      ]),
    ).toEqual([glb]);
  });

  it('has no frames (so no Try On) without a GLB', () => {
    expect(buildProductVTOFrames({ name: 'A' }, [])).toEqual([]);
    expect(buildProductVTOFrames({ name: 'A' }, null)).toEqual([]);
  });

  it('builds a frame with the shape calibration and width', () => {
    const [frame] = buildProductVTOFrames(
      { name: 'Square One', frame_shape: { id: 2 }, measurements: { hinge_to_hinge: 138 } },
      [glb],
    );
    expect(frame).toMatchObject({ id: '7', name: 'Square One', glbPath: glb.url, frameWidthMm: 138 });
    expect(frame.bridgeOffset).toEqual([0, 2.9, -0.12]);
  });

  it('lets a colourway borrow the parent shape and name', () => {
    const parent = { name: 'Parent', frame_shape: { id: 11 }, measurements: { hinge_to_hinge: 132 } };
    const [frame] = buildProductVTOFrames({ name: null, frame_shape: null }, [glb], parent);
    expect(frame.name).toBe('Parent');
    expect(frame.frameWidthMm).toBe(132);
    expect(frame.bridgeOffset[1]).toBe(1.5); // rimless
  });
});

describe('try-on text', () => {
  const enT = (en as any).TryOn as Record<string, string>;
  const kmT = (km as any).TryOn as Record<string, string>;

  it('has the same keys in English and Khmer, none empty', () => {
    expect(Object.keys(kmT).sort()).toEqual(Object.keys(enT).sort());
    for (const k of Object.keys(enT)) expect(kmT[k].trim()).not.toBe('');
  });

  it('labels every face shape and every recommended frame shape', () => {
    for (const shape of FACE_SHAPES) {
      expect(enT[`face_shape_${shape}`]).toBeTruthy();
      for (const frame of FRAME_RECOMMENDATIONS[shape]) {
        expect(enT[`frame_shape_${frame}`]).toBeTruthy();
      }
    }
  });
});
