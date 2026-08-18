const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build (used here via expo-sqlite/localStorage/install, see
// store/useOnboardingStore.ts) loads its SQLite engine as a .wasm file in a Web Worker. Metro's
// default assetExts doesn't include "wasm", so without this it tries to resolve the file as a JS
// module and fails to bundle for web at all.
config.resolver.assetExts.push('wasm');

module.exports = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
