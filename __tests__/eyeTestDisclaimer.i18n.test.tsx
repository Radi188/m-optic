import React from 'react';
import renderer, { act } from 'react-test-renderer';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../src/localizations/locales/en.json';
import km from '../src/localizations/locales/km.json';
// The icon font is a binary .ttf jest cannot parse; the modal's text is what
// this test is about.
jest.mock('@react-native-vector-icons/ionicons', () => 'Ionicons');

import EyeTestDisclaimerModal from '../src/components/ui/Modal/EyeTestDisclaimerModal';

// Collect every string the modal actually renders.
function texts(tree: any): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (typeof n === 'string') return void out.push(n);
    if (Array.isArray(n)) return void n.forEach(walk);
    if (n && n.children) n.children.forEach(walk);
  };
  walk(tree);
  return out;
}

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, km: { translation: km } },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'km'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
});

const render = () =>
  renderer.create(
    <EyeTestDisclaimerModal visible onAccept={() => {}} onDecline={() => {}} />,
  );

it('renders English copy, not raw keys', () => {
  let tree: any;
  act(() => {
    tree = render();
  });
  const found = texts(tree.toJSON());

  expect(found).toContain('Before you begin');
  expect(found.some(s => s.startsWith('This is a digital self-screening'))).toBe(true);
  expect(found).toContain('Cancel');
  expect(found).toContain('Continue');
  // No string should be a bare translation key.
  expect(found.filter(s => /^EyeTest[A-Za-z]+$/.test(s))).toEqual([]);
});

it('renders Khmer copy after changeLanguage("km")', async () => {
  await act(async () => {
    await i18n.changeLanguage('km');
  });

  let tree: any;
  act(() => {
    tree = render();
  });
  const found = texts(tree.toJSON());

  expect(found).toContain('មុនពេលចាប់ផ្តើម');
  expect(found).toContain('បោះបង់');
  expect(found).toContain('បន្ត');
  expect(found).not.toContain('Before you begin');
});

it('all four disclaimer points resolve in both languages', async () => {
  for (const lng of ['en', 'km'] as const) {
    await act(async () => {
      await i18n.changeLanguage(lng);
    });
    for (let i = 1; i <= 4; i++) {
      const key = `EyeTestDisclaimerPoint${i}`;
      expect(i18n.t(key)).not.toBe(key);
    }
  }
});
