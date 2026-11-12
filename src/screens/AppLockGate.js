// ─────────────────────────────────────────────────────────────────────────────
// AppLockGate.js — The "blocked app" interstitial screen
//
// Shown when a user tries to open a locked app.
// Features:
//   • Gemini AI motivational quote (fetched fresh each time)
//   • PIN pad to unlock for this session
//   • 3-attempt lockout (5 min)
//   • "Ground Me" escape hatch → launches grounding exercise
//   • Soul Coins reward for choosing to stay locked
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, StatusBar, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { useDispatch }       from 'react-redux';

import { verifyPassword }        from '../utils/encryption';
import { fetchDailyMotivation }  from '../services/GeminiService';
import { addCoins }              from '../store/coinsSlice';
import GroundingExercise         from '../components/GroundingExercise';
import { COLORS, FONTS, SPACING, RADIUS, COIN_REWARDS } from '../utils/constants';

const MAX_ATTEMPTS    = 3;
const LOCKOUT_SECONDS = 300; // 5 minutes
const KEYPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ─────────────────────────────────────────────────────────────────────────────
// Animated PIN Dots
// ─────────────────────────────────────────────────────────────────────────────
const PinDots = ({ filled, shake }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(anim, { toValue: 12,  duration: 70,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: -12, duration: 70,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: 8,   duration: 55,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: -8,  duration: 55,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0,   duration: 45,  useNativeDriver: true }),
    ]).start();
  }, [shake]);

  return (
    <Animated.View style={[styles.dots, { transform: [{ translateX: anim }] }]}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Lockout Timer
// ─────────────────────────────────────────────────────────────────────────────
const LockoutTimer = ({ seconds, onExpire }) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const id = setInterval(() => setRemaining((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <View style={styles.lockoutBox}>
      <Text style={styles.lockoutEmoji}>🔒</Text>
      <Text style={styles.lockoutTitle}>Too many wrong attempts</Text>
      <Text style={styles.lockoutTimer}>{mm}:{ss}</Text>
      <Text style={styles.lockoutSub}>Stay strong. Use this time to breathe.</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main AppLockGate
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Props:
 *   appName    {string}   — Name of the locked app, e.g. "Instagram"
 *   appEmoji   {string}   — Emoji for the app, e.g. "📸"
 *   onUnlocked {function} — Called when PIN verified; parent navigates away
 *   onDismiss  {function} — Called when user taps "Stay Locked / Go Back"
 */
const AppLockGate = ({ appName = 'this app', appEmoji = '🔒', onUnlocked, onDismiss }) => {
  const dispatch = useDispatch();

  const [pin,          setPin]          = useState('');
  const [shake,        setShake]        = useState(false);
  const [attempts,     setAttempts]     = useState(0);
  const [lockedOut,    setLockedOut]    = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [motivation,   setMotivation]   = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [showGround,   setShowGround]   = useState(false);
  const [stayedStrong, setStayedStrong] = useState(false);

  // Fetch a fresh Gemini quote every time the gate opens
  useEffect(() => {
    fetchDailyMotivation()
      .then(setMotivation)
      .catch(() =>
        setMotivation({
          quote:       'Every time you resist, you get stronger.',
          explanation: 'This moment of friction is the recovery working.',
          action:      'Take 3 deep breaths, then decide.',
        })
      )
      .finally(() => setLoadingQuote(false));
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  const handleKey = async (key) => {
    if (lockedOut) return;
    if (key === '') return;

    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setErrorMsg('');
      return;
    }

    const newPin = pin + key;
    if (newPin.length > 4) return;
    setPin(newPin);

    if (newPin.length === 4) {
      setTimeout(() => verifyPin(newPin), 100);
    }
  };

  const verifyPin = async (entered) => {
    const ok = await verifyPassword(entered);

    if (ok) {
      setErrorMsg('');
      onUnlocked?.();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      triggerShake();
      setPin('');

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedOut(true);
        setErrorMsg('');
      } else {
        setErrorMsg(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} left.`);
      }
    }
  };

  const handleStayStrong = () => {
    if (!stayedStrong) {
      dispatch(addCoins({ amount: COIN_REWARDS.focusSession, reason: 'Resisted opening a locked app 💪' }));
      setStayedStrong(true);
    }
    onDismiss?.();
  };

  const handleGroundingComplete = () => {
    setShowGround(false);
    dispatch(addCoins({ amount: COIN_REWARDS.groundingExercise, reason: 'Grounding exercise on urge' }));
    onDismiss?.();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Background gradient */}
      <LinearGradient
        colors={[COLORS.gradientStart + '66', COLORS.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── App blocked header ── */}
        <View style={styles.blockedHeader}>
          <Text style={styles.appEmoji}>{appEmoji}</Text>
          <Text style={styles.blockedTitle}>{appName} is locked</Text>
          <Text style={styles.blockedSub}>You locked this app to protect your recovery.</Text>
        </View>

        {/* ── Gemini Motivation Quote ── */}
        <View style={styles.quoteCard}>
          {loadingQuote ? (
            <View style={styles.quoteLoading}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.quoteLoadingText}>Getting your motivation...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.geminiTag}>✨ Gemini AI · Today's Strength</Text>
              <Text style={styles.quoteText}>"{motivation?.quote}"</Text>
              {motivation?.explanation ? (
                <Text style={styles.quoteExplanation}>{motivation.explanation}</Text>
              ) : null}
              {motivation?.action ? (
                <View style={styles.actionChip}>
                  <Text style={styles.actionText}>👉 {motivation.action}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* ── Lockout OR PIN pad ── */}
        {lockedOut ? (
          <LockoutTimer
            seconds={LOCKOUT_SECONDS}
            onExpire={() => { setLockedOut(false); setAttempts(0); }}
          />
        ) : (
          <>
            <Text style={styles.pinPrompt}>Enter PIN to unlock</Text>

            <PinDots filled={pin.length} shake={shake} />

            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}

            <View style={styles.keypad}>
              {KEYPAD.map((key, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.key, key === '' && styles.keyEmpty]}
                  onPress={() => handleKey(key)}
                  disabled={key === ''}
                  activeOpacity={key === '' ? 1 : 0.7}
                >
                  <Text style={[styles.keyText, key === '⌫' && styles.keyBackspace]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Action buttons ── */}
        <View style={styles.actionButtons}>
          {/* Ground Me — earns coins, dismisses */}
          <TouchableOpacity
            style={styles.groundBtn}
            onPress={() => setShowGround(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.groundBtnText}>🧘 Ground Me Instead</Text>
            <Text style={styles.groundBtnSub}>90-sec exercise · Earn {COIN_REWARDS.groundingExercise} 🪙</Text>
          </TouchableOpacity>

          {/* Stay Locked — earns coins, dismisses */}
          <TouchableOpacity
            style={styles.stayBtn}
            onPress={handleStayStrong}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.accentGreen + 'CC', '#00A870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stayBtnGrad}
            >
              <Text style={styles.stayBtnText}>
                💪 Stay Strong · Go Back{stayedStrong ? '' : ` (+${COIN_REWARDS.focusSession} 🪙)`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Grounding Exercise Modal */}
      <Modal visible={showGround} animationType="slide" onRequestClose={() => setShowGround(false)}>
        <GroundingExercise
          onComplete={handleGroundingComplete}
          onExit={() => setShowGround(false)}
        />
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow:          1,
    alignItems:        'center',
    paddingTop:        SPACING.xl,
    paddingBottom:     SPACING.xxl,
    paddingHorizontal: SPACING.md,
    gap:               SPACING.md,
  },

  // ── App blocked header ──
  blockedHeader: {
    alignItems:  'center',
    gap:         SPACING.xs,
    marginBottom: SPACING.xs,
  },
  appEmoji: {
    fontSize:     52,
    marginBottom: SPACING.xs,
  },
  blockedTitle: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
    textAlign:  'center',
  },
  blockedSub: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Quote card ──
  quoteCard: {
    width:           '100%',
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.lg,
    borderWidth:     1,
    borderColor:     COLORS.primary + '50',
    gap:             SPACING.sm,
  },
  quoteLoading: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    justifyContent:'center',
    paddingVertical: SPACING.md,
  },
  quoteLoadingText: {
    color:    COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  geminiTag: {
    fontSize:   FONTS.sizes.xs,
    color:      COLORS.accent,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color:      COLORS.textPrimary,
    lineHeight: 24,
    fontStyle:  'italic',
  },
  quoteExplanation: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textSecondary,
    lineHeight: 20,
  },
  actionChip: {
    backgroundColor: COLORS.primary + '20',
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    marginTop:       SPACING.xs,
  },
  actionText: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.primaryLight,
    fontWeight: FONTS.weights.medium,
  },

  // ── PIN ──
  pinPrompt: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            16,
    marginVertical: SPACING.sm,
  },
  dot: {
    width:           18,
    height:          18,
    borderRadius:    9,
    borderWidth:     2,
    borderColor:     COLORS.textMuted,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
  errorText: {
    color:    COLORS.accentRed,
    fontSize: FONTS.sizes.sm,
    textAlign:'center',
  },

  // ── Keypad ──
  keypad: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    width:          264,
    gap:            10,
    justifyContent: 'center',
  },
  key: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: COLORS.card,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
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

  // ── Lockout ──
  lockoutBox: {
    alignItems:      'center',
    backgroundColor: COLORS.accentRed + '15',
    borderRadius:    RADIUS.xl,
    padding:         SPACING.xl,
    borderWidth:     1,
    borderColor:     COLORS.accentRed + '40',
    gap:             SPACING.sm,
    width:           '100%',
  },
  lockoutEmoji: { fontSize: 44 },
  lockoutTitle: {
    fontSize:   FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.accentRed,
  },
  lockoutTimer: {
    fontSize:   FONTS.sizes.hero,
    fontWeight: FONTS.weights.extrabold,
    color:      COLORS.textPrimary,
    fontVariant:['tabular-nums'],
  },
  lockoutSub: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textMuted,
    textAlign: 'center',
  },

  // ── Action buttons ──
  actionButtons: {
    width: '100%',
    gap:   SPACING.sm,
    marginTop: SPACING.xs,
  },
  groundBtn: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.accentPurple + '60',
    gap:             SPACING.xs,
  },
  groundBtnText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.accentPurple,
  },
  groundBtnSub: {
    fontSize: FONTS.sizes.xs,
    color:    COLORS.textMuted,
  },
  stayBtn: {
    borderRadius: RADIUS.lg,
    overflow:     'hidden',
    elevation:    6,
    shadowColor:  COLORS.accentGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius:  6,
  },
  stayBtnGrad: {
    padding:    SPACING.md,
    alignItems: 'center',
  },
  stayBtnText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      '#fff',
  },
});

export default AppLockGate;
