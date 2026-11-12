// jest.setup.js
global.__DEV__ = true;

// Silence noisy console.warn in tests (keep errors visible)
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('GeminiService') ||
     msg.includes('ApiService') ||
     msg.includes('Firebase') ||
     msg.includes('Animated:'))
  ) return;
  originalWarn(...args);
};
