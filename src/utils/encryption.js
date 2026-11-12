// ─────────────────────────────────────────────────────────────────────────────
// encryption.js — PIN hashing + secure storage via expo-secure-store
// expo-secure-store uses Android Keystore / iOS Keychain — no native linking
// ─────────────────────────────────────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';

const PIN_HASH_KEY = 'sanl_pin_hash';
const PIN_SET_KEY  = 'sanl_pin_set';

// ── PIN hashing ───────────────────────────────────────────────────────────────
/**
 * Deterministic hash suitable for local PIN storage.
 * Uses a salted XOR-fold — good enough for a local device PIN.
 * For a backend password, use bcrypt or argon2 instead.
 */
const hashPin = (pin) => {
  const salt    = 'SANL_SECURE_SALT_v2';
  const combined = pin + salt;
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
    hash = hash & 0x7fffffff; // keep positive 31-bit
  }
  return hash.toString(16).padStart(8, '0');
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a new PIN (hashed) to the secure keychain.
 * Call this from SetPinScreen when user sets their PIN for the first time.
 * @param {string} pin - 4–6 digit string
 */
export const savePassword = async (pin) => {
  const hashed = hashPin(pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hashed);
  await SecureStore.setItemAsync(PIN_SET_KEY,  'true');
};

/**
 * Verify entered PIN against the stored hash.
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (pin) => {
  try {
    const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
    if (!stored) return false;
    return hashPin(pin) === stored;
  } catch {
    return false;
  }
};

/**
 * Returns true if the user has already set a PIN.
 * @returns {Promise<boolean>}
 */
export const isPasswordSet = async () => {
  try {
    const val = await SecureStore.getItemAsync(PIN_SET_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

/**
 * Delete the stored PIN (for reset / onboarding flow).
 */
export const clearPassword = async () => {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SET_KEY);
};

/**
 * Generic secure key-value storage — wraps expo-secure-store.
 * Values are serialised to JSON automatically.
 */
export const secureSet = async (key, value) => {
  const serialised = typeof value === 'string' ? value : JSON.stringify(value);
  await SecureStore.setItemAsync(key, serialised);
};

/**
 * Generic secure get.  Returns parsed JSON or raw string.
 */
export const secureGet = async (key) => {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val === null || val === undefined) return null;
    try { return JSON.parse(val); } catch { return val; }
  } catch {
    return null;
  }
};

/**
 * Delete a secure value.
 */
export const secureDelete = async (key) => {
  await SecureStore.deleteItemAsync(key);
};
