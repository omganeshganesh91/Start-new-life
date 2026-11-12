// ─────────────────────────────────────────────────────────────────────────────
// ResponsiveContainer.js — Wraps screens for tablet/web centering
// Use this around every screen's root View to get proper layout on all devices
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { isTablet, isWeb, maxContentWidth, contentPadding } from '../utils/responsive';
import { COLORS } from '../utils/constants';

/**
 * ResponsiveContainer
 * - On phones: full width, no change
 * - On tablets: centered, max 720px wide with side padding
 * - On web: max 720px centered, with web-appropriate margins
 */
const ResponsiveContainer = ({ children, style, scrollable = false }) => {
  if (!isTablet && !isWeb) {
    // Phone: pass through unchanged
    return <View style={[styles.phone, style]}>{children}</View>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  phone: {
    flex: 1,
  },
  outerContainer: {
    flex:            1,
    backgroundColor: COLORS.background,
    alignItems:      'center',
  },
  innerContainer: {
    flex:             1,
    width:            '100%',
    maxWidth:         maxContentWidth,
    paddingHorizontal: isWeb ? contentPadding : 0,
  },
});

export default ResponsiveContainer;
