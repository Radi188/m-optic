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
  },
};

module.exports = mergeConfig(defaultConfig, config);