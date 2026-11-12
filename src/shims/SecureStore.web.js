// ─────────────────────────────────────────────────────────────────────────────
// src/shims/SecureStore.web.js
// Web-safe shim for expo-secure-store.
// Falls back to localStorage on web (not cryptographically secure,
// but fine for a PIN hash in a browser dev/demo environment).
// ─────────────────────────────────────────────────────────────────────────────

export const setItemAsync = async (key, value) => {
  try {
    localStorage.setItem(`sanl_secure_${key}`, value);
  } catch (e) {
    console.warn('SecureStore.web setItemAsync:', e.message);
  }
};

export const getItemAsync = async (key) => {
  try {
    return localStorage.getItem(`sanl_secure_${key}`);
  } catch (e) {
    console.warn('SecureStore.web getItemAsync:', e.message);
    return null;
  }
};

export const deleteItemAsync = async (key) => {
  try {
    localStorage.removeItem(`sanl_secure_${key}`);
  } catch (e) {
    console.warn('SecureStore.web deleteItemAsync:', e.message);
  }
};
