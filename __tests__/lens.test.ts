import { LENS_CATEGORIES, localize } from '../src/types/lens';
import { thinnerBy } from '../src/components/ui/Lens/ThicknessDemo';
import type { Localized } from '../src/types/lens';

const walk = (): Localized[] => {
  const out: Localized[] = [];
  for (const c of LENS_CATEGORIES) {
    out.push(c.name, c.title, c.subtitle, c.recommendedFor, ...c.tips);
    for (const p of c.products) out.push(p.coating.label, ...p.features);
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
    for (const c of LENS_CATEGORIES) {
      for (const p of c.products) {
        expect(p.tiers.length).toBeGreaterThan(0);
        for (const tier of p.tiers) {
          expect(tier.sph).toBeTruthy();
          // cyl is optional — a "No CYL" band omits it.
          if (tier.cyl !== undefined) expect(tier.cyl).toBeTruthy();
          expect(typeof tier.price).toBe('number');
          if (tier.originalPrice !== undefined) {
            expect(tier.originalPrice).toBeGreaterThan(tier.price);
          }
        }
      }
    }
  });

  it('has unique ids', () => {
    const catIds = LENS_CATEGORIES.map(c => c.id);
    expect(new Set(catIds).size).toBe(catIds.length);
    for (const c of LENS_CATEGORIES) {
      const ids = c.products.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('high-index thickness maths', () => {
  it('derives the reduction from the refractive index', () => {
    // Edge thickness is proportional to 1/(n-1), relative to the 1.56 baseline.
    expect(thinnerBy(1.56)).toBe(0);
    expect(thinnerBy(1.61)).toBe(8);
    expect(thinnerBy(1.67)).toBe(16);
    expect(thinnerBy(1.74)).toBe(24);
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
