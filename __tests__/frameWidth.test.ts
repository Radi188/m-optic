import { frameWidthMm } from '../src/utils/productMedia';

const m = (over: Record<string, number | null>) => ({
  hinge_to_hinge: null,
  lens_width: null,
  lens_height: null,
  bridge_size: null,
  temple_length: null,
  ...over,
});

describe('frameWidthMm (AR try-on sizing)', () => {
  it('uses hinge to hinge when the shop entered it', () => {
    expect(frameWidthMm(m({ hinge_to_hinge: 136, lens_width: 52, bridge_size: 18 }))).toBe(136);
  });

  it('rebuilds the width from two lenses, the bridge and the end pieces', () => {
    // 2 x 52 + 18 + 10
    expect(frameWidthMm(m({ lens_width: 52, bridge_size: 18 }))).toBe(132);
  });

  it('ignores implausible figures rather than sizing the try-on with them', () => {
    expect(frameWidthMm(m({ hinge_to_hinge: 13.6 }))).toBeNull(); // cm typed as mm
    expect(frameWidthMm(m({ hinge_to_hinge: 0 }))).toBeNull();
    expect(frameWidthMm(m({ hinge_to_hinge: 1360 }))).toBeNull();
  });

  it('falls back to lens + bridge when hinge to hinge is implausible', () => {
    expect(frameWidthMm(m({ hinge_to_hinge: 0, lens_width: 50, bridge_size: 20 }))).toBe(130);
  });

  it('returns null without measurements', () => {
    expect(frameWidthMm(null)).toBeNull();
    expect(frameWidthMm(m({ lens_width: 52 }))).toBeNull();
  });
});
