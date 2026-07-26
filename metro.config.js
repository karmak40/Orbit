// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation (wa-sqlite) imports its engine as a .wasm
// asset. Metro doesn't treat .wasm as an asset by default, so the web bundle
// fails to resolve it without this.
config.resolver.assetExts.push('wasm');

module.exports = config;
