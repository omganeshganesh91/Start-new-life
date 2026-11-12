// ─────────────────────────────────────────────────────────────────────────────
// streakSlice.js — Redux slice for streak state
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { todayKey, calculateStreak, calculateLongestStreak } from '../utils/dateUtils';
import { addCoins } from './coinsSlice';
import { notifyStreakMilestone } from '../services/NotificationService';

const DEFAULT_STATE = {
  currentStreak: 0,
  longestStreak: 0,
  cleanDays:     [],
  startDate:     null,
  checkedInToday: false,
  loading:       false,
};

// ── Load streak from storage ───────────────────────────────────────────────────
export const loadStreak = createAsyncThunk('streak/load', async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.streakData);
  return raw ? JSON.parse(raw) : DEFAULT_STATE;
});

// ── Check in today ─────────────────────────────────────────────────────────────
export const checkInToday = createAsyncThunk(
  'streak/checkIn',
  async (_, { getState, dispatch }) => {
    const state     = getState().streak;
    const today     = todayKey();

    if (state.checkedInToday) return null;

    const updatedDays = [...new Set([...state.cleanDays, today])];
    const newStreak   = calculateStreak(updatedDays);
    const newLongest  = calculateLongestStreak(updatedDays);

    const updated = {
      ...state,
      cleanDays:      updatedDays,
      currentStreak:  newStreak,
      longestStreak:  newLongest,
      startDate:      state.startDate || today,
      checkedInToday: true,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.streakData, JSON.stringify(updated));

    // Award coins
    dispatch(addCoins({ amount: 10, reason: 'Daily check-in' }));

    // Milestone notification
    notifyStreakMilestone(newStreak);

    return updated;
  }
);

const streakSlice = createSlice({
  name: 'streak',
  initialState: DEFAULT_STATE,
  reducers: {
    resetStreak: (state) => {
      state.currentStreak  = 0;
      state.checkedInToday = false;
      AsyncStorage.setItem(STORAGE_KEYS.streakData, JSON.stringify({ ...state, currentStreak: 0 }));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStreak.pending,   (state) => { state.loading = true; })
      .addCase(loadStreak.fulfilled, (state, action) => {
        const today = todayKey();
        return {
          ...action.payload,
          loading:        false,
          checkedInToday: action.payload.cleanDays?.includes(today) || false,
        };
      })
      .addCase(loadStreak.rejected,  (state) => { state.loading = false; })
      .addCase(checkInToday.fulfilled, (state, action) => {
        if (action.payload) return { ...action.payload };
      });
  },
});

export const { resetStreak } = streakSlice.actions;
export default streakSlice.reducer;
