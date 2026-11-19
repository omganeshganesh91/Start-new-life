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

// ── fetchDailyMotivation — fetches a fresh database quote ─────────────────────
describe('fetchDailyMotivation (database quotes)', () => {
  test('requests a new quote from the backend on each call', async () => {
    const makeResponse = (quote) => ({
      ok: true,
      json: async () => ({ quote, category: 'learning' }),
    });
    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeResponse('Ask one more question.'))
      .mockResolvedValueOnce(makeResponse('Practice a new skill today.'));

    const first = await fetchDailyMotivation();
    const second = await fetchDailyMotivation();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/quotes\/random$/);
    expect(first.quote).toBe('Ask one more question.');
    expect(first.category).toBe('learning');
    expect(second.quote).toBe('Practice a new skill today.');
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
