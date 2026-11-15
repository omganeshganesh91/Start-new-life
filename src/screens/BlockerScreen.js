// ─────────────────────────────────────────────────────────────────────────────
// BlockerScreen.js — DNS setup guidance + gallery inventory + night reminder
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, Alert, Modal, ActivityIndicator, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import MirrorMoment from '../components/MirrorMoment';
import { COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS, NIGHT_LOCK } from '../utils/constants';
import { isNightLockActive } from '../utils/dateUtils';
import { verifyPassword }    from '../utils/encryption';

// ── PIN Verification Modal ─────────────────────────────────────────────────
const PinModal = ({ visible, onVerified, onCancel, title = 'Enter PIN to continue' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const buttons = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];

  const handleKey = async (k) => {
    if (k === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (k === '✓') {
      const ok = await verifyPassword(pin);
      if (ok) { setPin(''); onVerified(); }
      else    { setError('Wrong PIN. Try again.'); setPin(''); }
      return;
    }
    if (pin.length < 6) setPin((p) => p + k);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={pinStyles.overlay}>
        <View style={pinStyles.card}>
          <Text style={pinStyles.title}>{title}</Text>
          <View style={pinStyles.dots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[pinStyles.dot, i < pin.length && pinStyles.dotFilled]} />
            ))}
          </View>
          {error ? <Text style={pinStyles.error}>{error}</Text> : null}
          <View style={pinStyles.grid}>
            {buttons.map((b) => (
              <TouchableOpacity key={b} style={pinStyles.key} onPress={() => handleKey(b)}>
                <Text style={pinStyles.keyText}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onCancel} style={pinStyles.cancel}>
            <Text style={pinStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const pinStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  card:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, width: 300, alignItems: 'center' },
  title:      { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: FONTS.weights.semibold, textAlign: 'center', marginBottom: SPACING.lg },
  dots:       { flexDirection: 'row', gap: 12, marginBottom: SPACING.md },
  dot:        { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.textMuted },
  dotFilled:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  error:      { color: COLORS.accentRed, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', width: 210, gap: 8, justifyContent: 'center' },
  key:        { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  keyText:    { fontSize: FONTS.sizes.xl, color: COLORS.textPrimary, fontWeight: FONTS.weights.bold },
  cancel:     { marginTop: SPACING.md },
  cancelText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
});

// ── Main BlockerScreen ─────────────────────────────────────────────────────
const BlockerScreen = () => {
  const [blockerOn,      setBlockerOn]      = useState(false);
  const [sunriseOn,      setSunriseOn]      = useState(false);
  const [galleryScanning,setGalleryScanning]= useState(false);
  const [galleryScanResult, setGalleryScanResult] = useState(null);
  const [showPin,        setShowPin]        = useState(false);
  const [pinAction,      setPinAction]      = useState(null);
  const [showMirror,     setShowMirror]     = useState(false);

  const nightActive = isNightLockActive();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const [sunrise, dnsSetup] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.sunriseLockEnabled),
        AsyncStorage.getItem(STORAGE_KEYS.dnsSetupConfirmed),
      ]);
      if (sunrise !== null) setSunriseOn(sunrise === 'true');
      setBlockerOn(dnsSetup === 'true');
    } catch (error) {
      console.warn('Protection settings could not be loaded:', error);
      Alert.alert('Settings unavailable', 'Protection settings could not be loaded. Please try again.');
    }
  };

  const requestToggleBlocker = async (enabled) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.dnsSetupConfirmed, String(enabled));
      setBlockerOn(enabled);
    } catch (error) {
      console.warn('DNS setup status could not be saved:', error);
      Alert.alert('Could not save setting', 'Please try again.');
    }
  };

  const requestToggleSunrise = () => {
    if (sunriseOn) {
      setPinAction('sunrise');
      setShowPin(true);
    } else {
      enableSunrise();
    }
  };

  const onPinVerified = async () => {
    setShowPin(false);
    if (pinAction === 'sunrise') {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.sunriseLockEnabled, 'false');
        setSunriseOn(false);
      } catch (error) {
        console.warn('Night reminder setting could not be saved:', error);
        Alert.alert('Could not save setting', 'Please try again.');
      }
    }
  };

  const enableSunrise = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.sunriseLockEnabled, 'true');
      setSunriseOn(true);
    } catch (error) {
      console.warn('Night reminder setting could not be saved:', error);
      Alert.alert('Could not save setting', 'Please try again.');
    }
  };

  // Count accessible media only; this does not classify image or video content.
  const handleGalleryScan = async () => {
    setGalleryScanning(true);
    setGalleryScanResult(null);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to count items in your library.');
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: ['photo', 'video'],
      });
      setGalleryScanResult({ scanned: result.totalCount });
    } catch (error) {
      console.warn('Gallery item count failed:', error);
      Alert.alert('Could not check gallery', error.message || 'Please try again later.');
    } finally {
      setGalleryScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.gradientStart + 'AA', COLORS.background]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>🛡️ Protection Shield</Text>
          <Text style={styles.headerSub}>Setup guides and private self-checks</Text>
        </LinearGradient>

        {/* Night lock active banner */}
        {nightActive && sunriseOn && (
          <View style={styles.nightBanner}>
            <Text style={styles.nightBannerText}>
              🌙 Night reminder window ({NIGHT_LOCK.startHour}:00 – {NIGHT_LOCK.endHour}:00)
              {' '}— This app cannot lock other apps in Expo Go.
            </Text>
          </View>
        )}

        {/* ── DNS Blocker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device DNS Setup</Text>
          <View style={[styles.card, blockerOn && styles.cardActive]}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{blockerOn ? '🟢' : '🔴'}</Text>
                <View>
                  <Text style={styles.cardTitle}>{blockerOn ? 'DNS Setup Confirmed' : 'DNS Setup Needed'}</Text>
                  <Text style={styles.cardSub}>
                    {blockerOn
                      ? 'Marked by you; the app cannot verify or change DNS'
                      : 'Configure DNS in device settings, then mark it complete'}
                  </Text>
                </View>
              </View>
              <Switch
                value={blockerOn}
                onValueChange={requestToggleBlocker}
                trackColor={{ false: COLORS.border, true: COLORS.accentGreen + '80' }}
                thumbColor={blockerOn ? COLORS.accentGreen : COLORS.textMuted}
              />
            </View>
            {blockerOn && (
              <View style={styles.dnsInfo}>
                <Text style={styles.dnsInfoText}>
                  {Platform.OS === 'android'
                    ? 'Private DNS hostname: family-filter-dns.cleanbrowsing.org'
                    : 'Wi-Fi DNS addresses: 185.228.168.9 and 185.228.169.9'}
                </Text>
              </View>
            )}
            <Text style={styles.cardSub}>
              {Platform.OS === 'android'
                ? 'Android: Settings → Network & Internet → Private DNS. This app cannot apply or verify the setting.'
                : 'Set DNS in your network settings. iOS DNS settings usually apply per Wi-Fi network; this app cannot apply or verify them.'}
            </Text>
          </View>
        </View>

        {/* ── Gallery Scanner ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Private Gallery Check</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Scan Photos & Videos</Text>
            <Text style={styles.cardSub}>
              Counts accessible photos and videos only. It does not inspect or classify their contents, and nothing is uploaded.
            </Text>

            {galleryScanResult && (
              <View style={styles.scanResult}>
                <Text style={styles.scanResultText}>
                  Found {galleryScanResult.scanned} photos and videos. Review content in your gallery app.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.scanBtn, galleryScanning && styles.scanBtnDisabled]}
              onPress={handleGalleryScan}
              disabled={galleryScanning}
              activeOpacity={0.8}
            >
              {galleryScanning ? (
                <View style={styles.scanningRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.scanBtnText}>Scanning gallery...</Text>
                </View>
              ) : (
                <Text style={styles.scanBtnText}>Count Gallery Items</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sunrise Unlocker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌅 Sunrise Unlocker</Text>
          <View style={[styles.card, sunriseOn && styles.cardPurple]}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>🌙</Text>
                <View>
                  <Text style={styles.cardTitle}>Night Reminder</Text>
                  <Text style={styles.cardSub}>
                    Reminder window: 10PM–6AM.{'\n'}
                    This app cannot lock other apps in Expo Go.
                  </Text>
                </View>
              </View>
              <Switch
                value={sunriseOn}
                onValueChange={requestToggleSunrise}
                trackColor={{ false: COLORS.border, true: COLORS.accentPurple + '80' }}
                thumbColor={sunriseOn ? COLORS.accentPurple : COLORS.textMuted}
              />
            </View>
          </View>
        </View>

        {/* ── Mirror Moment ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🪞 Mirror Moment</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>On-demand urge interrupt</Text>
            <Text style={styles.cardSub}>
              Opens only when you tap preview; it is not triggered by other apps.
            </Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => setShowMirror(true)}
            >
              <Text style={styles.previewBtnText}>Preview Mirror Moment →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* PIN Modal */}
      <PinModal
        visible={showPin}
        title="🔓 Enter PIN to disable Night Reminder"
        onVerified={onPinVerified}
        onCancel={() => setShowPin(false)}
      />

      {/* Mirror Moment Modal */}
      <Modal visible={showMirror} animationType="fade" onRequestClose={() => setShowMirror(false)}>
        <MirrorMoment
          onComplete={() => setShowMirror(false)}
          onSkip={() => setShowMirror(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { padding: SPACING.lg, paddingTop: SPACING.xl },
  headerTitle:  { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.extrabold, color: COLORS.textPrimary },
  headerSub:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  nightBanner: {
    marginHorizontal: SPACING.md,
    marginBottom:     SPACING.sm,
    backgroundColor:  COLORS.accentPurple + '20',
    borderRadius:     RADIUS.md,
    padding:          SPACING.sm,
    borderLeftWidth:  3,
    borderLeftColor:  COLORS.accentPurple,
  },
  nightBannerText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  section:          { marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle:     { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.sm, textTransform: 'uppercase' },
  card:             { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardActive:       { borderColor: COLORS.accentGreen + '60' },
  cardPurple:       { borderColor: COLORS.accentPurple + '60' },
  cardRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  cardIcon:         { fontSize: 28 },
  cardTitle:        { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  cardSub:          { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, lineHeight: 18 },
  dnsInfo:          { marginTop: SPACING.sm, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: SPACING.xs },
  dnsInfoText:      { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  scanResult:       { marginTop: SPACING.sm, backgroundColor: COLORS.accentGreen + '15', borderRadius: RADIUS.sm, padding: SPACING.sm },
  scanResultText:   { fontSize: FONTS.sizes.sm, color: COLORS.accentGreen },
  scanBtn:          { marginTop: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  scanBtnDisabled:  { backgroundColor: COLORS.surfaceAlt },
  scanningRow:      { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  scanBtnText:      { color: '#fff', fontWeight: FONTS.weights.semibold, fontSize: FONTS.sizes.sm },
  previewBtn:       { marginTop: SPACING.md, padding: SPACING.xs, alignItems: 'center' },
  previewBtnText:   { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm },
});

export default BlockerScreen;
