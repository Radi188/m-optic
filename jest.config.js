module.exports = {
  preset: 'react-native',
  // The WebView try-on engine is a separate web build (see tryon-engine/).
  modulePathIgnorePatterns: ['<rootDir>/tryon-engine/'],
  // The RTK/immer packages ship ESM only, so they need transforming too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|immer|@reduxjs|redux|reselect)/)',
  ],
};
