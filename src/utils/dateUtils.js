// ─────────────────────────────────────────────────────────────────────────────
// dateUtils.js — Date helpers for streak calculation + time-based features
// ─────────────────────────────────────────────────────────────────────────────
import moment from 'moment';

// ── Core date helpers ─────────────────────────────────────────────────────────
export const todayKey     = () => moment().format('YYYY-MM-DD');
export const yesterdayKey = () => moment().subtract(1, 'day').format('YYYY-MM-DD');

// ── Streak math ───────────────────────────────────────────────────────────────
export const calculateStreak = (cleanDays) => {
  if (!cleanDays || cleanDays.length === 0) return 0;
  const sorted = [...cleanDays].sort().reverse();
  const diff0  = moment().diff(moment(sorted[0]), 'days');
  if (diff0 > 1) return 0;
  let streak = 0;
  let check  = moment();
  for (const d of sorted) {
    const diff = check.diff(moment(d), 'days');
    if (diff === 0 || diff === 1) { streak++; check = moment(d); }
    else break;
  }
  return streak;
};

export const calculateLongestStreak = (cleanDays) => {
  if (!cleanDays || cleanDays.length === 0) return 0;
  const sorted = [...cleanDays].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (moment(sorted[i]).diff(moment(sorted[i - 1]), 'days') === 1) {
      cur++; best = Math.max(best, cur);
    } else cur = 1;
  }
  return best;
};

export const formatSoberDuration = (startDate) => {
  if (!startDate) return '—';
  const days  = moment().diff(moment(startDate), 'days');
  const hours = moment().diff(moment(startDate), 'hours') % 24;
  if (days === 0)  return `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (days < 30)   return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
  const mo = moment().diff(moment(startDate), 'months');
  return `${mo} month${mo > 1 ? 's' : ''}`;
};

/** Format seconds → M:SS or H:MM:SS — used by AppLockScreen focus timer */
export const formatFocusTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ── Greeting ──────────────────────────────────────────────────────────────────
/**
 * Returns a time-appropriate greeting string.
 * Exported as both getGreeting (original) and getTimeGreeting (used by DashboardScreen).
 */
export const getGreeting = () => {
  const h = moment().hour();
  if (h < 5)  return 'Rest well';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Stay strong tonight';
};
/** Alias for DashboardScreen */
export const getTimeGreeting = getGreeting;

// ── Night lock check ──────────────────────────────────────────────────────────
/**
 * Returns true if current time is within the night lock window (10PM–6AM).
 * Exported as both isNightActive (original) and isNightLockActive (used by DashboardScreen + BlockerScreen).
 */
export const isNightActive = () => {
  const h = moment().hour();
  return h >= 22 || h < 6;
};
/** Alias for DashboardScreen + BlockerScreen */
export const isNightLockActive = isNightActive;

// ── Milestone messages ────────────────────────────────────────────────────────
export const getMilestoneMessage = (streak) => {
  const milestones = {
    1:   '🌅 Day 1 — The journey begins.',
    3:   '✨ 3 Days — Your brain is healing.',
    7:   '🔥 One Week! — Keep going.',
    14:  '💪 Two Weeks — The fog is lifting.',
    21:  '🧠 21 Days — New pathways forming.',
    30:  "🏆 One Month! — You've changed.",
    60:  '🌟 Two Months — Almost no one gets here.',
    90:  '👑 90 Days — Full reset achieved.',
    180: '🦋 Six Months — Transformed.',
    365: '🎯 ONE YEAR — You did it.',
  };
  return milestones[streak] || null;
};

// ── Calendar helpers ──────────────────────────────────────────────────────────
/** Returns an array of the last 30 day keys (YYYY-MM-DD), oldest first */
export const getLast30Days = () =>
  Array.from({ length: 30 }, (_, i) =>
    moment().subtract(29 - i, 'days').format('YYYY-MM-DD')
  );
