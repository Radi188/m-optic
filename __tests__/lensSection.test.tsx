import React from 'react';
import renderer, { act } from 'react-test-renderer';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../src/localizations/locales/en.json';
import km from '../src/localizations/locales/km.json';
import { LENS_CATEGORIES, localize } from '../src/types/lens';

jest.mock('@react-native-vector-icons/ionicons', () => 'Ionicons');
// The demo runs a looping animation that would keep the test runner alive.
jest.mock('../src/components/ui/Lens/BlueBlockDemo', () => 'BlueBlockDemo');

import LensTechSection from '../src/components/ui/Lens/LensTechSection';

/** Strings in a rendered JSON tree (children live on `.children`). */
function texts(node: any): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (typeof n === 'string') return void out.push(n);
    if (Array.isArray(n)) return void n.forEach(walk);
    if (n && n.children) n.children.forEach(walk);
  };
  walk(node);
  return out;
}

/** Strings inside a React element tree (children live on `.props.children`). */
function elementTexts(node: any): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (typeof n === 'string' || typeof n === 'number') {
      return void out.push(String(n));
    }
    if (Array.isArray(n)) return void n.forEach(walk);
    if (n && n.props && n.props.children !== undefined) walk(n.props.children);
  };
  walk(node);
  return out;
}

/** The pressable whose own label contains `label`. */
function pressableLabelled(tree: any, label: string) {
  return tree.root
    .findAll(
      (n: any) =>
        typeof n.props?.onPress === 'function' &&
        elementTexts(n.props.children).includes(label),
    )
    .pop();
}

const standard = LENS_CATEGORIES[0];
const [first, second] = standard.products;

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, km: { translation: km } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
});

const mount = () => {
  let tree: any;
  act(() => {
    tree = renderer.create(<LensTechSection />);
  });
  return tree;
};

/** Feature bullets only exist inside a rendered card, not on the chips. */
const featureCount = (tree: any, product: (typeof first)) =>
  texts(tree.toJSON()).filter(s =>
    product.features.some(f => (typeof f === 'string' ? f : f.en) === s),
  ).length;

it('shows only the first lens card by default', () => {
  const tree = mount();
  expect(featureCount(tree, first)).toBeGreaterThan(0);
  expect(featureCount(tree, second)).toBe(0);
});

it('swaps the card when another lens chip is pressed', () => {
  const tree = mount();

  // Find the chip whose label is the second lens's name and press it.
  const chip = pressableLabelled(tree, second.name);
  expect(chip).toBeTruthy();

  act(() => chip.props.onPress());

  expect(featureCount(tree, second)).toBeGreaterThan(0);
  expect(featureCount(tree, first)).toBe(0);
});

it('lists every lens as a chip even though one card shows', () => {
  const found = texts(mount().toJSON());
  for (const p of standard.products) expect(found).toContain(p.name);
});

it('resets to the new category\'s first lens when the category changes', () => {
  const tree = mount();
  const photochromic = LENS_CATEGORIES.find(c => c.id === 'photochromic')!;

  // Pick a non-default lens in the current category first…
  act(() => pressableLabelled(tree, second.name).props.onPress());
  expect(featureCount(tree, second)).toBeGreaterThan(0);

  // …then switch category. The stored id no longer exists, so it must land on
  // the new category's first product rather than showing nothing.
  act(() =>
    pressableLabelled(tree, 'Photochromic Lenses (Transitions)').props.onPress(),
  );

  const found = texts(tree.toJSON());
  expect(found).toContain(localize(photochromic.title, 'en'));
  expect(featureCount(tree, second)).toBe(0);
  expect(featureCount(tree, photochromic.products[0])).toBeGreaterThan(0);
});
