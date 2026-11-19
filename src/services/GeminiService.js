// ─────────────────────────────────────────────────────────────────────────────
// GeminiService.js — Gemini 3.8 Flash AI integration via backend proxy
// All requests go through the Express backend which:
//   • Keeps the API key server-side (never in the client bundle)
//   • Caches 200 responses in Redis automatically
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, GEMINI_PROMPTS, UNSPLASH_THEMES } from '../utils/constants';

// Backend base URL — set EXPO_PUBLIC_API_URL in .env
// e.g. http://localhost:5000  or  https://your-app.railway.app
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

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

// ── 1. Daily Motivation (cached per day) ─────────────────────────────────────
export const fetchDailyMotivation = async () => {
  try {
    // Serve from cache if already fetched today
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.lastMotivation);
    if (cached) {
      const { date, data } = JSON.parse(cached);
      if (date === new Date().toDateString()) return { ...data, fromCache: true };
    }

    const rawText = await callGemini(GEMINI_PROMPTS.dailyMotivation, 'motivation');
    const parsed  = parseGeminiJSON(rawText);

    const theme  = UNSPLASH_THEMES[Math.floor(Math.random() * UNSPLASH_THEMES.length)];
    const result = {
      quote:       parsed.quote       || 'Every moment clean is a victory.',
      explanation: parsed.explanation || 'You are stronger than any urge.',
      action:      parsed.action      || 'Take one deep breath right now.',
      imageUrl:    `https://source.unsplash.com/800x600/?${theme}&t=${Date.now()}`,
      imageTag:    theme,
      fetchedAt:   new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      STORAGE_KEYS.lastMotivation,
      JSON.stringify({ date: new Date().toDateString(), data: result })
    );

    return result;
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
