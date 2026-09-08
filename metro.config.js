// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * `expo-sqlite` runs on web through a WebAssembly build of SQLite, which Metro
 * will not bundle unless `.wasm` is treated as an asset. The matching
 * COOP/COEP headers below are what let the worker use SharedArrayBuffer;
 * without them the database fails to open in the browser.
 *
 * Native builds ignore all of this — it exists so the web target stays usable
 * for quick verification.
 */
config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  return middleware(req, res, next);
};

module.exports = config;
