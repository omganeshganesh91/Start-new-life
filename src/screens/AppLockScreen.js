// ─────────────────────────────────────────────────────────────────────────────
// AppLockScreen.js — Focus timer with app-avoidance preferences
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import AsyncStorage   from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { isPasswordSet }    from '../utils/encryption';
import { formatFocusTime }  from '../utils/dateUtils';
import { useDispatch } from 'react-redux';
import { addCoins } from '../store/coinsSlice';
import {
  COLORS, FONTS, SPACING, RADIUS,
  STORAGE_KEYS, FOCUS_DURATIONS, COIN_REWARDS,
} from '../utils/constants';

// ─────────────────────────────────────────────────────────────────────────────
// App list
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_APPS = [
  { id: 'instagram', name: 'Instagram',    emoji: '📸', pkg: 'com.instagram.android'         },
  { id: 'youtube',   name: 'YouTube',      emoji: '▶️', pkg: 'com.google.android.youtube'    },
  { id: 'twitter',   name: 'X (Twitter)',  emoji: '🐦', pkg: 'com.twitter.android'           },
  { id: 'tiktok',    name: 'TikTok',       emoji: '🎵', pkg: 'com.zhiliaoapp.musically'      },
  { id: 'reddit',    name: 'Reddit',       emoji: '🟠', pkg: 'com.reddit.frontpage'          },
  { id: 'snapchat',  name: 'Snapchat',     emoji: '👻', pkg: 'com.snapchat.android'          },
  { id: 'telegram',  name: 'Telegram',     emoji: '✈️', pkg: 'org.telegram.messenger'       },
  { id: 'whatsapp',  name: 'WhatsApp',     emoji: '💬', pkg: 'com.whatsapp'                  },
  { id: 'chrome',    name: 'Chrome',       emoji: '🌐', pkg: 'com.android.chrome'            },
  { id: 'browser',   name: 'Browser',      emoji: '🌏', pkg: 'com.sec.android.app.sbrowser' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AppLockScreen
// ─────────────────────────────────────────────────────────────────────────────
const AppLockScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [lockedApps,        setLockedApps]        = useState({});
  const [timeLimits,        setTimeLimits]         = useState({});
  const [focusActive,       setFocusActive]        = useState(false);
  const [focusSeconds,      setFocusSeconds]       = useState(0);
  const [showFocusModal,    setShowFocusModal]     = useState(false);
  const [selectedDuration,  setSelectedDuration]   = useState(60);
  const [timeLimitModal,    setTimeLimitModal]     = useState(null);
  const [customMinutes,     setCustomMinutes]      = useState('30');
  const [pinIsSet,          setPinIsSet]           = useState(false);

  const focusTimerRef = useRef(null);

  useEffect(() => {
    loadSettings();
    checkPin();
    return () => clearInterval(focusTimerRef.current);
  }, []);

  // Re-check PIN every time screen comes into focus (user may have just set it)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', checkPin);
    return unsubscribe;
  }, [navigation]);

  const checkPin = async () => {
    const set = await isPasswordSet();
    setPinIsSet(set);
  };

  const loadSettings = async () => {
    try {
      const la = await AsyncStorage.getItem(STORAGE_KEYS.lockedApps);
      const tl = await AsyncStorage.getItem(STORAGE_KEYS.appTimeLimits);
      if (la) setLockedApps(JSON.parse(la));
      if (tl) setTimeLimits(JSON.parse(tl));
    } catch (e) { console.warn(e); }
  };

  const saveLockedApps = async (updated) => {
    setLockedApps(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.lockedApps, JSON.stringify(updated));
  };

  const saveTimeLimits = async (updated) => {
    setTimeLimits(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.appTimeLimits, JSON.stringify(updated));
  };

  // Require PIN to be set before locking any app
  const toggleLock = (appId) => {
    if (!pinIsSet && !lockedApps[appId]) {
      Alert.alert(
        '🔐 Set a PIN first',
        'You need to set a PIN before locking apps.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => navigation.navigate('SetPin') },
        ]
      );
      return;
    }
    const updated = { ...lockedApps, [appId]: !lockedApps[appId] };
    saveLockedApps(updated);
  };

  const setTimeLimit = (appId, minutes) => {
    const updated = { ...timeLimits, [appId]: parseInt(minutes, 10) };
    saveTimeLimits(updated);
    setTimeLimitModal(null);
  };

  const removeTimeLimit = (appId) => {
    const { [appId]: _, ...rest } = timeLimits;
    saveTimeLimits(rest);
  };

  const startFocusMode = () => {
    setFocusActive(true);
    setFocusSeconds(selectedDuration * 60);
    setShowFocusModal(false);

    focusTimerRef.current = setInterval(() => {
      setFocusSeconds((s) => {
        if (s <= 1) {
          clearInterval(focusTimerRef.current);
          setFocusActive(false);
          dispatch(addCoins({ amount: COIN_REWARDS.focusSession, reason: 'Completed focus session' }));
          Alert.alert('🎯 Focus Session Complete!', `You earned +${COIN_REWARDS.focusSession} Soul Coins!`);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const cancelFocus = () => {
    clearInterval(focusTimerRef.current);
    setFocusActive(false);
    setFocusSeconds(0);
  };

  const lockedCount = Object.values(lockedApps).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎯 Focus &amp; App Avoidance</Text>
          <Text style={styles.headerSub}>Focus timer and saved app-avoidance preferences</Text>
        </View>

        {/* ── PIN Status Card ── */}
        <TouchableOpacity
          style={[styles.pinStatusCard, pinIsSet ? styles.pinStatusSet : styles.pinStatusUnset]}
          onPress={() => navigation.navigate('SetPin')}
          activeOpacity={0.85}
        >
          <View style={styles.pinStatusLeft}>
            <Text style={styles.pinStatusEmoji}>{pinIsSet ? '🔐' : '⚠️'}</Text>
            <View>
              <Text style={styles.pinStatusTitle}>
                {pinIsSet ? 'PIN Protection Active' : 'No PIN Set'}
              </Text>
              <Text style={styles.pinStatusSub}>
                {pinIsSet
                  ? `${lockedCount} app${lockedCount !== 1 ? 's' : ''} marked · Tap to change PIN`
                  : 'Set a PIN to protect your saved preferences'}
              </Text>
            </View>
          </View>
          <Text style={styles.pinStatusArrow}>{pinIsSet ? '✏️' : '→'}</Text>
        </TouchableOpacity>

        {/* ── Focus Mode ── */}
        {focusActive ? (
          <View style={styles.focusActiveBanner}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientMid]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.focusGradient}
            >
              <View>
                <Text style={styles.focusActiveTitle}>🎯 Focus Mode Active</Text>
                <Text style={styles.focusActiveTime}>{formatFocusTime(focusSeconds)} remaining</Text>
              </View>
              <TouchableOpacity onPress={cancelFocus} style={styles.focusCancelBtn}>
                <Text style={styles.focusCancelText}>End</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startFocusBtn}
            onPress={() => setShowFocusModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.startFocusEmoji}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.startFocusTitle}>Start Focus Mode</Text>
              <Text style={styles.startFocusSub}>Run a timed focus session; apps are not blocked</Text>
            </View>
            <Text style={styles.startFocusArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── App List ── */}
        <Text style={styles.sectionTitle}>Apps I Want to Avoid</Text>
        <Text style={styles.sectionHint}>
          These preferences are saved on this device. Expo Go cannot block, monitor or time-limit other apps; a native device-control integration is required.
        </Text>

        {DEFAULT_APPS.map((app) => (
          <AppRow
            key={app.id}
            app={app}
            locked={!!lockedApps[app.id]}
            timeLimit={timeLimits[app.id]}
            focusBlocked={focusActive}
            onToggleLock={() => toggleLock(app.id)}
            onSetTimeLimit={() => setTimeLimitModal(app.id)}
            onRemoveTimeLimit={() => removeTimeLimit(app.id)}
          />
        ))}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* ── Focus Mode Setup Modal ── */}
      <Modal
        visible={showFocusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFocusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎯 Start Focus Mode</Text>
            <Text style={styles.modalSub}>Choose how long to run your focus timer</Text>

            <View style={styles.durationGrid}>
              {FOCUS_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.durationBtn, selectedDuration === d.value && styles.durationBtnActive]}
                  onPress={() => setSelectedDuration(d.value)}
                >
                  <Text style={[styles.durationBtnText, selectedDuration === d.value && styles.durationBtnTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.focusReward}>
              Complete session → +{COIN_REWARDS.focusSession} 🪙
            </Text>

            <TouchableOpacity style={styles.startBtn} onPress={startFocusMode} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.startBtnGradient}
              >
                <Text style={styles.startBtnText}>Start Focus Session →</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowFocusModal(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Time Limit Modal ── */}
      <Modal
        visible={!!timeLimitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeLimitModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⏱ Set Daily Time Limit</Text>
            <Text style={styles.modalSub}>
              {DEFAULT_APPS.find((a) => a.id === timeLimitModal)?.name}
            </Text>

            <View style={styles.minutesInput}>
              <TextInput
                style={styles.minutesField}
                value={customMinutes}
                onChangeText={setCustomMinutes}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.minutesLabel}>minutes per day</Text>
            </View>

            <View style={styles.quickMinutes}>
              {[15, 30, 45, 60].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.quickMin}
                  onPress={() => setCustomMinutes(String(m))}
                >
                  <Text style={styles.quickMinText}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setTimeLimit(timeLimitModal, customMinutes)}
              activeOpacity={0.85}
            >
              <View style={[styles.startBtnGradient, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.startBtnText}>Set Limit</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTimeLimitModal(null)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// App Row
// ─────────────────────────────────────────────────────────────────────────────
const AppRow = ({
  app, locked, timeLimit, focusBlocked,
  onToggleLock, onSetTimeLimit, onRemoveTimeLimit,
}) => (
  <View style={[rowStyles.row, (locked || focusBlocked) && rowStyles.rowLocked]}>
    <Text style={rowStyles.emoji}>{app.emoji}</Text>
    <View style={rowStyles.info}>
      <Text style={rowStyles.name}>{app.name}</Text>
      <View style={rowStyles.badges}>
        {locked && (
          <View style={rowStyles.badge}>
            <Text style={rowStyles.badgeText}>⏸ Avoid</Text>
          </View>
        )}
        {focusBlocked && (
          <View style={[rowStyles.badge, rowStyles.badgeFocus]}>
            <Text style={rowStyles.badgeText}>🎯 Focus</Text>
          </View>
        )}
        {timeLimit ? (
          <TouchableOpacity onPress={onRemoveTimeLimit}>
            <View style={[rowStyles.badge, rowStyles.badgeTime]}>
              <Text style={rowStyles.badgeText}>⏱ {timeLimit}m ✕</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
    <View style={rowStyles.actions}>
      <TouchableOpacity onPress={onSetTimeLimit} style={rowStyles.timeBtn}>
        <Text style={rowStyles.timeBtnText}>⏱</Text>
      </TouchableOpacity>
      <Switch
        value={locked}
        onValueChange={onToggleLock}
        trackColor={{ false: COLORS.border, true: COLORS.accentRed + '80' }}
        thumbColor={locked ? COLORS.accentRed : COLORS.textMuted}
      />
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const rowStyles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.xs, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  rowLocked:   { borderColor: COLORS.accentRed + '40' },
  emoji:       { fontSize: 28, marginRight: SPACING.sm },
  info:        { flex: 1 },
  name:        { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  badges:      { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  badge:       { backgroundColor: COLORS.accentRed + '20', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  badgeFocus:  { backgroundColor: COLORS.primary + '20' },
  badgeTime:   { backgroundColor: COLORS.accent + '20' },
  badgeText:   { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  actions:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  timeBtn:     { padding: SPACING.xs },
  timeBtnText: { fontSize: 18 },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { padding: SPACING.lg, paddingTop: SPACING.xl },
  headerTitle:  { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.extrabold, color: COLORS.textPrimary },
  headerSub:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },

  // PIN status
  pinStatusCard: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    marginHorizontal: SPACING.md,
    marginBottom:     SPACING.md,
    padding:          SPACING.md,
    borderRadius:     RADIUS.lg,
    borderWidth:      1,
  },
  pinStatusSet: {
    backgroundColor: COLORS.primary + '10',
    borderColor:     COLORS.primary + '50',
  },
  pinStatusUnset: {
    backgroundColor: COLORS.accentRed + '10',
    borderColor:     COLORS.accentRed + '50',
  },
  pinStatusLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  pinStatusEmoji: { fontSize: 28 },
  pinStatusTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  pinStatusSub:   { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  pinStatusArrow: { fontSize: FONTS.sizes.lg, color: COLORS.textMuted },

  // Focus
  focusActiveBanner: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  focusGradient:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  focusActiveTitle:  { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
  focusActiveTime:   { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.extrabold, color: '#fff' },
  focusCancelBtn:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md, padding: SPACING.sm },
  focusCancelText:   { color: '#fff', fontWeight: FONTS.weights.semibold },

  startFocusBtn:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '40', gap: SPACING.sm },
  startFocusEmoji: { fontSize: 28 },
  startFocusTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  startFocusSub:   { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  startFocusArrow: { fontSize: FONTS.sizes.xl, color: COLORS.textMuted },

  sectionTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, letterSpacing: 1, marginLeft: SPACING.md, marginBottom: SPACING.xs, textTransform: 'uppercase' },
  sectionHint:  { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, lineHeight: 18 },

  // Modals
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
  modalTitle:         { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  modalSub:           { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },
  durationGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  durationBtn:        { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  durationBtnActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durationBtnText:    { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  durationBtnTextActive: { color: '#fff', fontWeight: FONTS.weights.bold },
  focusReward:        { fontSize: FONTS.sizes.sm, color: COLORS.accent, marginBottom: SPACING.lg, textAlign: 'center' },
  startBtn:           { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.sm },
  startBtnGradient:   { padding: SPACING.md, alignItems: 'center', borderRadius: RADIUS.lg },
  startBtnText:       { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
  cancelLink:         { padding: SPACING.sm, alignItems: 'center' },
  cancelLinkText:     { color: COLORS.textMuted },
  minutesInput:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  minutesField:       { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, width: 80, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border },
  minutesLabel:       { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  quickMinutes:       { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickMin:           { backgroundColor: COLORS.card, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  quickMinText:       { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
});

export default AppLockScreen;
