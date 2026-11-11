/**
 * Imported first by index.js. Sets up the bits of Expo's runtime that Expo
 * apps get from the `expo` package entry, which this app does not load (it
 * bundles with React Native's Metro config, not Expo's).
 *
 * The polyfills are require()d, not imported: imports are hoisted, and the URL
 * module needs TextDecoder to exist when it is evaluated.
 */
import { Platform } from 'react-native';
import { setDynamicLoadingEnabled } from '@react-native-vector-icons/common';
import { requireOptionalNativeModule } from 'expo-modules-core';

const g = globalThis as unknown as Record<string, unknown>;

// Expo modules read `process.env.EXPO_OS`, which babel-preset-expo inlines in
// Expo apps; here it is set at runtime instead (before any module reads it).
const env = (process.env ?? {}) as Record<string, string | undefined>;
if (!env.EXPO_OS) env.EXPO_OS = Platform.OS;

// Hermes on Android has no TextDecoder. Expo's (self-contained) one, as in
// Expo apps.
if (typeof g.TextDecoder === 'undefined') {
  g.TextDecoder = require('expo/src/winter/TextDecoder').TextDecoder;
}

// React Native's built-in URL has no `pathname` setter, so assignments to it
// are silently dropped. expo-file-system builds every path that way
// (`new File(dir, 'name')` → Paths.join → `url.pathname = …`), so without this
// every File/Directory resolves to its first segment — e.g. Paths.cache
// itself ("Caches couldn't be removed" when a download is moved into place).
// Expo apps install this same URL from expo/src/winter.
const whatwg = require('expo/src/winter/url');
g.URL = whatwg.URL;
g.URLSearchParams = whatwg.URLSearchParams;

// @react-native-vector-icons switches to "dynamic" font loading through
// expo-font as soon as it sees Expo's modules. expo-font 56 is built for React
// Native 0.85 and calls ReactFontManager.getCustomFontFamilies(), which 0.84
// does not have, so on Android every <Ionicons> threw "Call to function
// 'ExpoFontLoader.getLoadedFonts' has been rejected" (NoSuchMethodError). The
// icon fonts are bundled natively on both platforms (as before Expo was
// added), so dynamic loading is not needed. Revisit once the app is on RN 0.85.
// Imported (not required): the package ships separate ESM and CJS builds, and
// the icons import the ESM one, so a require() would switch off a copy of the
// setting that nothing reads.
// On RN 0.84 `globalThis.expo` is only installed by the first native-module
// lookup, and the icons refuse the setting while it is missing (they would
// then turn dynamic loading on by themselves once it appears), so install it
// first.
requireOptionalNativeModule('ExpoFontLoader');
if (!setDynamicLoadingEnabled(false) && __DEV__) {
  console.warn('[setupEnv] Could not turn off vector-icons dynamic font loading.');
}

export {};
