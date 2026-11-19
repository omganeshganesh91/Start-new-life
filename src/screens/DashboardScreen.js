// ─────────────────────────────────────────────────────────────────────────────
// DashboardScreen.js — Home Screen: streak, protection status, motivation card
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import StreakCard               from '../components/StreakCard';
import SoulCoins, { CoinBalanceWidget } from '../components/SoulCoins';
import MotivationCard          from '../components/MotivationCard';

import { fetchMotivation }     from '../store/motivationSlice';
import { loadStreak, checkInToday } from '../store/streakSlice';
import { loadCoins } from '../store/coinsSlice';
import { COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS } from '../utils/constants';
import { getTimeGreeting, isNightLockActive } from '../utils/dateUtils';
import { cancelMoonNote, scheduleMoonNote } from '../services/NotificationService';

const DashboardScreen = ({ navigation }) => {
  const dispatch   = useDispatch();
  const streak     = useSelector((s) => s.streak);
  const coins      = useSelector((s) => s.coins.balance);
  const motivation = useSelector((s) => s.motivation);
  const [refreshing, setRefreshing] = useState(false);
  const [moonNoteEnabled, setMoonNoteEnabled] = useState(false);
  const [moonNoteBusy, setMoonNoteBusy] = useState(false);
  const [moonNoteMessage, setMoonNoteMessage] = useState('');

  useEffect(() => {
    dispatch(loadStreak());
    dispatch(loadCoins());
    dispatch(fetchMotivation());
  }, [dispatch]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.moonNoteEnabled)
      .then((value) => setMoonNoteEnabled(value === 'true'))
      .catch((error) => console.warn('Moon Note preference could not be loaded:', error));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchMotivation());
    setRefreshing(false);
  }, []);

  const handleCheckIn = () => {
    dispatch(checkInToday());
  };

  const toggleMoonNote = async () => {
    if (moonNoteBusy) return;

    setMoonNoteBusy(true);
    setMoonNoteMessage('');
    try {
      if (moonNoteEnabled) {
        await cancelMoonNote();
        await AsyncStorage.removeItem(STORAGE_KEYS.moonNoteEnabled);
        setMoonNoteEnabled(false);
        setMoonNoteMessage('Moon Note is paused.');
      } else {
        const scheduled = await scheduleMoonNote();
        if (!scheduled) {
          setMoonNoteMessage('Allow notifications on your phone to turn on Moon Note.');
          return;
        }

        try {
          await AsyncStorage.setItem(STORAGE_KEYS.moonNoteEnabled, 'true');
        } catch (error) {
          await cancelMoonNote();
          throw error;
        }
        setMoonNoteEnabled(true);
        setMoonNoteMessage('A quiet reflection will arrive at 9:30 PM.');
      }
    } catch (error) {
      console.warn('Moon Note could not be updated:', error);
      setMoonNoteMessage('Could not update Moon Note. Please try again.');
    } finally {
      setMoonNoteBusy(false);
    }
  };

  const nightLock = isNightLockActive();
  const greeting  = getTimeGreeting();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.appName}>Start A New Life</Text>
        </View>
        <CoinBalanceWidget balance={coins} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Night Lock Warning ── */}
        {nightLock && (
          <View style={styles.nightBanner}>
            <Text style={styles.nightBannerText}>
              🌙  Night reminder window — Stay strong. Sleep is recovery.
            </Text>
          </View>
        )}

        {Platform.OS !== 'web' && (
          <View style={styles.moonNoteCard}>
            <View style={styles.moonNoteCopy}>
              <Text style={styles.moonNoteTitle}>🌙  Moon Note</Text>
              <Text style={styles.moonNoteDescription}>
                A gentle, silent moment to celebrate one small win before quiet hours.
              </Text>
              <Text style={styles.moonNoteTime}>Daily at 9:30 PM · before Night Shield</Text>
            </View>
            <TouchableOpacity
              onPress={toggleMoonNote}
              disabled={moonNoteBusy}
              style={[styles.moonNoteButton, moonNoteEnabled && styles.moonNoteButtonOn]}
              activeOpacity={0.8}
              accessibilityRole="switch"
              accessibilityLabel="Moon Note evening reflection"
              accessibilityState={{ checked: moonNoteEnabled, disabled: moonNoteBusy }}
            >
              <Text style={styles.moonNoteButtonText}>
                {moonNoteBusy ? '…' : moonNoteEnabled ? 'On' : 'Set'}
              </Text>
            </TouchableOpacity>
            {!!moonNoteMessage && (
              <Text style={styles.moonNoteMessage} accessibilityLiveRegion="polite">
                {moonNoteMessage}
              </Text>
            )}
          </View>
        )}

        {/* ── Protection Status Card ── */}
        <ProtectionStatusCard navigation={navigation} />

        {/* ── Streak Card ── */}
        <StreakCard
          streak={streak.currentStreak}
          startDate={streak.startDate}
          longestStreak={streak.longestStreak}
        />

        {/* ── Check-In Button ── */}
        {!streak.checkedInToday && (
          <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.accentGreen, '#00A870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.checkInGradient}
            >
              <Text style={styles.checkInText}>✅  Check In — I'm Clean Today  (+10 🪙)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Daily Motivation Card ── */}
        <MotivationCard
          quote={motivation.quote}
          explanation={motivation.explanation}
          action={motivation.action}
          imageTag={motivation.imageTag}
          loading={motivation.loading}
          onRefresh={() => dispatch(fetchMotivation())}
        />

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton emoji="🎯" label="Focus Mode"    onPress={() => navigation.navigate('AppLock')}   color={COLORS.primary}     />
          <QuickActionButton emoji="🛡️" label="Blocker"      onPress={() => navigation.navigate('Blocker')}   color={COLORS.accentRed}   />
          <QuickActionButton emoji="🧘" label="Ground Me"    onPress={() => navigation.navigate('Motivation')} color={COLORS.accentPurple}/>
          <QuickActionButton emoji="🧱" label="Community"    onPress={() => navigation.navigate('Community')} color={COLORS.accent}      />
        </View>

        {/* ── Soul Coins Card ── */}
        <SoulCoins balance={coins} todayEarned={streak.checkedInToday ? 10 : 0} />

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
};

// ── Protection Status Card ────────────────────────────────────────────────────
const ProtectionStatusCard = ({ navigation }) => {
  const [dnsSetupConfirmed, setDnsSetupConfirmed] = useState(false);

  useEffect(() => {
    const loadDnsStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.dnsSetupConfirmed);
        setDnsSetupConfirmed(value === 'true');
      } catch (error) {
        console.warn('Dashboard DNS setup status could not be loaded:', error);
      }
    };

    loadDnsStatus();
    const unsubscribe = navigation.addListener('focus', loadDnsStatus);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={[styles.statusCard, dnsSetupConfirmed ? styles.statusOn : styles.statusOff]}>
      <View style={styles.statusLeft}>
        <View style={[styles.statusDot, { backgroundColor: dnsSetupConfirmed ? COLORS.accentGreen : COLORS.accentRed }]} />
        <View>
          <Text style={styles.statusTitle}>
            {dnsSetupConfirmed ? '🛡️ DNS Setup Confirmed' : '⚠️ DNS Setup Needed'}
          </Text>
          <Text style={styles.statusSub}>
            {dnsSetupConfirmed ? 'Marked by you; the app cannot verify DNS' : 'This app cannot change device DNS'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Blocker')} style={styles.statusBtn}>
        <Text style={styles.statusBtnText}>Manage</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Quick Action Button ───────────────────────────────────────────────────────
const QuickActionButton = ({ emoji, label, onPress, color }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.qaBtn}>
    <View style={[styles.qaIcon, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Text style={styles.qaEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingHorizontal: SPACING.md,
    paddingTop:      SPACING.lg,
    paddingBottom:   SPACING.sm,
  },
  greeting: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  appName: {
    fontSize:   FONTS.sizes.xl,
    fontWeight: FONTS.weights.extrabold,
    color:      COLORS.textPrimary,
    marginTop:  2,
  },
  scroll: {
    paddingBottom: SPACING.xl,
  },
  nightBanner: {
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    backgroundColor:  '#1A0E33',
    borderRadius:     RADIUS.md,
    padding:          SPACING.sm,
    borderLeftWidth:  3,
    borderLeftColor:  COLORS.accentPurple,
  },
  nightBannerText: {
    color:    COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  moonNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#17152B',
    borderWidth: 1,
    borderColor: COLORS.accentPurple + '66',
  },
  moonNoteCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.sm,
  },
  moonNoteTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  moonNoteDescription: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  moonNoteTime: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  moonNoteButton: {
    minWidth: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moonNoteButtonOn: {
    backgroundColor: COLORS.accentPurple + '44',
    borderColor: COLORS.accentPurple,
  },
  moonNoteButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  moonNoteMessage: {
    flexBasis: '100%',
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.sm,
  },
  statusCard: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    padding:          SPACING.md,
    borderRadius:     RADIUS.lg,
    borderWidth:      1,
  },
  statusOn: {
    backgroundColor: COLORS.accentGreen + '10',
    borderColor:     COLORS.accentGreen + '40',
  },
  statusOff: {
    backgroundColor: COLORS.accentRed + '10',
    borderColor:     COLORS.accentRed + '40',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    flex:          1,
  },
  statusDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  statusTitle: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color:      COLORS.textPrimary,
  },
  statusSub: {
    fontSize: FONTS.sizes.xs,
    color:    COLORS.textMuted,
    marginTop: 2,
  },
  statusBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius:    RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   SPACING.xs,
  },
  statusBtnText: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  checkInBtn: {
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    borderRadius:     RADIUS.lg,
    overflow:         'hidden',
    elevation:        6,
  },
  checkInGradient: {
    padding:    SPACING.md,
    alignItems: 'center',
  },
  checkInText: {
    fontSize:   FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color:      '#fff',
  },
  sectionTitle: {
    fontSize:       FONTS.sizes.md,
    fontWeight:     FONTS.weights.bold,
    color:          COLORS.textPrimary,
    marginLeft:     SPACING.md,
    marginTop:      SPACING.md,
    marginBottom:   SPACING.sm,
  },
  quickActions: {
    flexDirection:    'row',
    marginHorizontal: SPACING.md,
    gap:              SPACING.sm,
  },
  qaBtn: {
    flex:       1,
    alignItems: 'center',
    gap:        SPACING.xs,
  },
  qaIcon: {
    width:        56,
    height:       56,
    borderRadius: RADIUS.lg,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  1,
  },
  qaEmoji: {
    fontSize: 24,
  },
  qaLabel: {
    fontSize:  FONTS.sizes.xs,
    color:     COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default DashboardScreen;
