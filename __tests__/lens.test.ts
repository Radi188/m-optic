import {
  BRAND_LENS_CATEGORIES,
  LENS_CATEGORIES,
  localize,
} from '../src/types/lens';
import { thinnerBy, visualThickness } from '../src/components/ui/Lens/ThicknessDemo';
import type { Localized } from '../src/types/lens';

const ALL_CATEGORIES = [...LENS_CATEGORIES, ...BRAND_LENS_CATEGORIES];

const walk = (): Localized[] => {
  const out: Localized[] = [];
  for (const c of ALL_CATEGORIES) {
    out.push(c.name, c.title, c.subtitle, c.recommendedFor, ...c.tips);
    for (const g of c.goodFor ?? []) out.push(g.label);
    if (c.highlight) out.push(c.highlight.title, c.highlight.text);
    for (const p of c.products) {
      out.push(p.coating.label, ...p.features);
      if (p.highlight) out.push(p.highlight.title, p.highlight.text);
    }
  }
  return out;
};

describe('lens catalogue', () => {
  it('picks the right language, and falls back to en', () => {
    const v = { en: 'Blue Blocking Shield', km: 'ខែលការពារពន្លឺខៀវ' };
    expect(localize(v, 'en')).toBe('Blue Blocking Shield');
    expect(localize(v, 'km')).toBe('ខែលការពារពន្លឺខៀវ');
    expect(localize(v, 'km-KH')).toBe('ខែលការពារពន្លឺខៀវ');
    expect(localize(v, 'fr')).toBe('Blue Blocking Shield');
    expect(localize('SHMC Easy-Clean Clear', 'km')).toBe('SHMC Easy-Clean Clear');
  });

  it('never carries a half-filled language pair', () => {
    // A plain string means "not translated yet" and is fine. A pair with one
    // side blank would render an empty label, so it is not.
    const broken = walk().filter(
      v => typeof v === 'object' && (!v.en.trim() || !v.km.trim()),
    );
    expect(broken).toEqual([]);
  });

  it('never renders an empty string in either language', () => {
    for (const v of walk()) {
      if (typeof v === 'string' && !v) continue; // intentional "not supplied yet"
      for (const lng of ['en', 'km']) {
        const out = localize(v, lng);
        expect(typeof out).toBe('string');
      }
    }
  });

  it('keeps every price band complete', () => {
    for (const c of ALL_CATEGORIES) {
      for (const p of c.products) {
        expect(p.tiers.length).toBeGreaterThan(0);
        for (const tier of p.tiers) {
          expect(tier.sph).toBeTruthy();
          // cyl is optional — a "No CYL" band omits it.
          if (tier.cyl !== undefined) expect(tier.cyl).toBeTruthy();
          // Priced once per lens or once per band, never both and never neither.
          if (p.price !== undefined) {
            expect(tier.price).toBeUndefined();
            expect(tier.originalPrice).toBeUndefined();
          } else {
            expect(typeof tier.price).toBe('number');
            if (tier.originalPrice !== undefined) {
              expect(tier.originalPrice).toBeGreaterThan(tier.price!);
            }
          }
        }
      }
    }
  });

  it('has unique ids', () => {
    const catIds = ALL_CATEGORIES.map(c => c.id);
    expect(new Set(catIds).size).toBe(catIds.length);
    for (const c of ALL_CATEGORIES) {
      const ids = c.products.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('high-index thickness maths', () => {
  it('quotes the published reduction for every stocked index', () => {
    expect(thinnerBy(1.56)).toBe(0);
    expect(thinnerBy(1.61)).toBe(26);
    expect(thinnerBy(1.67)).toBe(48);
    expect(thinnerBy(1.74)).toBe(66);
  });

  it('reads between the measured figures for an index inside their range', () => {
    // 1.60 is four fifths of the way from 1.56 (0%) to 1.61 (26%).
    expect(thinnerBy(1.6)).toBe(21);
  });

  it('falls back to the optical derivation beyond the measured range', () => {
    // Edge thickness is proportional to 1/(n-1), relative to the 1.56 baseline.
    expect(thinnerBy(1.9)).toBe(38);
  });

  it('never reports a thinner-than-baseline lens as thicker', () => {
    expect(thinnerBy(1.5)).toBe(0);
    expect(thinnerBy(1.0)).toBe(0);
  });

  it('grows monotonically with the index', () => {
    const vals = [1.56, 1.61, 1.67, 1.74].map(n => thinnerBy(n));
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });
});

describe('all five categories', () => {
  it('are populated, each with its demo', () => {
    expect(LENS_CATEGORIES).toHaveLength(5);
    for (const c of LENS_CATEGORIES) {
      expect(c.products.length).toBeGreaterThan(0);
      expect(c.tips.length).toBeGreaterThan(0);
      expect(localize(c.recommendedFor, 'en')).toBeTruthy();
      expect(c.demo).toBeTruthy();
    }
  });

  it('gives each category a distinct demo widget', () => {
    expect(LENS_CATEGORIES.map(c => c.demo)).toEqual([
      'blueBlock',
      'thickness',
      'photochromic',
      'zonesBifocal',
      'zonesProgressive',
    ]);
  });

  it('quotes ADD rather than CYL on the multifocals', () => {
    for (const id of ['bifocal', 'progressive']) {
      const cat = LENS_CATEGORIES.find(c => c.id === id)!;
      for (const p of cat.products) {
        for (const tier of p.tiers) {
          expect(tier.add).toBeTruthy();
          expect(tier.cyl).toBeUndefined();
        }
      }
    }
  });

  it('never ships a leaked translation key as catalogue copy', () => {
    // The source page rendered raw keys like "LensesPage.catalog_bf_v1_feat_5"
    // for two bifocal features; those must not be copied in as text.
    const suspicious = /LensesPage\.|catalog_|_feat_|\{\{/;
    for (const c of LENS_CATEGORIES) {
      for (const p of c.products) {
        for (const f of p.features) {
          const text = typeof f === 'string' ? f : `${f.en} ${f.km}`;
          expect(text).not.toMatch(suspicious);
        }
      }
    }
  });

  it('matches the published prices for the last three categories', () => {
    const bands = (cat: string, id: string) =>
      LENS_CATEGORIES.find(c => c.id === cat)!
        .products.find(p => p.id === id)!
        .tiers.map(t => [t.price, t.originalPrice]);

    expect(bands('photochromic', 'uv400-photo-grey')).toEqual([[17, 22], [20, undefined]]);
    expect(bands('photochromic', 'blue-block-photochromic')).toEqual([[27, 32], [37, 42]]);
    expect(bands('photochromic', '156-shmc-photo-grey')).toEqual([[35, 50], [45, 65]]);
    expect(bands('photochromic', '156-red-photo-grey')).toEqual([[35, undefined], [50, undefined]]);

    expect(bands('bifocal', 'bifocal-red-clear')).toEqual([[25, undefined]]);
    expect(bands('bifocal', 'bifocal-red-photochromic')).toEqual([[35, undefined]]);
    expect(bands('bifocal', 'bifocal-shmc-photochromic')).toEqual([[35, undefined]]);

    expect(bands('progressive', 'progressive-clear')).toEqual([[40, undefined], [45, undefined]]);
    expect(bands('progressive', 'progressive-black-photochromic')).toEqual([[50, undefined], [55, undefined]]);
  });
});

describe('clear thin category', () => {
  const cat = LENS_CATEGORIES.find(c => c.id === 'clear-thin')!;

  it('is populated and carries its demo', () => {
    expect(cat.products).toHaveLength(4);
    expect(cat.demo).toBe('thickness');
    expect(cat.tips).toHaveLength(2);
    expect(localize(cat.recommendedFor, 'en')).toContain('SPH from -2.00');
  });

  it('keeps the no-CYL band, with its note', () => {
    const crystal = cat.products.find(p => p.id === '167-crystal-clear')!;
    const band = crystal.tiers[1];
    expect(band.cyl).toBeUndefined();
    expect(band.note).toBe('No CYL');
    expect(band.price).toBe(80);
  });

  it('matches the published prices', () => {
    const price = (id: string) =>
      cat.products.find(p => p.id === id)!.tiers.map(t => [t.price, t.originalPrice]);

    expect(price('161-shmc-clear')).toEqual([[35, 50], [45, 65]]);
    expect(price('161-mr8')).toEqual([[45, 50], [55, 60]]);
    expect(price('167-shmc-clear')).toEqual([[60, 75], [70, 85]]);
    expect(price('167-crystal-clear')).toEqual([[70, undefined], [80, undefined]]);
  });
});

describe('branded lens tabs', () => {
  it('are the four brand tabs, in order, each with its demo', () => {
    expect(BRAND_LENS_CATEGORIES.map(c => c.name)).toEqual([
      'HOYA Nulux Full Control',
      'Essilor Crizal 1.56 AS',
      'Essilor AirWear 1.59',
      'Essilor Transitions',
    ]);
    expect(BRAND_LENS_CATEGORIES.map(c => c.demo)).toEqual([
      'thickness',
      'blueBlock',
      'impact',
      'photochromic',
    ]);
    for (const c of BRAND_LENS_CATEGORIES) {
      expect(c.goodFor?.length).toBeGreaterThan(0);
      expect(c.tips).toHaveLength(2);
      expect(localize(c.subtitle, 'en')).toBeTruthy();
      expect(localize(c.recommendedFor, 'en')).toBeTruthy();
    }
  });

  it('matches the published price per lens', () => {
    const prices = Object.fromEntries(
      BRAND_LENS_CATEGORIES.flatMap(c => c.products).map(p => [p.id, p.price]),
    );
    expect(prices).toEqual({
      'nulux-fc-155': 80,
      'nulux-fc-153': 125,
      'nulux-fc-160': 125,
      'nulux-fc-167': 200,
      'eyezen-start-156': 100,
      'crizal-sapphire-hr-blue-156': 80,
      'crizal-156': 45,
      'airwear-crizal-sapphire-hr-159': 125,
      'transitions-gens-sapphire-hr-16': 225,
      'transitions-classic-easypro-156': 100,
    });
  });

  it('offers the HOYA Nulux indices in the thickness demo, against 1.55', () => {
    const hoya = BRAND_LENS_CATEGORIES[0];
    expect(hoya.demoIndices).toEqual([1.55, 1.53, 1.6, 1.67]);
    // One button per Nulux lens, in the order the lenses are listed.
    expect(hoya.products.map(p => Number(p.name.match(/\d\.\d\d$/)![0]))).toEqual(
      hoya.demoIndices,
    );
    expect(thinnerBy(1.55, 1.55)).toBe(0);
    // 1.53 is not thinner than the 1.55 baseline, so it claims nothing.
    expect(thinnerBy(1.53, 1.55)).toBe(0);
    expect(thinnerBy(1.6, 1.55)).toBe(21);
    expect(thinnerBy(1.67, 1.55)).toBe(48);
  });

  it('quotes max compensation on every HOYA band', () => {
    const hoya = BRAND_LENS_CATEGORIES[0];
    for (const p of hoya.products) {
      for (const tier of p.tiers) expect(tier.maxComp).toBeTruthy();
    }
  });
});

describe('headline benefits', () => {
  it('gives every branded tab and every branded lens its own benefit', () => {
    for (const c of BRAND_LENS_CATEGORIES) {
      expect([c.id, !!c.highlight]).toEqual([c.id, true]);
      for (const p of c.products) {
        expect([p.id, !!p.highlight]).toEqual([p.id, true]);
      }
    }
  });

  it('never repeats a lens benefit within a tab', () => {
    for (const c of BRAND_LENS_CATEGORIES) {
      const titles = c.products.map(p => localize(p.highlight!.title, 'en'));
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it('leads Eyezen with its big optical centre', () => {
    const eyezen = BRAND_LENS_CATEGORIES.flatMap(c => c.products).find(
      p => p.id === 'eyezen-start-156',
    );
    expect(localize(eyezen!.highlight!.title, 'en')).toBe('Big optical centre');
  });
});
