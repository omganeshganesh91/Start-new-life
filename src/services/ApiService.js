// ─────────────────────────────────────────────────────────────────────────────
// ApiService.js — REST client for the Node.js + SQLite backend
// Replaces FirebaseService.js — same public API surface for easy swap
// Backend base URL comes from EXPO_PUBLIC_API_URL in .env
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

// ── Base URL ──────────────────────────────────────────────────────────────────
// Expo SDK 51: public vars use EXPO_PUBLIC_ prefix and are available directly
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach anonymous device ID ───────────────────────────
api.interceptors.request.use(async (config) => {
  const anonId = await getOrCreateAnonymousId();
  config.headers['x-anon-id'] = anonId;
  return config;
});

// ── Response interceptor: unwrap data, surface errors ────────────────────────
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ── Anonymous device identity ─────────────────────────────────────────────────
const generateId = () =>
  'anon_' +
  Math.random().toString(36).slice(2, 10) +
  Math.random().toString(36).slice(2, 10);

export const getOrCreateAnonymousId = async () => {
  try {
    let id = await AsyncStorage.getItem(STORAGE_KEYS.anonymousId);
    if (!id) {
      id = generateId();
      await AsyncStorage.setItem(STORAGE_KEYS.anonymousId, id);
    }
    return id;
  } catch {
    return generateId(); // fallback: won't be persisted
  }
};

/** Kept for backward compat with CommunityWallScreen */
export const getAnonymousId = getOrCreateAnonymousId;

// ── Anonymous display name generator ─────────────────────────────────────────
const ADJECTIVES = ['Brave', 'Silent', 'Rising', 'Strong', 'New', 'Free', 'Clear', 'Bold', 'Calm', 'Pure'];
const NOUNS      = ['Phoenix', 'Warrior', 'Dawn', 'Spirit', 'Journey', 'Soul', 'Path', 'Light', 'Hope', 'Star'];

export const generateAnonymousName = () => {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// PLEDGES API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch pledges (paginated, newest first).
 * @param {number} limit  - Number of pledges to fetch (default 20)
 * @param {number} offset - Pagination offset (default 0)
 */
export const fetchPledges = async (limit = 20, offset = 0) => {
  try {
    const res = await api.get('/api/pledges', { params: { limit, offset } });
    return res.pledges || res || [];
  } catch (error) {
    console.warn('ApiService.fetchPledges error:', error.message);
    return [];
  }
};

/**
 * Post a new anonymous pledge.
 * @param {{ message: string, streak: number, displayName?: string }} payload
 */
export const postPledge = async ({ message, streak, displayName }) => {
  const anonId = await getOrCreateAnonymousId();
  const body = {
    message:     message.trim().slice(0, 280),
    streak:      streak || 0,
    displayName: displayName || generateAnonymousName(),
    uid:         anonId,
  };
  // Throws on error — caller handles
  return api.post('/api/pledges', body);
};

/**
 * Toggle heart on a pledge (like / unlike).
 * Returns new hearted state (boolean).
 */
export const toggleHeart = async (pledgeId) => {
  try {
    const res = await api.post(`/api/pledges/${pledgeId}/heart`);
    return res.hearted ?? false;
  } catch (error) {
    console.warn('ApiService.toggleHeart error:', error.message);
    return false;
  }
};

/**
 * Delete own pledge.
 */
export const deletePledge = async (pledgeId) => {
  try {
    await api.delete(`/api/pledges/${pledgeId}`);
    return true;
  } catch (error) {
    console.warn('ApiService.deletePledge error:', error.message);
    return false;
  }
};

/**
 * Poll for new pledges (replaces Firestore real-time listener).
 * Returns an unsubscribe function that stops polling.
 *
 * @param {(pledges: any[]) => void} onChange
 * @param {number} intervalMs - Poll interval in ms (default 15 000)
 */
export const subscribeToPledges = (onChange, intervalMs = 15000) => {
  let active = true;

  const poll = async () => {
    if (!active) return;
    const pledges = await fetchPledges(30, 0);
    if (active) onChange(pledges);
  };

  poll(); // immediate first fetch
  const id = setInterval(poll, intervalMs);

  // Return unsubscribe function (same signature as Firestore listener)
  return () => {
    active = false;
    clearInterval(id);
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
export const checkBackendHealth = async () => {
  try {
    const res = await api.get('/health');
    return res?.status === 'ok';
  } catch {
    return false;
  }
};

export default api;
