/**
 * Lens technology catalogue — the content behind the home screen's lens guide.
 *
 * This is shop catalogue data, not API data: it is written here rather than
 * fetched because there is no endpoint for it yet.
 *
 * Descriptive copy can carry both languages inline as `{ en, km }` rather than
 * going through i18n keys. Catalogue content changes as a unit — a new lens
 * arrives with its features and pricing together — so keeping each lens's
 * wording in one place is easier for the shop to maintain than 40-odd product
 * keys scattered through the locale files.
 *
 * TODO(khmer): every string below is currently a plain string, which renders
 * the same text in both languages. The machine-written Khmer that used to be
 * here was wrong and has been removed — showing English is honest, showing bad
 * Khmer is not. As the shop supplies reviewed copy, change a string to
 * `{ en: '…', km: '…' }`; `localize()` picks it up with no other change.
 */

/** A plain string is used as-is in both languages; a pair is picked by locale. */
export type Localized = string | { en: string; km: string };

export function localize(value: Localized, language: string): string {
  if (typeof value === 'string') return value;
  return language.startsWith('km') ? value.km : value.en;
}

export type LensTier = {
  /** Sphere range this price applies to, e.g. "0.00 to -8.00". */
  sph: string;
  /** Cylinder range, e.g. "0.00 to -2.00". Omitted for a no-CYL band. */
  cyl?: string;
  /** Reading addition, e.g. "+1.00 to +3.00" — multifocals quote ADD, not CYL. */
  add?: string;
  price: number;
  /** Pre-discount price; renders struck through when present. */
  originalPrice?: number;
  /** Qualifier shown beside the range, e.g. "No Discount". */
  note?: string;
};

export type LensProduct = {
  id: string;
  /** SKU name — not translated. */
  name: string;
  /** The coating badge — label plus its dot colour. */
  coating: { label: Localized; color: string };
  features: Localized[];
  tiers: LensTier[];
};

export type LensCategory = {
  id: string;
  /** Tab label. */
  name: Localized;
  title: Localized;
  subtitle: Localized;
  /** Empty string when the shop has not supplied copy for this category yet. */
  recommendedFor: Localized;
  products: LensProduct[];
  tips: Localized[];
  /** Which interactive demo to show, if any. */
  demo?: 'blueBlock' | 'thickness' | 'photochromic' | 'zonesBifocal' | 'zonesProgressive';
};

const COATING = {
  green: '#2DBD7E',
  blue: '#3B82F6',
  gold: '#2DBD7E',
  red: '#F0426E',
};

export const LENS_CATEGORIES: LensCategory[] = [
  {
    id: 'standard-clear',
    name: 'Standard Clear Lenses',
    title: 'Standard Clear Lenses',
    subtitle: 'Clear everyday lenses with UV & screen protection.',
    recommendedFor: 'Ideal for digital device users, office workers, and general everyday wear.',
    demo: 'blueBlock',
    products: [
      {
        id: 'uv400-clear',
        name: 'UV400 Clear',
        coating: { label: 'Green Anti-Reflection', color: COATING.green },
        features: [
          'UV400 Sun Protection',
          '60% Blue Light Block',
          'Basic Anti-Glare Protection',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 10 },
          {
            sph: '-6.25 to -8.00',
            cyl: '0.00 to -4.00',
            price: 10,
            note: 'No Discount',
          },
        ],
      },
      {
        id: 'blue-block-clear',
        name: 'BLUE BLOCK Clear',
        coating: { label: 'Blue Blocking Shield', color: COATING.blue },
        features: [
          'UV420 Screen Safety',
          '100% Digital Blue Light Block',
          'Reduces Screen Eye Fatigue',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 15 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 25 },
        ],
      },
      {
        id: 'shmc-easy-clean',
        name: 'SHMC Easy-Clean Clear',
        coating: { label: 'Hydrophobic Easy-Clean', color: COATING.blue },
        features: [
          'Super Hydrophobic Layer (SHMC)',
          '100% Blue Light Block',
          'Scratch-resistant & Dust-repellent',
        ],
        tiers: [
          {
            sph: '0.00 to -8.00',
            cyl: '0.00 to -2.00',
            price: 20,
            originalPrice: 30,
          },
          {
            sph: '-6.25 to -8.00',
            cyl: '0.00 to -4.00',
            price: 30,
            originalPrice: 45,
          },
        ],
      },
      {
        id: 'gold-premium',
        name: '1.56 GOLD Premium Coating Clear',
        coating: { label: 'German Gold Coating', color: COATING.gold },
        features: [
          'German Premium Gold Protection',
          'Super Hydrophobic (SHMC)',
          '100% Blue Light Filter',
          'Highest Durability',
          'Less Coating Technology',
          'Repels dust, smoke and fog',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 25 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 35 },
        ],
      },
      {
        id: 'red-premium',
        name: '1.56 RED Premium Coating Clear',
        coating: { label: 'German Red Coating', color: COATING.red },
        features: [
          'Premium German Red Anti-Reflection',
          '100% Blue Light Filter',
          'Slick & Easy Clean',
          'High contrast visual field',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 25 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 35 },
        ],
      },
    ],
    tips: [
      'Ideal for office workers who spend long hours looking at computer screens.',
      'Anti-reflection coatings help reduce halo effects during night driving.',
    ],
  },

  // The remaining categories are listed so the tabs are complete, but their
  // rows are intentionally empty — no lens specs or prices are invented here.
  // Fill in `products`, `recommendedFor` and `tips` when the shop supplies them.
  {
    id: 'clear-thin',
    name: 'Clear Thin Lenses (High-Index)',
    title: 'Clear Thin Lenses (High-Index)',
    subtitle: 'Ultra-thin, lightweight lenses for high prescriptions.',
    recommendedFor: 'Highly recommended for moderate to strong prescriptions (SPH from -2.00 and above) who want thin, aesthetic lenses.',
    demo: 'thickness',
    products: [
      {
        id: '161-shmc-clear',
        name: '1.61 SHMC Clear',
        coating: { label: 'Green Anti-Reflection', color: COATING.green },
        features: [
          'Refractive Index 1.61 (Thin)',
          '100% Blue Light Protection',
          'Super Hydrophobic Easy-Clean Coating',
        ],
        tiers: [
          { sph: '0.00 to -10.00', cyl: '0.00 to -2.00', price: 35, originalPrice: 50 },
          { sph: '-6.25 to -10.00', cyl: '0.00 to -4.00', price: 45, originalPrice: 65 },
        ],
      },
      {
        id: '161-mr8',
        name: '1.61 MR8 Impact Resistant',
        coating: { label: 'Red Anti-Reflection', color: COATING.red },
        features: [
          'Premium German MR-8 Material',
          'Tough & Flexible Lens Material',
          'Thin & Lightweight Profile',
          '100% Blue Light Block',
          'Super Hydrophobic',
        ],
        tiers: [
          { sph: '0.00 to -10.00', cyl: '0.00 to -2.00', price: 45, originalPrice: 50 },
          { sph: '-6.25 to -10.00', cyl: '0.00 to -4.00', price: 55, originalPrice: 60 },
        ],
      },
      {
        id: '167-shmc-clear',
        name: '1.67 SHMC Clear',
        coating: { label: 'Green Anti-Reflection', color: COATING.green },
        features: [
          'Refractive Index 1.67 (Extra Thin)',
          '100% Blue Light Block',
          'Hydrophobic Easy-Clean Profile',
        ],
        tiers: [
          { sph: '-2.00 to -10.00', cyl: '0.00 to -2.00', price: 60, originalPrice: 75 },
          { sph: '-8.25 to -10.00', cyl: '0.00 to -2.00', price: 70, originalPrice: 85 },
        ],
      },
      {
        id: '167-crystal-clear',
        name: '1.67 Crystal Clear',
        coating: { label: 'Blue Protective Coat', color: COATING.blue },
        features: [
          'German Premium Quality',
          'Extreme thickness reduction',
          'Accommodates SPH up to -15.00',
          'Hydrophobic finish',
        ],
        tiers: [
          { sph: '-2.00 to -15.00', cyl: '0.00 to -2.00', price: 70 },
          { sph: '-9.00 to -15.00', price: 80, note: 'No CYL' },
        ],
      },
    ],
    tips: [
      "Stronger prescriptions benefit greatly from 1.67 or 1.74 lenses to reduce the 'bug-eye' magnification effect.",
      'Thin lenses are up to 50% lighter, keeping your glasses securely on your face without nose strain.',
    ],
  },
  {
    id: 'photochromic',
    name: 'Photochromic Lenses (Transitions)',
    title: 'Photochromic Lenses (Transitions)',
    subtitle: 'Light-adaptive lenses that darken automatically outdoors.',
    recommendedFor: 'Recommended for people sensitive to sunlight, frequent outdoor workers, or daytime drivers.',
    demo: 'photochromic',
    products: [
      {
        id: 'uv400-photo-grey',
        name: 'UV400 Light Photo Grey',
        coating: { label: 'Adaptive UV Shield', color: COATING.blue },
        features: [
          'Quick UV Reaction',
          'Lightweight Everyday Comfort',
          'Clear Indoor Vision',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 17, originalPrice: 22 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 20 },
        ],
      },
      {
        id: 'blue-block-photochromic',
        name: 'BLUE BLOCK Photochromic',
        coating: { label: 'Blue Shield + Transition', color: COATING.blue },
        features: [
          'UV420 & Blue Light Filter',
          'Deep Outdoor Tint',
          'Dual Digital & Sun Safety',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 27, originalPrice: 32 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 37, originalPrice: 42 },
        ],
      },
      {
        id: '156-shmc-photo-grey',
        name: '1.56 SHMC Photo Grey',
        coating: { label: 'Super Hydrophobic Photo', color: COATING.green },
        features: [
          'Rapid Outdoor Darkening',
          'Hydrophobic Water & Oil Repellent',
          'Scratch-resistant Clear Layer',
          'Japanese technology',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 35, originalPrice: 50 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 45, originalPrice: 65 },
        ],
      },
      {
        id: '156-red-photo-grey',
        name: '1.56 RED Photo Grey',
        coating: { label: 'Crystal Drive Transition', color: COATING.red },
        features: [
          'Automotive & Road Anti-Glare',
          'Fast Solar Activation',
          'Enhanced Contrast & Crispness',
          'German Quality Layer',
        ],
        tiers: [
          { sph: '0.00 to -8.00', cyl: '0.00 to -2.00', price: 35 },
          { sph: '-6.25 to -8.00', cyl: '0.00 to -4.00', price: 50 },
        ],
      },
    ],
    tips: [
      'Photochromic lenses replace the need to switch between regular glasses and sunglasses.',
      'Quick-transition technology reacts in seconds when exposed to direct sunlight.',
    ],
  },
  {
    id: 'bifocal',
    name: 'Bifocal Lenses (2-Zones)',
    title: 'Bifocal Lenses (2-Zones)',
    subtitle: 'Dual-vision lenses for near and distance viewing.',
    recommendedFor: 'Ideal for customers over 40 needing both distance vision and reading correction in one frame.',
    demo: 'zonesBifocal',
    products: [
      {
        id: 'bifocal-red-clear',
        name: 'Bifocal RED Clear',
        coating: { label: 'Premium Red Anti-Glare', color: COATING.red },
        features: [
          'Clear Round-Top Reading Zone',
          'Distance Vision Top',
          'Anti-Glare Coating',
          'Relieves reading fatigue',
        ],
        tiers: [
          { sph: '+3.00 to -3.00', add: '+1.00 to +3.00', price: 25 },
        ],
      },
      {
        id: 'bifocal-red-photochromic',
        name: 'Bifocal RED Photochromic',
        coating: { label: 'Red Photochromic', color: COATING.red },
        features: [
          'Sun-Adaptive Dual-Zone',
          'Indoor Clarity + Outdoor Shade',
          'UV400 Full Protection',
          'Dual-Vision Convenience',
        ],
        tiers: [
          { sph: '+3.00 to -3.00', add: '+1.00 to +3.00', price: 35 },
        ],
      },
      {
        id: 'bifocal-shmc-photochromic',
        name: 'Bifocal SHMC Photochromic',
        coating: { label: 'Hydrophobic Photochromic', color: COATING.green },
        features: [
          'Super Hydrophobic Easy-Clean',
          'Scratch & Smudge Resistant',
          'Fast Light Adaptation',
          'Dual-Vision Convenience',
        ],
        tiers: [
          { sph: '+3.00 to -3.00', add: '+1.00 to +3.00', price: 35 },
        ],
      },
    ],
    tips: [
      'Bifocals eliminate the hassle of taking reading glasses on and off throughout the day.',
      'The visible reading segment provides a dedicated, wide sweet spot for close-up reading.',
    ],
  },
  {
    id: 'progressive',
    name: 'Progressive Lenses (Corridor)',
    title: 'Progressive Lenses (Corridor)',
    subtitle: 'Seamless multifocal lenses for all distances without lines.',
    recommendedFor: 'Highly recommended for individuals aged 40 and above experiencing presbyopia who want seamless, line-free multi-distance vision.',
    demo: 'zonesProgressive',
    products: [
      {
        id: 'progressive-clear',
        name: 'Progressive Clear',
        coating: { label: 'Green Anti-Reflection', color: COATING.green },
        features: [
          '100% Blue light filter',
          'Super Hydrophobic layer (SHMC)',
          'Wide visual corridor',
          'Japanese technology',
        ],
        tiers: [
          { sph: '0.00', add: '+1.00 to +3.00', price: 40 },
          { sph: '-0.25 to -3.00', add: '+1.00 to +3.00', price: 45 },
        ],
      },
      {
        id: 'progressive-black-photochromic',
        name: 'Progressive Black Photochromic',
        coating: { label: 'Green Anti-Reflection', color: COATING.green },
        features: [
          'UV420 responsive transition (Grey)',
          '100% Blue light block',
          'Super Hydrophobic layer',
          'German technology',
        ],
        tiers: [
          { sph: '0.00', add: '+1.00 to +3.00', price: 50 },
          { sph: '-0.25 to -3.00', add: '+1.00 to +3.00', price: 55 },
        ],
      },
    ],
    tips: [
      'Highly recommended for individuals aged 40 and above facing presbyopia.',
      "Offers a natural visual flow without the image 'jump' associated with lined bifocals.",
    ],
  },
];
