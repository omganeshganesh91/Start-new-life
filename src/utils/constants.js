// ─────────────────────────────────────────────────────────────────────────────
// constants.js — Design tokens, storage keys, and app-wide constants
// All screens import: COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS
// ─────────────────────────────────────────────────────────────────────────────
import { Dimensions, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ── Responsive helpers ────────────────────────────────────────────────────────
export const isTablet = W >= 768;
export const isWeb    = Platform.OS === 'web';
const BASE            = 390;
const MAX_CONTENT_WIDTH = 720;

export const rs  = (n) => Math.round(Math.min(Math.min(W, MAX_CONTENT_WIDTH) / BASE, 1.15) * n);
export const rvs = (n) => Math.round(Math.min(H / 844, 1.1) * n);
export const rf  = (n, f = 0.45) => Math.round(n + (rs(n) - n) * f); // responsive font

// ── Colors ────────────────────────────────────────────────────────────────────
export const COLORS = {
  background:    '#0A0E1A',
  surface:       '#12172B',
  surfaceAlt:    '#1A2035',
  card:          '#1E2640',
  gradientStart: '#4A1FDB',
  gradientMid:   '#2E6FDB',
  gradientEnd:   '#1BB8DB',
  primary:       '#4A6FDB',
  primaryLight:  '#6B8EF0',
  accent:        '#F5A623',
  accentGreen:   '#00D68F',
  accentRed:     '#FF4D6D',
  accentPurple:  '#9B59B6',
  textPrimary:   '#FFFFFF',
  textSecondary: '#8A97B5',
  textMuted:     '#4A556A',
  border:        '#1E2A44',
  overlay:       'rgba(10,14,26,0.85)',
};

// ── Typography ────────────────────────────────────────────────────────────────
// Shape: FONTS.sizes.sm / FONTS.weights.bold (what all screens import)
export const FONTS = {
  sizes: {
    xs:   rf(10),
    sm:   rf(12),
    base: rf(14),
    md:   rf(16),
    lg:   rf(18),
    xl:   rf(22),
    xxl:  rf(26),
    hero: rf(34),
  },
  weights: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
  },
};

// ── Spacing ───────────────────────────────────────────────────────────────────
// Shape: SPACING.sm / SPACING.md (what all screens import)
export const SPACING = {
  xs:  rs(4),
  sm:  rs(8),
  md:  rs(16),
  lg:  rs(24),
  xl:  rs(32),
  xxl: rs(48),
};

// ── Radius ────────────────────────────────────────────────────────────────────
// Shape: RADIUS.sm / RADIUS.lg (what all screens import)
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

// ── Screen dimensions ─────────────────────────────────────────────────────────
export const SCREEN = { W, H };

// ── AsyncStorage keys ─────────────────────────────────────────────────────────
// Shape: STORAGE_KEYS.streakData / STORAGE_KEYS.soulCoins (what slices import)
export const STORAGE_KEYS = {
  streakData:          '@sanl_streak',
  soulCoins:           '@sanl_coins',
  lockedApps:          '@sanl_locked_apps',
  timeLimits:          '@sanl_time_limits',
  appTimeLimits:       '@sanl_time_limits',   // alias used by AppLockScreen
  sunriseLockEnabled:  '@sanl_sunrise_lock',
  sunriseLock:         '@sanl_sunrise_lock',  // alias
  dnsSetupConfirmed:   '@sanl_dns_setup_confirmed',
  futureLetter:        '@sanl_letter',
  goals:               '@sanl_goals',
  triggerLogs:         '@sanl_trigger_logs',
  onboarded:           '@sanl_onboarded',
  lastMotivation:      '@sanl_motivation',
  anonymousId:         '@sanl_anon_id',
  pinHash:             '@sanl_pin_hash',
  pinSet:              '@sanl_pin_set',
};

// ── Legacy aliases (kept for back-compat with old code) ───────────────────────
/** @deprecated Use STORAGE_KEYS instead */
export const KEYS = STORAGE_KEYS;
/** @deprecated Use SPACING instead */
export const SP   = SPACING;
/** @deprecated Use RADIUS instead */
export const R    = RADIUS;

// ── Coin rewards ──────────────────────────────────────────────────────────────
export const COINS = {
  cleanDay:       10,
  readMotivation: 2,
  focusSession:   5,
  grounding:      3,
  pledge:         5,
  weekStreak:     50,
  monthStreak:    200,
};

// ── Grounding steps (5-4-3-2-1 technique) ────────────────────────────────────
export const GROUNDING = [
  { n: 5, sense: 'SEE',   text: 'Name 5 things you can see right now.',      icon: '👁️',  color: COLORS.primary      },
  { n: 4, sense: 'TOUCH', text: 'Notice 4 things you can physically feel.',  icon: '✋',  color: COLORS.accentPurple },
  { n: 3, sense: 'HEAR',  text: 'Listen for 3 sounds around you.',           icon: '👂',  color: COLORS.accentGreen  },
  { n: 2, sense: 'SMELL', text: 'Find 2 things you can smell.',              icon: '👃',  color: COLORS.accent       },
  { n: 1, sense: 'TASTE', text: 'Notice 1 thing you can taste right now.',   icon: '👅',  color: COLORS.accentRed    },
];
/** Alias used by GroundingExercise component */
export const GROUNDING_STEPS = GROUNDING;

// ── Unsplash image themes ─────────────────────────────────────────────────────
export const UNSPLASH_THEMES = [
  'mountain,sunrise', 'nature,forest', 'ocean,calm', 'sky,clouds',
  'meditation,peace', 'light,hope',    'journey,road', 'strength,warrior',
];
/** @deprecated Use UNSPLASH_THEMES */
export const THEMES = UNSPLASH_THEMES;

// ── Gemini prompts ────────────────────────────────────────────────────────────
export const GEMINI_PROMPTS = {
  dailyMotivation: `You are a compassionate recovery coach. Give ONE powerful motivational quote for someone overcoming addiction, a 2-sentence warm explanation, and ONE practical micro-action for today. Keep it human and non-judgmental. Max 100 words. Return ONLY valid JSON: {"quote":"...","explanation":"...","action":"..."}`,

  triggerAnalysis: (logs) =>
    `You are a compassionate behavioral analyst. Here is urge log data: ${JSON.stringify(logs)}. Each entry has timestamp, dayOfWeek, hour, notes. Identify top 2 vulnerability windows, explain briefly why, give 2 specific strategies. Under 150 words. Return ONLY valid JSON: {"patterns":"...","reasons":"...","strategies":"..."}`,

  visionBoard: (goals) =>
    `User goals: "${goals}". Write a 3-sentence personal affirmation (second person, "You are...") connecting their goals to daily choices. Under 60 words. Return ONLY the affirmation text.`,
};
/** @deprecated Use GEMINI_PROMPTS */
export const PROMPTS = GEMINI_PROMPTS;

// ── Focus session durations ───────────────────────────────────────────────────
export const FOCUS_OPTIONS = [
  { label: '30 min',  value: 30  },
  { label: '1 hour',  value: 60  },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: 'All day', value: 480 },
];
/** Alias used by AppLockScreen */
export const FOCUS_DURATIONS = FOCUS_OPTIONS;

// ── Night lock window ─────────────────────────────────────────────────────────
export const NIGHT = { start: 22, end: 6 };
/** Alias used by BlockerScreen */
export const NIGHT_LOCK = { startHour: 22, endHour: 6 };

// ── Coin reward amounts ───────────────────────────────────────────────────────
// Used by AppLockScreen (COIN_REWARDS.focusSession) and MotivationScreen
export const COIN_REWARDS = {
  cleanDay:         10,
  readMotivation:   2,
  focusSession:     5,
  groundingExercise:3,
  pledge:           5,
  weekStreak:       50,
  monthStreak:      200,
};

// ── App list for lock screen ──────────────────────────────────────────────────
export const APPS = [
  { id: 'instagram', name: 'Instagram',   emoji: '📸' },
  { id: 'youtube',   name: 'YouTube',     emoji: '▶️' },
  { id: 'twitter',   name: 'X (Twitter)', emoji: '🐦' },
  { id: 'tiktok',    name: 'TikTok',      emoji: '🎵' },
  { id: 'reddit',    name: 'Reddit',      emoji: '🟠' },
  { id: 'snapchat',  name: 'Snapchat',    emoji: '👻' },
  { id: 'telegram',  name: 'Telegram',    emoji: '✈️' },
  { id: 'whatsapp',  name: 'WhatsApp',    emoji: '💬' },
  { id: 'chrome',    name: 'Chrome',      emoji: '🌐' },
];
