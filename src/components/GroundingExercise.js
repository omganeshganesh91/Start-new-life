// ─────────────────────────────────────────────────────────────────────────────
// GroundingExercise.js — 5-4-3-2-1 Grounding technique (urge surfing)
// Research-backed: urges typically peak and pass within 90 seconds
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, GROUNDING_STEPS } from '../utils/constants';

const TOTAL_DURATION = 90; // seconds

const GroundingExercise = ({ onComplete, onExit }) => {
  const [stepIndex, setStepIndex]   = useState(0);
  const [phase, setPhase]           = useState('intro'); // intro | active | complete
  const [timeLeft, setTimeLeft]     = useState(TOTAL_DURATION);
  const [inputCount, setInputCount] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(0.8)).current;
  const timerRef     = useRef(null);

  const currentStep = GROUNDING_STEPS[stepIndex];
  const stepTarget  = currentStep?.number || 5;

  // ── Progress bar animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;
    Animated.timing(progressAnim, {
      toValue:  1,
      duration: TOTAL_DURATION * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('complete');
          onComplete?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Step entry animation ───────────────────────────────────────────────────
  useEffect(() => {
    scaleAnim.setValue(0.8);
    Animated.spring(scaleAnim, {
      toValue:  1,
      tension:  100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [stepIndex]);

  const handleCountInput = () => {
    Vibration.vibrate(40);
    const next = inputCount + 1;
    setInputCount(next);

    if (next >= stepTarget) {
      // Move to next step
      const nextStep = stepIndex + 1;
      if (nextStep >= GROUNDING_STEPS.length) {
        setPhase('complete');
        onComplete?.();
      } else {
        setStepIndex(nextStep);
        setInputCount(0);
      }
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Intro Screen ───────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🧘 Grounding Exercise</Text>
        <Text style={styles.subtitle}>
          This will take ~90 seconds.{'\n'}
          Urges always pass. Let's ride this one out together.
        </Text>
        <Text style={styles.description}>
          The 5-4-3-2-1 technique interrupts the urge by engaging all 5 senses.
          Backed by clinical research in addiction therapy.
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={() => setPhase('active')} activeOpacity={0.85}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startGradient}
          >
            <Text style={styles.startBtnText}>Start Grounding →</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExit} style={styles.exitLink}>
          <Text style={styles.exitLinkText}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Complete Screen ────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <View style={styles.container}>
        <Text style={styles.completeEmoji}>🎉</Text>
        <Text style={styles.completeTitle}>You made it through!</Text>
        <Text style={styles.completeText}>
          The urge has passed. Your brain just rewired itself a little.{'\n'}
          You earned +3 🪙 Soul Coins.
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={onExit} activeOpacity={0.85}>
          <View style={[styles.startGradient, { backgroundColor: COLORS.accentGreen }]}>
            <Text style={styles.startBtnText}>✅ Back to App</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Active Exercise ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Timer bar */}
      <View style={styles.timerBar}>
        <Animated.View style={[styles.timerFill, { width: progressWidth, backgroundColor: currentStep?.color || COLORS.primary }]} />
      </View>
      <Text style={styles.timerText}>{timeLeft}s remaining</Text>

      {/* Step card */}
      <Animated.View style={[styles.stepCard, { borderColor: currentStep?.color + '60', transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.stepEmoji}>{currentStep?.icon}</Text>
        <Text style={[styles.stepSense, { color: currentStep?.color }]}>
          {currentStep?.number} — {currentStep?.sense}
        </Text>
        <Text style={styles.stepInstruction}>{currentStep?.instruction}</Text>
      </Animated.View>

      {/* Counter */}
      <View style={styles.counterRow}>
        {Array.from({ length: stepTarget }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.counterDot,
              i < inputCount && { backgroundColor: currentStep?.color || COLORS.primary },
            ]}
          />
        ))}
      </View>
      <Text style={styles.counterHint}>{inputCount}/{stepTarget} — tap each one</Text>

      {/* Tap button */}
      <TouchableOpacity
        style={[styles.tapBtn, { borderColor: currentStep?.color }]}
        onPress={handleCountInput}
        activeOpacity={0.7}
      >
        <Text style={[styles.tapBtnText, { color: currentStep?.color }]}>
          TAP  ({inputCount}/{stepTarget})
        </Text>
      </TouchableOpacity>

      {/* Step indicators */}
      <View style={styles.stepDots}>
        {GROUNDING_STEPS.map((s, i) => (
          <View
            key={s.sense}
            style={[
              styles.stepDot,
              i === stepIndex && { backgroundColor: currentStep?.color },
              i < stepIndex && { backgroundColor: COLORS.accentGreen },
            ]}
          />
        ))}
      </View>

      <TouchableOpacity onPress={onExit} style={styles.exitLink}>
        <Text style={styles.exitLinkText}>Skip exercise</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:             1,
    backgroundColor:  COLORS.background,
    alignItems:       'center',
    justifyContent:   'center',
    padding:          SPACING.xl,
  },
  title: {
    fontSize:   FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
    textAlign:  'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize:   FONTS.sizes.md,
    color:      COLORS.textSecondary,
    textAlign:  'center',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.textMuted,
    textAlign:  'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  startBtn: {
    width:        '100%',
    borderRadius: RADIUS.lg,
    overflow:     'hidden',
    marginBottom: SPACING.md,
    elevation:    6,
  },
  startGradient: {
    padding:    SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  startBtnText: {
    fontSize:   FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color:      '#fff',
  },
  exitLink: {
    padding: SPACING.sm,
  },
  exitLinkText: {
    color:    COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  timerBar: {
    width:           '100%',
    height:          6,
    backgroundColor: COLORS.border,
    borderRadius:    3,
    overflow:        'hidden',
    marginBottom:    SPACING.sm,
  },
  timerFill: {
    height: '100%',
  },
  timerText: {
    fontSize:     FONTS.sizes.sm,
    color:        COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  stepCard: {
    width:         '100%',
    backgroundColor: COLORS.card,
    borderRadius:  RADIUS.xl,
    padding:       SPACING.xl,
    alignItems:    'center',
    borderWidth:   2,
    marginBottom:  SPACING.lg,
  },
  stepEmoji: {
    fontSize:     64,
    marginBottom: SPACING.sm,
  },
  stepSense: {
    fontSize:     FONTS.sizes.xl,
    fontWeight:   FONTS.weights.extrabold,
    letterSpacing: 3,
    marginBottom: SPACING.sm,
  },
  stepInstruction: {
    fontSize:   FONTS.sizes.md,
    color:      COLORS.textSecondary,
    textAlign:  'center',
    lineHeight: 24,
  },
  counterRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
    marginBottom:  SPACING.xs,
  },
  counterDot: {
    width:        20,
    height:       20,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    borderWidth:  2,
    borderColor:  COLORS.textMuted,
  },
  counterHint: {
    fontSize:     FONTS.sizes.xs,
    color:        COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  tapBtn: {
    width:        160,
    height:       160,
    borderRadius: 80,
    borderWidth:  3,
    alignItems:   'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    marginBottom: SPACING.lg,
  },
  tapBtnText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1,
  },
  stepDots: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  SPACING.md,
  },
  stepDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  completeEmoji: {
    fontSize:     80,
    marginBottom: SPACING.md,
  },
  completeTitle: {
    fontSize:   FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  completeText: {
    fontSize:   FONTS.sizes.md,
    color:      COLORS.textSecondary,
    textAlign:  'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
});

export default GroundingExercise;
