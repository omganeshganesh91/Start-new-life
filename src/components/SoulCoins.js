// ─────────────────────────────────────────────────────────────────────────────
// SoulCoins.js — Soul Coins balance widget + earn animation
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, COIN_REWARDS } from '../utils/constants';

// ── Coin Balance Widget (compact, for Dashboard header) ───────────────────────
export const CoinBalanceWidget = ({ balance = 0, onPress }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[styles.widget, { transform: [{ scale: bounceAnim }] }]}>
        <Text style={styles.coinEmoji}>🪙</Text>
        <Text style={styles.widgetBalance}>{balance}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Earn Notification (floating +N coins) ─────────────────────────────────────
export const CoinEarnNotification = ({ amount, visible, onDone }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    moveAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(moveAnim, { toValue: -60, duration: 800, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(onDone);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.earnNotif,
        { opacity: fadeAnim, transform: [{ translateY: moveAnim }] },
      ]}
    >
      <Text style={styles.earnText}>+{amount} 🪙</Text>
    </Animated.View>
  );
};

// ── Full Soul Coins Card (for Dashboard) ─────────────────────────────────────
const SoulCoins = ({ balance = 0, todayEarned = 0 }) => {
  const earnable = [
    { emoji: '📅', label: 'Clean day',        reward: COIN_REWARDS.cleanDay },
    { emoji: '✨', label: 'Read motivation',   reward: COIN_REWARDS.readMotivation },
    { emoji: '🎯', label: 'Focus session',     reward: COIN_REWARDS.focusSession },
    { emoji: '🧘', label: 'Grounding',         reward: COIN_REWARDS.groundingExercise },
  ];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🪙 Soul Coins</Text>
          <Text style={styles.subtitle}>Earn by staying clean</Text>
        </View>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceNumber}>{balance}</Text>
          <Text style={styles.balanceLabel}>coins</Text>
        </View>
      </View>

      {/* Today's earnings bar */}
      {todayEarned > 0 && (
        <View style={styles.todayRow}>
          <Text style={styles.todayText}>+{todayEarned} earned today</Text>
        </View>
      )}

      {/* How to earn */}
      <View style={styles.earnGrid}>
        {earnable.map((item) => (
          <View key={item.label} style={styles.earnItem}>
            <Text style={styles.earnEmoji}>{item.emoji}</Text>
            <Text style={styles.earnLabel}>{item.label}</Text>
            <Text style={styles.earnReward}>+{item.reward}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Widget
  widget: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius:    RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    gap:             4,
    borderWidth:     1,
    borderColor:     COLORS.accent + '40',
  },
  coinEmoji: {
    fontSize: 16,
  },
  widgetBalance: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.accent,
  },

  // Earn notification
  earnNotif: {
    position:      'absolute',
    top:           100,
    alignSelf:     'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical:   SPACING.sm,
    borderRadius:  RADIUS.full,
    elevation:     20,
  },
  earnText: {
    fontSize:   FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color:      '#000',
  },

  // Card
  card: {
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    backgroundColor:  COLORS.card,
    borderRadius:     RADIUS.lg,
    padding:          SPACING.md,
    borderWidth:      1,
    borderColor:      COLORS.accent + '30',
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.sm,
  },
  title: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    color:    COLORS.textMuted,
    marginTop: 2,
  },
  balanceBox: {
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    minWidth:        60,
  },
  balanceNumber: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.extrabold,
    color:      COLORS.accent,
  },
  balanceLabel: {
    fontSize: FONTS.sizes.xs,
    color:    COLORS.accent,
  },
  todayRow: {
    backgroundColor: COLORS.accentGreen + '20',
    borderRadius:    RADIUS.sm,
    padding:         SPACING.xs,
    marginBottom:    SPACING.sm,
    alignItems:      'center',
  },
  todayText: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.accentGreen,
    fontWeight: FONTS.weights.semibold,
  },
  earnGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           SPACING.xs,
  },
  earnItem: {
    flex:           1,
    minWidth:       '45%',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius:   RADIUS.md,
    padding:        SPACING.sm,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
  },
  earnEmoji: {
    fontSize: 16,
  },
  earnLabel: {
    flex:     1,
    fontSize: FONTS.sizes.xs,
    color:    COLORS.textSecondary,
  },
  earnReward: {
    fontSize:   FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.accent,
  },
});

export default SoulCoins;
