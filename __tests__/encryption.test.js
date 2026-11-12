// ─────────────────────────────────────────────────────────────────────────────
// __tests__/encryption.test.js — Sanity tests for PIN encryption utils
// ─────────────────────────────────────────────────────────────────────────────

// Mock the secure store used by the PIN utilities.
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    setItemAsync:    jest.fn((key, val) => { store[key] = val; return Promise.resolve(); }),
    getItemAsync:    jest.fn((key) => Promise.resolve(store[key] ?? null)),
    deleteItemAsync: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
    clear:      jest.fn(() => Promise.resolve()),
  };
});

import {
  savePassword,
  verifyPassword,
  isPasswordSet,
  clearPassword,
  secureSet,
  secureGet,
} from '../src/utils/encryption';

describe('Encryption / PIN utilities', () => {
  beforeEach(async () => {
    await clearPassword();
  });

  test('isPasswordSet returns false when no password saved', async () => {
    const result = await isPasswordSet();
    expect(result).toBe(false);
  });

  test('savePassword + isPasswordSet returns true', async () => {
    await savePassword('1234');
    const result = await isPasswordSet();
    expect(result).toBe(true);
  });

  test('verifyPassword returns true for correct PIN', async () => {
    await savePassword('5678');
    const ok = await verifyPassword('5678');
    expect(ok).toBe(true);
  });

  test('verifyPassword returns false for wrong PIN', async () => {
    await savePassword('1111');
    const ok = await verifyPassword('9999');
    expect(ok).toBe(false);
  });

  test('two different PINs produce different hashes', async () => {
    await savePassword('1234');
    const ok1 = await verifyPassword('1234');
    const ok2 = await verifyPassword('1235');
    expect(ok1).toBe(true);
    expect(ok2).toBe(false);
  });

  test('clearPassword removes stored password', async () => {
    await savePassword('4321');
    await clearPassword();
    const isSet = await isPasswordSet();
    expect(isSet).toBe(false);
  });

  test('secureSet + secureGet string', async () => {
    await secureSet('test_key', 'hello');
    const val = await secureGet('test_key');
    expect(val).toBe('hello');
  });

  test('secureSet + secureGet object', async () => {
    const obj = { streak: 7, name: 'Test' };
    await secureSet('test_obj', obj);
    const val = await secureGet('test_obj');
    expect(val).toEqual(obj);
  });

  test('secureGet returns null for missing key', async () => {
    const val = await secureGet('nonexistent_key_xyz');
    expect(val).toBeNull();
  });
});
