// ─────────────────────────────────────────────────────────────────────────────
// __tests__/responsive.test.js — Sanity tests for responsive utilities
// ─────────────────────────────────────────────────────────────────────────────

// Mock React Native Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get:            jest.fn(() => ({ width: 390, height: 844 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  PixelRatio: {
    roundToNearestPixel: jest.fn((n) => Math.round(n)),
  },
  Platform: { OS: 'android' },
}));

import {
  hs, vs, ms, wp, hp, gridColumns,
  isTablet, isSmallPhone, isLargePhone, isWeb,
  RF, RS, breakpoints,
} from '../src/utils/responsive';

describe('Responsive utilities (390px phone baseline)', () => {

  // ── hs (horizontal scale) ──────────────────────────────────────────────────
  describe('hs()', () => {
    test('hs(16) on 390px base returns ~16', () => {
      expect(hs(16)).toBeCloseTo(16, 0);
    });
    test('returns a number', () => {
      expect(typeof hs(20)).toBe('number');
    });
    test('zero input returns zero', () => {
      expect(hs(0)).toBe(0);
    });
  });

  // ── vs (vertical scale) ───────────────────────────────────────────────────
  describe('vs()', () => {
    test('vs(16) on 844px base returns ~16', () => {
      expect(vs(16)).toBeCloseTo(16, 0);
    });
    test('returns a number', () => {
      expect(typeof vs(24)).toBe('number');
    });
  });

  // ── ms (moderate scale) ───────────────────────────────────────────────────
  describe('ms()', () => {
    test('ms(16) returns ~16 on base screen', () => {
      expect(ms(16)).toBeCloseTo(16, 0);
    });
    test('factor 0 returns original size', () => {
      expect(ms(20, 0)).toBe(20);
    });
    test('returns number', () => {
      expect(typeof ms(14)).toBe('number');
    });
  });

  // ── wp / hp ────────────────────────────────────────────────────────────────
  describe('wp() and hp()', () => {
    test('wp(100) equals screen width', () => {
      expect(wp(100)).toBe(390);
    });
    test('wp(50) equals half screen width', () => {
      expect(wp(50)).toBe(195);
    });
    test('hp(100) equals screen height', () => {
      expect(hp(100)).toBe(844);
    });
    test('wp(0) returns 0', () => {
      expect(wp(0)).toBe(0);
    });
  });

  // ── gridColumns ────────────────────────────────────────────────────────────
  describe('gridColumns()', () => {
    test('390px / 160px min = 2 columns', () => {
      expect(gridColumns(160)).toBe(2);
    });
    test('returns at least 1 column', () => {
      expect(gridColumns(999)).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Device flags ───────────────────────────────────────────────────────────
  describe('Device flags', () => {
    test('isTablet is false on 390px phone', () => {
      expect(isTablet).toBe(false);
    });
    test('isWeb is false on android', () => {
      expect(isWeb).toBe(false);
    });
    test('isSmallPhone is false for 390px', () => {
      expect(isSmallPhone).toBe(false);
    });
  });

  // ── RF (responsive fonts) ──────────────────────────────────────────────────
  describe('RF (responsive font sizes)', () => {
    test('all RF sizes are positive numbers', () => {
      Object.values(RF).forEach((size) => {
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
      });
    });
    test('RF sizes are in ascending order', () => {
      expect(RF.xs).toBeLessThan(RF.sm);
      expect(RF.sm).toBeLessThan(RF.md);
      expect(RF.md).toBeLessThan(RF.lg);
      expect(RF.lg).toBeLessThan(RF.xl);
    });
  });

  // ── RS (responsive spacing) ────────────────────────────────────────────────
  describe('RS (responsive spacing)', () => {
    test('all RS values are positive', () => {
      Object.values(RS).forEach((s) => expect(s).toBeGreaterThan(0));
    });
    test('RS is in ascending order', () => {
      expect(RS.xs).toBeLessThan(RS.sm);
      expect(RS.sm).toBeLessThan(RS.md);
      expect(RS.md).toBeLessThan(RS.lg);
    });
  });

  // ── breakpoints ────────────────────────────────────────────────────────────
  describe('breakpoints', () => {
    test('md breakpoint true for 390px phone', () => {
      expect(breakpoints.md).toBe(true);  // 390 < 430
    });
    test('xl breakpoint false for 390px phone', () => {
      expect(breakpoints.xl).toBe(false);  // 390 < 768
    });
  });
});
