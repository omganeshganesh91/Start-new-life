// ─────────────────────────────────────────────────────────────────────────────
// SetPinScreen.js — First-time PIN setup + Gemini motivational welcome
//
// Flow:
//   1. Gemini AI generates a personalised welcome motivation
//   2. User enters a 4-digit PIN
//   3. User confirms the PIN
//   4. PIN is hashed + saved to expo-secure-store (iOS Keychain / Android Keystore)
//   5. Navigate back to AppLock tab
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { savePassword }          from '../utils/encryption';
import { fetchDailyMotivation }  from '../services/GeminiService';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

// ─────────────────────────────────────────────────────────────────────────────
// PIN Pad
// ─────────────────────────────────────────────────────────────────────────────
const KEYPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

const PinDots = ({ length, filled, shake }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(anim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 60,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6,   duration: 50,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: -6,  duration: 50,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0,   duration: 40,  useNativeDriver: true }),
    ]).start();
  }, [shake]);

  return (
    <Animated.View style={[pinStyles.dots, { transform: [{ translateX: anim }] }]}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            pinStyles.dot,
            i < filled && pinStyles.dotFilled,
          ]}
        />
      ))}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const SetPinScreen = ({ navigation }) => {
  const [stage,      setStage]      = useState('set');    // 'set' | 'confirm'
  const [pin,        setPin]        = useState('');
  const [firstPin,   setFirstPin]   = useState('');
  const [shake,      setShake]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [motivation, setMotivation] = useState(null);
  const [loadingQ,   setLoadingQ]   = useState(true);

  // Fetch Gemini quote on mount
  useEffect(() => {
    fetchDailyMotivation()
      .then(setMotivation)
      .catch(() => setMotivation({
        quote:       'Every locked app is a door you chose not to open.',
        explanation: 'Your PIN is your commitment to yourself. Guard it well.',
      }))
      .finally(() => setLoadingQ(false));
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKey = async (key) => {
    if (key === '') return;

    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }

    const newPin = pin + key;
    if (newPin.length > 4) return;
    setPin(newPin);

    // Auto-advance at 4 digits
    if (newPin.length === 4) {
      setTimeout(() => processPin(newPin), 120);
    }
  };

  const processPin = async (entered) => {
    if (stage === 'set') {
      setFirstPin(entered);
      setPin('');
      setStage('confirm');
      setError('');
    } else {
      // Confirm stage
      if (entered !== firstPin) {
        setError("PINs don't match. Try again.");
        triggerShake();
        setPin('');
        setStage('set');
        setFirstPin('');
      } else {
        // Save
        setSaving(true);
        await savePassword(entered);
        setSaving(false);
        navigation.replace('Main', { screen: 'AppLock' });
      }
    }
  };

  const stageLabel = stage === 'set'
    ? 'Choose a 4-digit PIN'
    : 'Confirm your PIN';

  const stageEmoji = stage === 'set' ? '🔐' : '✅';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={[COLORS.gradientStart + '55', COLORS.background, COLORS.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gemini Quote Card ── */}
        <View style={styles.quoteCard}>
          {loadingQ ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.quoteText}>
                "{motivation?.quote || 'Your commitment starts here.'}"
              </Text>
              {motivation?.explanation ? (
                <Text style={styles.quoteExplanation}>{motivation.explanation}</Text>
              ) : null}
              <Text style={styles.quoteTag}>✨ Powered by Gemini AI</Text>
            </>
          )}
        </View>

        {/* ── Stage Header ── */}
        <View style={styles.stageHeader}>
          <Text style={styles.stageEmoji}>{stageEmoji}</Text>
          <Text style={styles.stageLabel}>{stageLabel}</Text>
          <Text style={styles.stageSub}>
            {stage === 'set'
              ? 'This PIN protects your locked apps.'
              : 'Enter the same PIN again to confirm.'}
          </Text>
        </View>

        {/* ── PIN Dots ── */}
        <PinDots length={4} filled={pin.length} shake={shake} />

        {/* ── Error ── */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* ── Keypad ── */}
        <View style={styles.keypad}>
          {KEYPAD.map((key, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.key, key === '' && styles.keyEmpty]}
              onPress={() => handleKey(key)}
              disabled={key === '' || saving}
              activeOpacity={key === '' ? 1 : 0.7}
            >
              <Text style={[styles.keyText, key === '⌫' && styles.keyBackspace]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator color={COLORS.accentGreen} size="small" />
            <Text style={styles.savingText}>Securing your PIN...</Text>
          </View>
        )}

        {/* Cancel */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const pinStyles = StyleSheet.create({
  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            16,
    marginVertical: SPACING.md,
  },
  dot: {
    width:        18,
    height:       18,
    borderRadius: 9,
    borderWidth:  2,
    borderColor:  COLORS.textMuted,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow:        1,
    alignItems:      'center',
    paddingTop:      SPACING.xl,
    paddingBottom:   SPACING.xxl,
    paddingHorizontal: SPACING.md,
  },

  // ── Quote card ──
  quoteCard: {
    width:           '100%',
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.lg,
    marginBottom:    SPACING.xl,
    borderWidth:     1,
    borderColor:     COLORS.primary + '40',
    alignItems:      'center',
    gap:             SPACING.sm,
  },
  quoteText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color:      COLORS.textPrimary,
    textAlign:  'center',
    lineHeight: 24,
    fontStyle:  'italic',
  },
  quoteExplanation: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  quoteTag: {
    fontSize:  FONTS.sizes.xs,
    color:     COLORS.accent,
    marginTop: SPACING.xs,
  },

  // ── Stage header ──
  stageHeader: {
    alignItems:    'center',
    marginBottom:  SPACING.sm,
    gap:           SPACING.xs,
  },
  stageEmoji: { fontSize: 36 },
  stageLabel: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
    textAlign:  'center',
  },
  stageSub: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Error ──
  errorText: {
    color:        COLORS.accentRed,
    fontSize:     FONTS.sizes.sm,
    textAlign:    'center',
    marginBottom: SPACING.xs,
  },

  // ── Keypad ──
  keypad: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    width:          264,
    gap:            12,
    justifyContent: 'center',
    marginTop:      SPACING.sm,
  },
  key: {
    width:          80,
    height:         80,
    borderRadius:   40,
    backgroundColor: COLORS.card,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    borderColor:    COLORS.border,
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor:     'transparent',
  },
  keyText: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
  },
  keyBackspace: {
    fontSize: FONTS.sizes.lg,
    color:    COLORS.textMuted,
  },

  // ── Saving ──
  savingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    marginTop:     SPACING.md,
  },
  savingText: {
    color:    COLORS.accentGreen,
    fontSize: FONTS.sizes.sm,
  },

  // ── Cancel ──
  cancelBtn: {
    marginTop: SPACING.xl,
    padding:   SPACING.sm,
  },
  cancelText: {
    color:    COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
});

export default SetPinScreen;
