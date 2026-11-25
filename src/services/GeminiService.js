// ─────────────────────────────────────────────────────────────────────────────
// GeminiService.js — database-backed inspiration quotes and Gemini AI features
// All requests go through the Express backend which:
//   • Keeps the API key server-side (never in the client bundle)
//   • Caches 200 responses in Redis automatically
// ─────────────────────────────────────────────────────────────────────────────
import { GEMINI_PROMPTS } from '../utils/constants';

// Backend base URL — set EXPO_PUBLIC_API_URL in .env
// e.g. http://localhost:5000  or  https://your-app.railway.app
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const fetchMotivationQuotes = async ({ offset = 0, limit = 30 } = {}) => {
  const response = await fetch(`${API_BASE}/api/quotes?offset=${offset}&limit=${limit}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || `Quotes API HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data?.quotes)) throw new Error('Quotes API returned an invalid quote page');
  return data;
};

// ── Core fetch — calls the backend proxy ─────────────────────────────────────
const callGemini = async (prompt, endpoint = 'generate') => {
  const startedAt = Date.now();
  console.info(`[Gemini] ${endpoint} request started`);
  let response;
  try {
    response = await fetch(`${API_BASE}/api/gemini/${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
    });
  } catch (error) {
    console.warn(`[Gemini] ${endpoint} network failure durationMs=${Date.now() - startedAt}: ${error.message}`);
    throw error;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err?.error || `Gemini proxy HTTP ${response.status}`;
    console.warn(
      `[Gemini] ${endpoint} failed status=${response.status} durationMs=${Date.now() - startedAt}: ${message}`
    );
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.text) throw new Error('Empty Gemini response');
  console.info(`[Gemini] ${endpoint} completed status=${response.status} durationMs=${Date.now() - startedAt}`);
  return data.text;
};

// ── Parse JSON wrapped in optional ```json ``` fences ────────────────────────
const parseGeminiJSON = (raw) => {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
};

// ── 1. Daily Motivation (random quote from the backend database) ──────────────
export const fetchDailyMotivation = async () => {
  try {
    const startedAt = Date.now();
    console.info('[Quotes] random quote request started');
    const response = await fetch(`${API_BASE}/api/quotes/random`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error || `Quotes API HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.quote || typeof data.quote !== 'string') {
      throw new Error('Quotes API returned an invalid quote');
    }

    console.info(`[Quotes] random quote received durationMs=${Date.now() - startedAt}`);
    return {
      ...getFallbackMotivation(),
      quote: data.quote,
      category: data.category,
      explanation: '',
      action: '',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('GeminiService.fetchDailyMotivation:', error.message);
    return getFallbackMotivation();
  }
};

// ── 2. Trigger Pattern Analysis ───────────────────────────────────────────────
export const analyzeTriggerPatterns = async (triggerLogs) => {
  try {
    if (!triggerLogs || triggerLogs.length < 3) {
      return {
        patterns:   'Log at least 3 urge events to see patterns.',
        reasons:    '',
        strategies: '',
      };
    }

    const rawText = await callGemini(GEMINI_PROMPTS.triggerAnalysis(triggerLogs), 'triggers');
    return parseGeminiJSON(rawText);
  } catch (error) {
    console.warn('GeminiService.analyzeTriggerPatterns:', error.message);
    return {
      patterns:   'Could not analyze patterns right now.',
      reasons:    '',
      strategies: 'Try logging more events and check back later.',
    };
  }
};

// ── 3. Vision Board Affirmation ────────────────────────────────────────────────
export const generateVisionAffirmation = async (userGoals) => {
  try {
    const rawText = await callGemini(GEMINI_PROMPTS.visionBoard(userGoals), 'vision');
    return rawText.trim();
  } catch (error) {
    console.warn('GeminiService.generateVisionAffirmation:', error.message);
    return 'You are building the life you deserve — one clean day at a time.';
  }
};

// ── Fallback motivation (offline / key not set / API error) ──────────────────
const FALLBACKS = [
  {
    quote:       'The chains of habit are too light to be felt until they are too heavy to be broken.',
    explanation: 'What you do today shapes who you become. Small wins compound into freedom.',
    action:      'Write down ONE reason you chose this path. Read it aloud.',
    imageUrl:    'https://source.unsplash.com/800x600/?mountain,sunrise',
    imageTag:    'mountain,sunrise',
  },
  {
    quote:       'You are not your urges. You are the one who watches them pass.',
    explanation: 'An urge is just a wave — it rises, peaks, and falls. You just have to wait.',
    action:      'Set a 5-minute timer. Just get to the next 5 minutes.',
    imageUrl:    'https://source.unsplash.com/800x600/?ocean,calm',
    imageTag:    'ocean,calm',
  },
  {
    quote:       'Recovery is not a destination. It is a daily act of self-love.',
    explanation: 'Every morning you wake up and choose yourself again is a profound victory.',
    action:      'Say your name and "I choose freedom" — out loud, right now.',
    imageUrl:    'https://source.unsplash.com/800x600/?light,hope',
    imageTag:    'light,hope',
  },
  {
    quote:       'Every locked app is a door you chose not to open.',
    explanation: 'Your PIN protects the life you are building.',
    action:      'Take 3 deep breaths, then do something real.',
    imageUrl:    'https://source.unsplash.com/800x600/?strength,warrior',
    imageTag:    'strength,warrior',
  },
];

export const getFallbackMotivation = () =>
  FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
