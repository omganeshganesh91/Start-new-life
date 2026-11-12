// ─────────────────────────────────────────────────────────────────────────────
// StreakCard.js — Displays streak counter, sober days, milestone badge
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { formatSoberDuration, getMilestoneMessage } from '../utils/dateUtils';

const StreakCard = ({ streak = 0, startDate, longestStreak = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue:       1,
      tension:       80,
      friction:      8,
      useNativeDriver: true,
    }).start();

    // Glow pulse for milestone streaks
    if ([1,3,7,14,21,30,60,90,180,365].includes(streak)) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [streak]);

  const milestone = getMilestoneMessage(streak);
  const soberTime = startDate ? formatSoberDuration(startDate) : '—';

  const flameEmoji = streak === 0 ? '💧' : streak < 3 ? '🌱' : streak < 7 ? '🔥' : streak < 30 ? '⚡' : '👑';

  const glowOpacity = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.3, 0.9],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Glow ring for milestones */}
        {milestone && (
          <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
        )}

        {/* Top row: flame + streak number */}
        <View style={styles.topRow}>
          <Text style={styles.flameEmoji}>{flameEmoji}</Text>
          <View style={styles.streakNumbers}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>
              {streak === 1 ? 'DAY CLEAN' : 'DAYS CLEAN'}
            </Text>
          </View>
        </View>

        {/* Milestone badge */}
        {milestone && (
          <View style={styles.milestoneBadge}>
            <Text style={styles.milestoneText}>{milestone}</Text>
          </View>
        )}

        {/* Bottom stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{soberTime}</Text>
            <Text style={styles.statLabel}>Sober Time</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{longestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    borderRadius:     RADIUS.xl,
    elevation:        12,
    shadowColor:      COLORS.gradientStart,
    shadowOffset:     { width: 0, height: 6 },
    shadowOpacity:    0.5,
    shadowRadius:     12,
  },
  gradient: {
    borderRadius: RADIUS.xl,
    padding:      SPACING.lg,
    overflow:     'hidden',
  },
  glowRing: {
    position:     'absolute',
    top:          -20,
    right:        -20,
    width:        120,
    height:       120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.md,
  },
  flameEmoji: {
    fontSize: 52,
  },
  streakNumbers: {
    flex: 1,
  },
  streakNumber: {
    fontSize:   FONTS.sizes.hero,
    fontWeight: FONTS.weights.extrabold,
    color:      COLORS.textPrimary,
    lineHeight: 44,
  },
  streakLabel: {
    fontSize:      FONTS.sizes.sm,
    fontWeight:    FONTS.weights.bold,
    color:         'rgba(255,255,255,0.75)',
    letterSpacing: 2,
  },
  milestoneBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    marginTop:         SPACING.sm,
    alignSelf:         'flex-start',
  },
  milestoneText: {
    fontSize:   FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color:      COLORS.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop:     SPACING.md,
    paddingTop:    SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  stat: {
    flex:       1,
    alignItems: 'center',
  },
  statValue: {
    fontSize:   FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
  },
  statLabel: {
    fontSize:   FONTS.sizes.xs,
    color:      'rgba(255,255,255,0.65)',
    marginTop:  2,
    letterSpacing: 1,
  },
  divider: {
    width:           1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: SPACING.sm,
  },
});

export default StreakCard;
