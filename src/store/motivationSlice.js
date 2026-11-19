// ─────────────────────────────────────────────────────────────────────────────
// motivationSlice.js — Redux slice for daily Gemini motivation
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDailyMotivation, getFallbackMotivation } from '../services/GeminiService';

const DEFAULT_STATE = {
  ...getFallbackMotivation(),
  loading:     false,
  error:       null,
  lastFetched: null,
};

export const fetchMotivation = createAsyncThunk(
  'motivation/fetch',
  async () => fetchDailyMotivation(),
  {
    condition: (_arg, { getState }) => !getState().motivation.loading,
  }
);

const motivationSlice = createSlice({
  name: 'motivation',
  initialState: DEFAULT_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMotivation.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchMotivation.fulfilled, (state, action) => {
        return {
          ...action.payload,
          loading:     false,
          error:       null,
          lastFetched: new Date().toISOString(),
        };
      })
      .addCase(fetchMotivation.rejected, (state, action) => {
        const fallback = getFallbackMotivation();
        return {
          ...fallback,
          loading:     false,
          error:       action.error.message,
          lastFetched: new Date().toISOString(),
        };
      });
  },
});

export default motivationSlice.reducer;
