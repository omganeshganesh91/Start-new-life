// ─────────────────────────────────────────────────────────────────────────────
// __tests__/coinsSlice.test.js — Redux Soul Coins slice sanity tests
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../src/utils/constants', () => ({
  STORAGE_KEYS: { soulCoins: '@sanl_coins' },
}));

import coinsReducer, { addCoins, spendCoins, loadCoins } from '../src/store/coinsSlice';

const initial = { balance: 0, history: [] };

describe('coinsSlice', () => {
  test('initial state has balance 0', () => {
    expect(coinsReducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  test('addCoins increases balance', () => {
    const state = coinsReducer(initial, addCoins({ amount: 10, reason: 'test' }));
    expect(state.balance).toBe(10);
  });

  test('addCoins appends to history', () => {
    const state = coinsReducer(initial, addCoins({ amount: 5, reason: 'focus' }));
    expect(state.history).toHaveLength(1);
    expect(state.history[0].amount).toBe(5);
    expect(state.history[0].reason).toBe('focus');
  });

  test('addCoins multiple times accumulates correctly', () => {
    let state = coinsReducer(initial, addCoins({ amount: 10, reason: 'a' }));
    state = coinsReducer(state, addCoins({ amount: 5, reason: 'b' }));
    state = coinsReducer(state, addCoins({ amount: 3, reason: 'c' }));
    expect(state.balance).toBe(18);
    expect(state.history).toHaveLength(3);
  });

  test('spendCoins decreases balance', () => {
    let state = coinsReducer(initial, addCoins({ amount: 50, reason: 'earn' }));
    state = coinsReducer(state, spendCoins({ amount: 20, reason: 'spend' }));
    expect(state.balance).toBe(30);
  });

  test('spendCoins does not go below 0', () => {
    const state = coinsReducer(initial, spendCoins({ amount: 100, reason: 'spend' }));
    expect(state.balance).toBe(0); // stays at 0, not negative
  });

  test('history capped at 50 entries', () => {
    let state = initial;
    for (let i = 0; i < 60; i++) {
      state = coinsReducer(state, addCoins({ amount: 1, reason: `earn-${i}` }));
    }
    expect(state.history.length).toBeLessThanOrEqual(50);
  });
});
