// ─────────────────────────────────────────────────────────────────────────────
// FutureLetter.js — Write a letter to your future self, locked for 7 days
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS } from '../utils/constants';
import moment from 'moment';

const LOCK_DAYS = 7;

const FutureLetter = () => {
  const [letter,     setLetter]     = useState('');
  const [savedLetter, setSavedLetter] = useState(null);
  const [savedDate,  setSavedDate]  = useState(null);
  const [mode,       setMode]       = useState('loading'); // loading | write | locked | unlocked

  useEffect(() => { loadLetter(); }, []);

  const loadLetter = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.futureLetter);
      if (!raw) { setMode('write'); return; }
      const { text, date } = JSON.parse(raw);
      setSavedLetter(text);
      setSavedDate(date);
      const daysSince = moment().diff(moment(date), 'days');
      setMode(daysSince >= LOCK_DAYS ? 'unlocked' : 'locked');
    } catch {
      setMode('write');
    }
  };

  const saveLetter = async () => {
    if (letter.trim().length < 20) {
      Alert.alert('Too short', 'Write at least a few sentences to your future self.');
      return;
    }
    const payload = { text: letter.trim(), date: new Date().toISOString() };
    await AsyncStorage.setItem(STORAGE_KEYS.futureLetter, JSON.stringify(payload));
    setSavedLetter(letter.trim());
    setSavedDate(payload.date);
    setMode('locked');
    Alert.alert('Letter Sealed 💌', `Your letter is locked for ${LOCK_DAYS} days. Come back when you're ready.`);
  };

  const deleteLetter = () => {
    Alert.alert('Delete Letter?', 'This will permanently remove your letter.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEYS.futureLetter);
          setLetter('');
          setSavedLetter(null);
          setSavedDate(null);
          setMode('write');
        },
      },
    ]);
  };

  const daysLeft = savedDate
    ? Math.max(0, LOCK_DAYS - moment().diff(moment(savedDate), 'days'))
    : LOCK_DAYS;

  // ── Write Mode ─────────────────────────────────────────────────────────────
  if (mode === 'write') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💌 Letter to Your Future Self</Text>
        <Text style={styles.subtitle}>
          Write honestly. This letter unlocks after {LOCK_DAYS} days.{'\n'}
          It is a personal commitment timer, not a recovery check.
        </Text>
        <Text style={styles.prompt}>
          Suggested start: "If you're reading this, you made it {LOCK_DAYS} days. Remember why you started..."
        </Text>
        <TextInput
          style={styles.textInput}
          value={letter}
          onChangeText={setLetter}
          multiline
          placeholder="Dear future me..."
          placeholderTextColor={COLORS.textMuted}
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.charCount}>{letter.length}/2000</Text>
        <TouchableOpacity onPress={saveLetter} style={styles.sealBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sealGradient}
          >
            <Text style={styles.sealBtnText}>🔒 Seal Letter for {LOCK_DAYS} Days</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Locked Mode ────────────────────────────────────────────────────────────
  if (mode === 'locked') {
    return (
      <View style={styles.container}>
        <View style={styles.lockedCard}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.lockedTitle}>Letter Sealed</Text>
          <Text style={styles.lockedSub}>Written on {moment(savedDate).format('MMM D, YYYY')}</Text>
          <View style={styles.daysLeftBadge}>
            <Text style={styles.daysLeftNum}>{daysLeft}</Text>
            <Text style={styles.daysLeftLabel}>days until unlock</Text>
          </View>
          <Text style={styles.lockedHint}>
            The letter unlocks when its {LOCK_DAYS}-day timer ends.
          </Text>
        </View>
        <TouchableOpacity onPress={deleteLetter} style={styles.deleteLink}>
          <Text style={styles.deleteLinkText}>Delete letter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Unlocked Mode ──────────────────────────────────────────────────────────
  if (mode === 'unlocked') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.unlockedContent}>
        <View style={styles.unlockedHeader}>
          <Text style={styles.unlockEmoji}>💌</Text>
          <Text style={styles.unlockedTitle}>A Message From Your Past Self</Text>
          <Text style={styles.unlockedDate}>Written {moment(savedDate).fromNow()}</Text>
        </View>
        <View style={styles.letterPaper}>
          <Text style={styles.letterText}>{savedLetter}</Text>
        </View>
        <TouchableOpacity onPress={deleteLetter} style={styles.deleteLink}>
          <Text style={styles.deleteLinkText}>Write a new letter</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
    padding:         SPACING.md,
  },
  title: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color:      COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  prompt: {
    fontSize:        FONTS.sizes.sm,
    color:           COLORS.textMuted,
    fontStyle:       'italic',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    marginBottom:    SPACING.md,
    lineHeight:      20,
  },
  textInput: {
    flex:            1,
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    color:           COLORS.textPrimary,
    fontSize:        FONTS.sizes.md,
    lineHeight:      24,
    borderWidth:     1,
    borderColor:     COLORS.border,
    minHeight:       200,
    marginBottom:    SPACING.xs,
  },
  charCount: {
    textAlign:    'right',
    fontSize:     FONTS.sizes.xs,
    color:        COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  sealBtn: {
    borderRadius: RADIUS.lg,
    overflow:     'hidden',
    elevation:    6,
  },
  sealGradient: {
    padding:    SPACING.md,
    alignItems: 'center',
  },
  sealBtnText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      '#fff',
  },
  lockedCard: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.xl,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
    marginTop:       SPACING.xl,
  },
  lockEmoji:   { fontSize: 56, marginBottom: SPACING.md },
  lockedTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  lockedSub:   { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  daysLeftBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius:    RADIUS.xl,
    padding:         SPACING.md,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.primary + '50',
    marginBottom:    SPACING.md,
    minWidth:        100,
  },
  daysLeftNum:   { fontSize: FONTS.sizes.hero, fontWeight: FONTS.weights.extrabold, color: COLORS.primary },
  daysLeftLabel: { fontSize: FONTS.sizes.xs, color: COLORS.primaryLight, marginTop: 2 },
  lockedHint:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  deleteLink:    { padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md },
  deleteLinkText:{ fontSize: FONTS.sizes.sm, color: COLORS.accentRed },
  unlockedContent: { paddingBottom: SPACING.xl },
  unlockedHeader:  { alignItems: 'center', marginBottom: SPACING.lg },
  unlockEmoji:     { fontSize: 60, marginBottom: SPACING.sm },
  unlockedTitle:   { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  unlockedDate:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  letterPaper: {
    backgroundColor: '#1a1a2e',
    borderRadius:    RADIUS.lg,
    padding:         SPACING.lg,
    borderWidth:     1,
    borderColor:     COLORS.primary + '30',
  },
  letterText: {
    fontSize:   FONTS.sizes.md,
    color:      COLORS.textPrimary,
    lineHeight: 28,
    fontStyle:  'italic',
  },
});

export default FutureLetter;
