// ─────────────────────────────────────────────────────────────────────────────
// MirrorMoment.js — Front camera urge interrupt: shows user their own face
// Uses expo-camera (already in package.json — works with Expo Go, no extra linking)
// Pattern-interruption technique backed by behavioral psychology
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

const MIRROR_DURATION = 5; // seconds

const MirrorMoment = ({ onComplete, onSkip }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [countdown, setCountdown]       = useState(MIRROR_DURATION);
  const [phase,     setPhase]           = useState('idle'); // idle | active | done
  const timerRef  = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ask permission on mount
  useEffect(() => {
    (async () => {
      if (permission?.granted) {
        setPhase('active');
      } else {
        const result = await requestPermission();
        setPhase(result?.granted ? 'active' : 'noperm');
      }
    })();
  }, []);

  // Start countdown + pulse when camera goes active
  useEffect(() => {
    if (phase !== 'active') return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
      ])
    ).start();

    Vibration.vibrate([0, 100, 100, 100]);

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setPhase('done');
          onComplete?.();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── No permission fallback ─────────────────────────────────────────────────
  if (phase === 'noperm' || phase === 'idle') {
    return (
      <View style={styles.container}>
        <Text style={styles.mirrorEmoji}>🪞</Text>
        <Text style={styles.title}>Mirror Moment</Text>
        <Text style={styles.subtitle}>
          Look at yourself. Ask: "Is this who I want to be?"
        </Text>
        <Text style={styles.noCameraText}>
          Camera permission needed for full Mirror Moment experience.{'\n'}
          Use the reflection below instead.
        </Text>
        <View style={styles.reflectionBox}>
          <Text style={styles.reflectionText}>
            "The person you are becoming{'\n'}
            is watching the choices you make right now."
          </Text>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={onComplete} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>I've reflected — Continue ✓</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
          <Text style={styles.skipLinkText}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <View style={styles.container}>
        <Text style={styles.mirrorEmoji}>💪</Text>
        <Text style={styles.title}>Well done.</Text>
        <Text style={styles.subtitle}>
          You just chose to face yourself instead of escaping.{'\n'}
          That is what freedom looks like.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onComplete} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Active Camera ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.overlayText}>Is this who you want to be?</Text>

      <Animated.View style={[styles.cameraWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <CameraView
          style={styles.camera}
          facing="front"
        />
        {/* Countdown overlay */}
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNum}>{countdown}</Text>
        </View>
      </Animated.View>

      <Text style={styles.mirrorHint}>
        Look at yourself for {MIRROR_DURATION} seconds.{'\n'}
        No judgment. Just awareness.
      </Text>

      <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
        <Text style={styles.skipLinkText}>Skip Mirror Moment</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#000',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         SPACING.xl,
  },
  overlayText: {
    fontSize:     FONTS.sizes.xl,
    fontWeight:   FONTS.weights.bold,
    color:        '#fff',
    textAlign:    'center',
    marginBottom: SPACING.xl,
  },
  cameraWrapper: {
    width:        280,
    height:       380,
    borderRadius: RADIUS.xl,
    overflow:     'hidden',
    borderWidth:  3,
    borderColor:  COLORS.primary,
    marginBottom: SPACING.xl,
  },
  camera: { flex: 1 },
  countdownOverlay: {
    position:        'absolute',
    bottom:          SPACING.md,
    right:           SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius:    RADIUS.full,
    width:           48,
    height:          48,
    alignItems:      'center',
    justifyContent:  'center',
  },
  countdownNum: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.extrabold,
    color:      '#fff',
  },
  mirrorHint: {
    fontSize:     FONTS.sizes.sm,
    color:        'rgba(255,255,255,0.6)',
    textAlign:    'center',
    lineHeight:   22,
    marginBottom: SPACING.lg,
  },
  mirrorEmoji:  { fontSize: 64, marginBottom: SPACING.md },
  title: {
    fontSize:     FONTS.sizes.xxl,
    fontWeight:   FONTS.weights.bold,
    color:        '#fff',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize:     FONTS.sizes.md,
    color:        'rgba(255,255,255,0.7)',
    textAlign:    'center',
    lineHeight:   24,
    marginBottom: SPACING.lg,
  },
  noCameraText: {
    fontSize:     FONTS.sizes.sm,
    color:        COLORS.textMuted,
    textAlign:    'center',
    lineHeight:   20,
    marginBottom: SPACING.md,
  },
  reflectionBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.lg,
    marginBottom:    SPACING.xl,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  reflectionText: {
    fontSize:  FONTS.sizes.md,
    color:     '#fff',
    fontStyle: 'italic',
    lineHeight: 28,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor:   COLORS.primary,
    borderRadius:      RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical:   SPACING.md,
    width:             '100%',
    alignItems:        'center',
    marginBottom:      SPACING.sm,
  },
  doneBtnText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      '#fff',
  },
  skipLink:     { padding: SPACING.sm },
  skipLinkText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
});

export default MirrorMoment;
