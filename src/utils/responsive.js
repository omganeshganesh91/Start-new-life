// ─────────────────────────────────────────────────────────────────────────────
// responsive.js — Responsive layout utilities for ALL devices
// Handles: small phones (360px), large phones (414px), tablets (768px+),
//          foldables, and React Native Web (desktop browser)
// ─────────────────────────────────────────────────────────────────────────────
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Device classification ─────────────────────────────────────────────────────
export const isWeb      = Platform.OS === 'web';
export const isAndroid  = Platform.OS === 'android';
export const isIOS      = Platform.OS === 'ios';
export const isTablet   = SCREEN_W >= 768;
export const isFoldable = SCREEN_W >= 600 && SCREEN_W < 768;
export const isSmallPhone = SCREEN_W < 375;   // iPhone SE, older Androids
export const isLargePhone = SCREEN_W >= 414;  // iPhone Pro Max, Galaxy Ultra

// ── Base design width (designed on 390px iPhone 14) ──────────────────────────
const BASE_WIDTH  = 390;
const BASE_HEIGHT = 844;

// ── Scale functions ───────────────────────────────────────────────────────────
/**
 * Horizontal scale — use for widths, paddingHorizontal, marginHorizontal
 * Caps scaling on tablets to avoid over-stretching
 */
export const hs = (size) => {
  const scale = SCREEN_W / BASE_WIDTH;
  const capped = isTablet ? Math.min(scale, 1.4) : scale;
  return Math.round(PixelRatio.roundToNearestPixel(size * capped));
};

/**
 * Vertical scale — use for heights, paddingVertical, marginVertical
 */
export const vs = (size) => {
  const scale = SCREEN_H / BASE_HEIGHT;
  const capped = isTablet ? Math.min(scale, 1.3) : scale;
  return Math.round(PixelRatio.roundToNearestPixel(size * capped));
};

/**
 * Moderate scale — use for font sizes and border radius
 * factor: 0 = no scaling, 1 = full scaling. Default 0.5 = gentle
 */
export const ms = (size, factor = 0.5) => {
  return Math.round(PixelRatio.roundToNearestPixel(size + (hs(size) - size) * factor));
};

/**
 * Fluid font size — clamps between min and max
 */
export const fluidFont = (min, max) => {
  const scaled = ms(min);
  return Math.min(Math.max(scaled, min), max);
};

// ── Layout helpers ────────────────────────────────────────────────────────────
/**
 * Percentage of screen width
 */
export const wp = (percent) => (SCREEN_W * percent) / 100;

/**
 * Percentage of screen height
 */
export const hp = (percent) => (SCREEN_H * percent) / 100;

/**
 * Number of grid columns based on screen width
 * Small phone: 1, Normal phone: 2, Large phone/foldable: 2-3, Tablet: 3-4
 */
export const gridColumns = (minItemWidth = 160) => {
  return Math.max(1, Math.floor(SCREEN_W / minItemWidth));
};

/**
 * Max content width — centers content on tablets/web
 */
export const maxContentWidth = isTablet || isWeb ? Math.min(SCREEN_W, 720) : SCREEN_W;

/**
 * Content horizontal padding — larger on tablets/web
 */
export const contentPadding = isTablet || isWeb ? hs(32) : hs(16);

// ── Responsive card widths ─────────────────────────────────────────────────────
export const cardWidth = {
  full:    SCREEN_W - contentPadding * 2,
  half:    (SCREEN_W - contentPadding * 2 - hs(8)) / 2,
  third:   (SCREEN_W - contentPadding * 2 - hs(16)) / 3,
};

// ── Safe area helpers ─────────────────────────────────────────────────────────
export const HEADER_HEIGHT    = vs(56) + (isIOS ? vs(44) : vs(24));
export const TAB_BAR_HEIGHT   = vs(64) + (isIOS ? vs(34) : 0);  // includes home indicator

// ── Responsive breakpoints (for conditional rendering) ───────────────────────
export const breakpoints = {
  xs: SCREEN_W < 360,    // Very small Android phones
  sm: SCREEN_W < 390,    // Small phones (iPhone SE)
  md: SCREEN_W < 430,    // Standard phones
  lg: SCREEN_W < 768,    // Large phones / foldables
  xl: SCREEN_W >= 768,   // Tablets and web
};

// ── Typography scale — responsive font sizes ─────────────────────────────────
export const RF = {
  xs:   ms(10),
  sm:   ms(12),
  base: ms(14),
  md:   ms(16),
  lg:   ms(18),
  xl:   ms(22),
  xxl:  ms(26, 0.3),  // Less aggressive scaling for headers
  hero: ms(34, 0.2),  // Very gentle scaling for hero numbers
};

// ── Spacing scale — responsive spacing ────────────────────────────────────────
export const RS = {
  xs:  vs(4),
  sm:  vs(8),
  md:  vs(16),
  lg:  vs(24),
  xl:  vs(32),
  xxl: vs(48),
};

// ── Dynamic update on orientation change ─────────────────────────────────────
let _listeners = [];

export const addDimensionListener = (callback) => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback(window);
  });
  _listeners.push(subscription);
  return subscription;
};

export const removeDimensionListener = (subscription) => {
  subscription?.remove();
};

// ── Web-specific max-width container style ────────────────────────────────────
export const webContainer = isWeb ? {
  maxWidth:     720,
  marginLeft:   'auto',
  marginRight:  'auto',
  width:        '100%',
} : {};

// ── Tablet two-column layout ──────────────────────────────────────────────────
export const twoColumnLayout = isTablet ? {
  flexDirection: 'row',
  flexWrap:      'wrap',
} : {};

export const twoColumnItem = isTablet ? {
  width: '50%',
  paddingHorizontal: hs(8),
} : {
  width: '100%',
};

// ── Debug helper ──────────────────────────────────────────────────────────────
export const deviceInfo = {
  width:     SCREEN_W,
  height:    SCREEN_H,
  platform:  Platform.OS,
  isTablet,
  isPhone:   !isTablet,
  isFoldable,
  isSmallPhone,
  isWeb,
};
