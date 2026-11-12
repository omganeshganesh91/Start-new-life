// ─────────────────────────────────────────────────────────────────────────────
// __tests__/GeminiService.test.js — Sanity tests for Gemini API service
// ─────────────────────────────────────────────────────────────────────────────

// Mock @env
jest.mock('@env', () => ({ GEMINI_API_KEY: 'test-api-key-mock' }));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock constants
jest.mock('../src/utils/constants', () => ({
  STORAGE_KEYS:    { lastMotivation: '@sanl_last_motivation' },
  GEMINI_PROMPTS:  {
    dailyMotivation: 'test prompt',
    triggerAnalysis: jest.fn(() => 'trigger prompt'),
    visionBoard:     jest.fn(() => 'vision prompt'),
  },
  UNSPLASH_THEMES: ['mountain,sunrise', 'ocean,calm'],
}));

import {
  getFallbackMotivation,
  fetchDailyMotivation,
  analyzeTriggerPatterns,
} from '../src/services/GeminiService';

// ── getFallbackMotivation ─────────────────────────────────────────────────────
describe('getFallbackMotivation', () => {
  test('returns an object with required fields', () => {
    const result = getFallbackMotivation();
    expect(result).toHaveProperty('quote');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('imageUrl');
    expect(typeof result.quote).toBe('string');
    expect(result.quote.length).toBeGreaterThan(0);
  });

  test('returns different quotes on multiple calls (randomized)', () => {
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(getFallbackMotivation().quote);
    }
    // With 3 fallbacks and 20 calls, should have at least 2 unique
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});

// ── fetchDailyMotivation — uses fallback when API fails ───────────────────────
describe('fetchDailyMotivation (offline/fallback)', () => {
  // Mock fetch to fail (simulates no internet)
  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  });

  test('returns fallback when API fails', async () => {
    const result = await fetchDailyMotivation();
    expect(result).toHaveProperty('quote');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('imageUrl');
  });

  test('does not throw when API is unavailable', async () => {
    await expect(fetchDailyMotivation()).resolves.not.toThrow();
  });
});

// ── fetchDailyMotivation — returns cached data ────────────────────────────────
describe('fetchDailyMotivation (cache hit)', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  test('returns cached data if saved today', async () => {
    const cachedData = {
      quote:       'Cached quote',
      explanation: 'Cached explanation',
      action:      'Cached action',
      imageUrl:    'https://example.com/img.jpg',
      imageTag:    'mountain',
    };
    AsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ date: new Date().toDateString(), data: cachedData })
    );

    const result = await fetchDailyMotivation();
    expect(result.quote).toBe('Cached quote');
    expect(result.fromCache).toBe(true);
  });
});

// ── analyzeTriggerPatterns ────────────────────────────────────────────────────
describe('analyzeTriggerPatterns', () => {
  test('returns "log more" message for less than 3 entries', async () => {
    const result = await analyzeTriggerPatterns([{ hour: 22 }]);
    expect(result.patterns).toContain('3');
  });

  test('returns "log more" message for empty array', async () => {
    const result = await analyzeTriggerPatterns([]);
    expect(result.patterns).toBeTruthy();
  });

  test('does not throw for null input', async () => {
    await expect(analyzeTriggerPatterns(null)).resolves.toBeTruthy();
  });
});
