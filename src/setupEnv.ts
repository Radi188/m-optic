/**
 * Imported first by index.js. Sets up the bits of Expo's runtime that Expo
 * apps get from the `expo` package entry, which this app does not load (it
 * bundles with React Native's Metro config, not Expo's).
 *
 * The polyfills are require()d, not imported: imports are hoisted, and the URL
 * module needs TextDecoder to exist when it is evaluated.
 */
import { Platform } from 'react-native';

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

export {};
