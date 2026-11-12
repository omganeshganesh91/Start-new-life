// ─────────────────────────────────────────────────────────────────────────────
// store.js — Redux store configuration
// ─────────────────────────────────────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import streakReducer     from './streakSlice';
import coinsReducer      from './coinsSlice';
import motivationReducer from './motivationSlice';

export const store = configureStore({
  reducer: {
    streak:     streakReducer,
    coins:      coinsReducer,
    motivation: motivationReducer,
  },
  // All state is plain JSON — no Firebase Timestamps, no special serialization needed
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: true }),
});
