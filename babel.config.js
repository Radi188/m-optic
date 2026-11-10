module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // three.js (the try-on renderer) ships static class blocks.
    '@babel/plugin-transform-class-static-block',
    'react-native-reanimated/plugin',
  ],
};
