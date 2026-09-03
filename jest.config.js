module.exports = {
  preset: 'react-native',
  // The RTK/immer packages ship ESM only, so they need transforming too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|immer|@reduxjs|redux|reselect)/)',
  ],
};
