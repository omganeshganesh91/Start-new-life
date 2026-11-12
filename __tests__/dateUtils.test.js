// ─────────────────────────────────────────────────────────────────────────────
// __tests__/dateUtils.test.js — Sanity tests for streak date logic
// Run: npx jest __tests__/dateUtils.test.js
// ─────────────────────────────────────────────────────────────────────────────
import {
  todayKey,
  yesterdayKey,
  calculateStreak,
  calculateLongestStreak,
  formatSoberDuration,
  getMilestoneMessage,
  formatFocusTime,
  getTimeGreeting,
  isNightLockActive,
  getLast30Days,
} from '../src/utils/dateUtils';
import moment from 'moment';

// ── todayKey ──────────────────────────────────────────────────────────────────
describe('todayKey', () => {
  test('returns YYYY-MM-DD string', () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(key).toBe(moment().format('YYYY-MM-DD'));
  });
});

// ── yesterdayKey ──────────────────────────────────────────────────────────────
describe('yesterdayKey', () => {
  test('returns yesterday in YYYY-MM-DD', () => {
    const key = yesterdayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(moment(key).isSame(moment().subtract(1, 'day'), 'day')).toBe(true);
  });
});

// ── calculateStreak ───────────────────────────────────────────────────────────
describe('calculateStreak', () => {
  test('returns 0 for empty array', () => {
    expect(calculateStreak([])).toBe(0);
    expect(calculateStreak(null)).toBe(0);
  });

  test('returns 1 for today only', () => {
    expect(calculateStreak([todayKey()])).toBe(1);
  });

  test('returns 2 for today + yesterday', () => {
    expect(calculateStreak([todayKey(), yesterdayKey()])).toBe(2);
  });

  test('returns 0 if last day is 2+ days ago (streak broken)', () => {
    const twoDaysAgo = moment().subtract(2, 'days').format('YYYY-MM-DD');
    expect(calculateStreak([twoDaysAgo])).toBe(0);
  });

  test('counts consecutive days correctly', () => {
    const days = [
      moment().format('YYYY-MM-DD'),
      moment().subtract(1, 'days').format('YYYY-MM-DD'),
      moment().subtract(2, 'days').format('YYYY-MM-DD'),
      moment().subtract(3, 'days').format('YYYY-MM-DD'),
    ];
    expect(calculateStreak(days)).toBe(4);
  });

  test('stops counting at gap', () => {
    const days = [
      moment().format('YYYY-MM-DD'),
      moment().subtract(1, 'days').format('YYYY-MM-DD'),
      // gap here — no day 2 ago
      moment().subtract(4, 'days').format('YYYY-MM-DD'),
      moment().subtract(5, 'days').format('YYYY-MM-DD'),
    ];
    expect(calculateStreak(days)).toBe(2);
  });
});

// ── calculateLongestStreak ────────────────────────────────────────────────────
describe('calculateLongestStreak', () => {
  test('returns 0 for empty', () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  test('finds longest among multiple blocks', () => {
    const days = [
      '2024-01-01', '2024-01-02', '2024-01-03', // 3-day block
      '2024-01-10', '2024-01-11',                // 2-day block
      '2024-01-20', '2024-01-21', '2024-01-22', '2024-01-23', // 4-day block
    ];
    expect(calculateLongestStreak(days)).toBe(4);
  });
});

// ── formatSoberDuration ───────────────────────────────────────────────────────
describe('formatSoberDuration', () => {
  test('shows hours for same-day start', () => {
    const result = formatSoberDuration(moment().format('YYYY-MM-DD'));
    expect(result).toMatch(/hour/);
  });

  test('shows days for multi-day start', () => {
    const result = formatSoberDuration(moment().subtract(5, 'days').format('YYYY-MM-DD'));
    expect(result).toMatch(/day/);
  });

  test('shows months for long sobriety', () => {
    const result = formatSoberDuration(moment().subtract(45, 'days').format('YYYY-MM-DD'));
    expect(result).toMatch(/month/);
  });
});

// ── getMilestoneMessage ───────────────────────────────────────────────────────
describe('getMilestoneMessage', () => {
  test('returns null for non-milestone', () => {
    expect(getMilestoneMessage(5)).toBeNull();
    expect(getMilestoneMessage(0)).toBeNull();
  });

  test('returns message for day 1', () => {
    expect(getMilestoneMessage(1)).toContain('Day 1');
  });

  test('returns message for day 7', () => {
    expect(getMilestoneMessage(7)).toContain('Week');
  });

  test('returns message for day 30', () => {
    expect(getMilestoneMessage(30)).toContain('Month');
  });

  test('returns message for day 365', () => {
    expect(getMilestoneMessage(365)).toContain('YEAR');
  });
});

// ── formatFocusTime ───────────────────────────────────────────────────────────
describe('formatFocusTime', () => {
  test('formats seconds correctly', () => {
    expect(formatFocusTime(0)).toBe('0:00');
    expect(formatFocusTime(65)).toBe('1:05');
    expect(formatFocusTime(3661)).toBe('1:01:01');
    expect(formatFocusTime(3600)).toBe('1:00:00');
    expect(formatFocusTime(90)).toBe('1:30');
  });
});

// ── getLast30Days ─────────────────────────────────────────────────────────────
describe('getLast30Days', () => {
  test('returns 30 elements', () => {
    expect(getLast30Days().length).toBe(30);
  });

  test('last element is today', () => {
    const days = getLast30Days();
    expect(days[29]).toBe(todayKey());
  });

  test('all elements are valid dates', () => {
    getLast30Days().forEach((d) => {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(moment(d).isValid()).toBe(true);
    });
  });
});
