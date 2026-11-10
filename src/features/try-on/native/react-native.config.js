// Autolinking for the try-on native module (see package.json).
module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        packageImportPath: 'import com.margelo.nitro.moptic.vto.MOpticVTOPackage;',
        packageInstance: 'new MOpticVTOPackage()',
      },
    },
  },
};
