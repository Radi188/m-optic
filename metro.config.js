const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
  transformer: {
    // The React Native entry explicitly: the default one switches to Expo's
    // transformer whenever the `expo` package is installed (Expo modules).
    babelTransformerPath: require.resolve('react-native-svg-transformer/react-native'),
  },
  resolver: {
    // ❗ REMOVE svg from assetExts
    assetExts: assetExts
      .filter(ext => ext !== 'svg')
      .concat(['obj', 'mtl', 'glb', 'gltf']),

    // ❗ ADD svg to sourceExts
    sourceExts: [...sourceExts, 'svg'],

    // The try-on native module keeps its iOS/Android sources and their build
    // output next to its JS (src/features/try-on/native); Metro has no use
    // for them, and Gradle's .cxx folders are large.
    blockList: [/src\/features\/try-on\/native\/(android|ios|nitrogen)\/.*/],

    // One copy of three.js. Its package maps `import` to three.module.js and
    // `require` to three.cjs, so ESM code (the try-on, GLTFLoader) and CJS code
    // (@react-three/fiber/native) got different copies — and R3F's native
    // TextureLoader/FileLoader patches only reached the CJS one, so every glTF
    // texture failed to load ("Multiple instances of Three.js").
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'three') {
        return { type: 'sourceFile', filePath: require.resolve('three') };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);