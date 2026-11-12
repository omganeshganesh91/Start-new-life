// metro.config.js — Expo SDK 51 Metro bundler config
// Aliases native-only packages to web-safe shims when bundling for web.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── Web shims ─────────────────────────────────────────────────────────────────
// Packages that call requireNativeComponent or use native Keystore/Keychain
// crash on web. Map them to lightweight JS-only shims.
const WEB_SHIMS = {
  'expo-linear-gradient':         require.resolve('./src/shims/LinearGradient.web.js'),
  'expo-secure-store':            require.resolve('./src/shims/SecureStore.web.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_SHIMS[moduleName]) {
    return { filePath: WEB_SHIMS[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
