import React from 'react';
import renderer, { act } from 'react-test-renderer';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../src/localizations/locales/en.json';

jest.mock('@react-native-vector-icons/ionicons', () => 'Ionicons');

import ImpactDemo from '../src/components/ui/Lens/ImpactDemo';

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

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    interpolation: { escapeValue: false },
  });
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const pressDrop = (tree: any) =>
  tree.root
    .findAll(
      (n: any) =>
        typeof n.props?.onPress === 'function' && n.props.disabled !== undefined,
    )[0]
    .props.onPress();

it('invites a drop before anything has happened', () => {
  let tree: any;
  act(() => {
    tree = renderer.create(<ImpactDemo />);
  });
  const found = texts(tree.toJSON());
  expect(found).toContain(en.LensImpactIdle);
  expect(found).toContain(en.LensImpactDrop);
});

it('shows the outcome once the ball has landed, and offers a re-run', () => {
  let tree: any;
  act(() => {
    tree = renderer.create(<ImpactDemo />);
  });

  act(() => pressDrop(tree));
  act(() => {
    jest.advanceTimersByTime(3000);
  });

  const found = texts(tree.toJSON());
  expect(found).toContain(en.LensImpactResult);
  expect(found).toContain(en.LensImpactAgain);
  expect(found).not.toContain(en.LensImpactIdle);
});
