// ─────────────────────────────────────────────────────────────────────────────
// MotivationCard.js — Gemini quote + Unsplash image card with share support
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Share, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

const MotivationCard = ({
  quote       = '',
  explanation = '',
  action      = '',
  imageUrl    = '',
  loading     = false,
  onRefresh,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${quote}"\n\n${explanation}\n\nToday's action: ${action}\n\n— Start A New Life App`,
        title:   'Daily Motivation',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching your daily wisdom...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>✨ Today's Motivation</Text>

      <View style={styles.card}>
        {/* Background image */}
        {imageUrl ? (
          <Animated.Image
            source={{ uri: imageUrl }}
            style={[styles.image, { opacity: fadeAnim }]}
            onLoad={handleImageLoad}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(10,14,26,0.6)', 'rgba(10,14,26,0.95)']}
          style={styles.gradient}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Quote */}
          <Text style={styles.quoteMarks}>"</Text>
          <Text style={styles.quote}>{quote || 'Loading your daily wisdom...'}</Text>

          {/* Explanation */}
          {explanation ? (
            <Text style={styles.explanation}>{explanation}</Text>
          ) : null}

          {/* Action pill */}
          {action ? (
            <View style={styles.actionPill}>
              <Text style={styles.actionIcon}>⚡</Text>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.8}>
              <Text style={styles.refreshBtnText}>🔄 New Quote</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
  },
  sectionLabel: {
    fontSize:   FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color:      COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 1,
  },
  card: {
    borderRadius:    RADIUS.xl,
    overflow:        'hidden',
    backgroundColor: COLORS.card,
    minHeight:       280,
    elevation:       8,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    8,
  },
  loadingCard: {
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.xl,
    gap:            SPACING.md,
  },
  loadingText: {
    color:    COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  image: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    bottom:   0,
    width:    '100%',
    height:   '100%',
  },
  imagePlaceholder: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: COLORS.surfaceAlt,
  },
  gradient: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    bottom:   0,
  },
  content: {
    padding:        SPACING.lg,
    paddingTop:     SPACING.xl * 2,
    justifyContent: 'flex-end',
  },
  quoteMarks: {
    fontSize:   60,
    color:      COLORS.primary,
    lineHeight: 40,
    fontWeight: FONTS.weights.extrabold,
    opacity:    0.7,
  },
  quote: {
    fontSize:   FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: SPACING.sm,
  },
  explanation: {
    fontSize:     FONTS.sizes.sm,
    color:        'rgba(255,255,255,0.75)',
    lineHeight:   20,
    marginBottom: SPACING.md,
  },
  actionPill: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.primary + '30',
    borderRadius:    RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    alignSelf:       'flex-start',
    marginBottom:    SPACING.md,
    gap:             SPACING.xs,
    borderWidth:     1,
    borderColor:     COLORS.primary + '50',
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.primaryLight,
    fontWeight: FONTS.weights.semibold,
    flexShrink: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
  },
  shareBtn: {
    flex:            1,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    alignItems:      'center',
  },
  shareBtnText: {
    color:      '#fff',
    fontWeight: FONTS.weights.semibold,
    fontSize:   FONTS.sizes.sm,
  },
  refreshBtn: {
    flex:            1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  refreshBtnText: {
    color:      COLORS.textSecondary,
    fontWeight: FONTS.weights.semibold,
    fontSize:   FONTS.sizes.sm,
  },
});

export default MotivationCard;
