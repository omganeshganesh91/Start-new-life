// ─────────────────────────────────────────────────────────────────────────────
// coinsSlice.js — Redux slice for Soul Coins
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

const DEFAULT_STATE = {
  balance:   0,
  history:   [],
};

// ── Load coins from storage ────────────────────────────────────────────────────
export const loadCoins = createAsyncThunk('coins/load', async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.soulCoins);
  return raw ? JSON.parse(raw) : DEFAULT_STATE;
});

const coinsSlice = createSlice({
  name: 'coins',
  initialState: DEFAULT_STATE,
  reducers: {
    addCoins: (state, action) => {
      const { amount, reason } = action.payload;
      state.balance += amount;
      state.history.push({ amount, reason, date: new Date().toISOString() });
      // Keep last 50 history entries
      if (state.history.length > 50) state.history = state.history.slice(-50);
      AsyncStorage.setItem(STORAGE_KEYS.soulCoins, JSON.stringify({ balance: state.balance, history: state.history }));
    },
    spendCoins: (state, action) => {
      const { amount, reason } = action.payload;
      if (state.balance >= amount) {
        state.balance -= amount;
        state.history.push({ amount: -amount, reason, date: new Date().toISOString() });
        AsyncStorage.setItem(STORAGE_KEYS.soulCoins, JSON.stringify({ balance: state.balance, history: state.history }));
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadCoins.fulfilled, (state, action) => {
      return action.payload;
    });
  },
});

export const { addCoins, spendCoins } = coinsSlice.actions;
export default coinsSlice.reducer;
