const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    // ❗ REMOVE svg from assetExts
    assetExts: assetExts
      .filter(ext => ext !== 'svg')
      .concat(['obj', 'mtl', 'glb', 'gltf']),

    // ❗ ADD svg to sourceExts
    sourceExts: [...sourceExts, 'svg'],

    // The WebView try-on engine is a separate web build with its own
    // node_modules (react-dom, three, MediaPipe). Its output reaches the app as
    // src/features/try-on/engine/engineBundle.generated.ts, so Metro must
    // never resolve into it — a second React would break the app.
    blockList: [/tryon-engine\/.*/],
  },
};

module.exports = mergeConfig(defaultConfig, config);