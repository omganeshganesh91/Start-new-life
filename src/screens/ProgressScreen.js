// ─────────────────────────────────────────────────────────────────────────────
// ProgressScreen.js — Streak heatmap + relapse log + Trigger Pattern AI
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS } from '../utils/constants';
import { getLast30Days, calculateStreak, calculateLongestStreak } from '../utils/dateUtils';
import { analyzeTriggerPatterns } from '../services/GeminiService';
import moment from 'moment';

// ── Mini Heatmap Calendar ─────────────────────────────────────────────────────
const HeatmapCalendar = ({ cleanDays = [] }) => {
  const last30 = getLast30Days();
  const cleanSet = new Set(cleanDays);

  const weeks = [];
  for (let i = 0; i < last30.length; i += 7) {
    weeks.push(last30.slice(i, i + 7));
  }

  const getColor = (day) => {
    const isToday   = day === moment().format('YYYY-MM-DD');
    const isClean   = cleanSet.has(day);
    const isFuture  = moment(day).isAfter(moment(), 'day');
    if (isFuture) return COLORS.border;
    if (isClean)  return COLORS.accentGreen;
    if (isToday)  return COLORS.primary;
    return COLORS.accentRed + '60';
  };

  return (
    <View style={heatStyles.container}>
      <Text style={heatStyles.title}>Last 30 Days</Text>
      <View style={heatStyles.grid}>
        {last30.map((day) => (
          <View
            key={day}
            style={[heatStyles.cell, { backgroundColor: getColor(day) }]}
          >
            <Text style={heatStyles.cellText}>{moment(day).format('D')}</Text>
          </View>
        ))}
      </View>
      <View style={heatStyles.legend}>
        <View style={heatStyles.legendItem}>
          <View style={[heatStyles.legendDot, { backgroundColor: COLORS.accentGreen }]} />
          <Text style={heatStyles.legendText}>Clean</Text>
        </View>
        <View style={heatStyles.legendItem}>
          <View style={[heatStyles.legendDot, { backgroundColor: COLORS.accentRed + '60' }]} />
          <Text style={heatStyles.legendText}>Missed</Text>
        </View>
        <View style={heatStyles.legendItem}>
          <View style={[heatStyles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={heatStyles.legendText}>Today</Text>
        </View>
      </View>
    </View>
  );
};

const heatStyles = StyleSheet.create({
  container: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  title:     { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary, marginBottom: SPACING.sm, letterSpacing: 1 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  cell:      { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cellText:  { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  legend:    { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  legendItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText:{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});

// ── Urge Logger ───────────────────────────────────────────────────────────────
const UrgeLogger = ({ onLogged }) => {
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  const logUrge = async () => {
    setLogging(true);
    const entry = {
      timestamp:  new Date().toISOString(),
      dayOfWeek:  moment().format('dddd'),
      hour:       moment().hour(),
      notes:      notes.trim(),
    };

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.triggerLogs);
      const logs = raw ? JSON.parse(raw) : [];
      logs.push(entry);
      await AsyncStorage.setItem(STORAGE_KEYS.triggerLogs, JSON.stringify(logs));
      setNotes('');
      onLogged?.();
      Alert.alert('Logged 📝', 'Urge recorded. No judgment — this data helps you understand your patterns.');
    } catch (e) {
      console.warn(e);
    } finally {
      setLogging(false);
    }
  };

  return (
    <View style={logStyles.container}>
      <Text style={logStyles.title}>🧠 Log an Urge</Text>
      <Text style={logStyles.sub}>Optional notes (time, place, mood)</Text>
      <TextInput
        style={logStyles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Late night, stressed, alone at home..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        maxLength={200}
      />
      <TouchableOpacity style={logStyles.btn} onPress={logUrge} disabled={logging} activeOpacity={0.85}>
        <Text style={logStyles.btnText}>{logging ? 'Logging...' : 'Log Urge (No Judgment)'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const logStyles = StyleSheet.create({
  container: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  title:     { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: 4 },
  sub:       { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  input:     { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.sm, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, minHeight: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
  btn:       { marginTop: SPACING.sm, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  btnText:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
});

// ── Main ProgressScreen ───────────────────────────────────────────────────────
const ProgressScreen = () => {
  const streak         = useSelector((s) => s.streak);
  const [triggerLogs,  setTriggerLogs]  = useState([]);
  const [aiAnalysis,   setAiAnalysis]   = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [activeTab,    setActiveTab]    = useState('stats');

  useEffect(() => { loadTriggerLogs(); }, []);

  const loadTriggerLogs = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.triggerLogs);
    if (raw) setTriggerLogs(JSON.parse(raw));
  };

  const runTriggerAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeTriggerPatterns(triggerLogs);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const TABS = ['stats', 'heatmap', 'triggers'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Your Progress</Text>
        <Text style={styles.headerSub}>Every day counts. Keep going.</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'stats' ? '📈 Stats' : t === 'heatmap' ? '🗓 Calendar' : '🧠 Triggers'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {activeTab === 'stats' && (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatBox label="Current Streak" value={streak.currentStreak} unit="days" color={COLORS.accentGreen} emoji="🔥" />
              <StatBox label="Longest Streak" value={streak.longestStreak} unit="days" color={COLORS.primary}      emoji="🏆" />
              <StatBox label="Total Urges Logged" value={triggerLogs.length} unit="logged" color={COLORS.accent}  emoji="📝" />
              <StatBox label="Clean Days (30d)" value={streak.cleanDays?.filter(d => moment(d).isAfter(moment().subtract(30, 'days'))).length || 0} unit="days" color={COLORS.accentPurple} emoji="🗓" />
            </View>

            {/* Log urge */}
            <UrgeLogger onLogged={loadTriggerLogs} />
          </>
        )}

        {activeTab === 'heatmap' && (
          <HeatmapCalendar cleanDays={streak.cleanDays || []} />
        )}

        {activeTab === 'triggers' && (
          <>
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>🧠 Trigger Pattern AI</Text>
              <Text style={styles.aiSub}>
                {triggerLogs.length < 3
                  ? `Log at least 3 urge events to unlock AI analysis. (${triggerLogs.length}/3 logged)`
                  : `${triggerLogs.length} urge events logged. AI can analyze your patterns.`}
              </Text>

              {triggerLogs.length >= 3 && (
                <TouchableOpacity
                  style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
                  onPress={runTriggerAnalysis}
                  disabled={analyzing}
                  activeOpacity={0.85}
                >
                  {analyzing ? (
                    <View style={styles.analyzingRow}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.analyzeBtnText}>Analyzing your patterns...</Text>
                    </View>
                  ) : (
                    <Text style={styles.analyzeBtnText}>✨ Analyze My Triggers (Gemini AI)</Text>
                  )}
                </TouchableOpacity>
              )}

              {aiAnalysis && (
                <View style={styles.analysisResult}>
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>📊 Your Patterns</Text>
                    <Text style={styles.analysisText}>{aiAnalysis.patterns}</Text>
                  </View>
                  {aiAnalysis.reasons ? (
                    <View style={styles.analysisSection}>
                      <Text style={styles.analysisSectionTitle}>💡 Why This Happens</Text>
                      <Text style={styles.analysisText}>{aiAnalysis.reasons}</Text>
                    </View>
                  ) : null}
                  {aiAnalysis.strategies ? (
                    <View style={styles.analysisSection}>
                      <Text style={styles.analysisSectionTitle}>🛡️ Your Strategies</Text>
                      <Text style={styles.analysisText}>{aiAnalysis.strategies}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {/* Recent urge log */}
            {triggerLogs.length > 0 && (
              <View style={styles.logList}>
                <Text style={styles.logListTitle}>Recent Urge Log</Text>
                {triggerLogs.slice(-5).reverse().map((log, i) => (
                  <View key={i} style={styles.logItem}>
                    <Text style={styles.logTime}>{moment(log.timestamp).format('ddd MMM D, h:mm A')}</Text>
                    {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
};

// ── Stat Box ──────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, unit, color, emoji }) => (
  <View style={[statStyles.box, { borderColor: color + '40' }]}>
    <Text style={statStyles.emoji}>{emoji}</Text>
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.unit}>{unit}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  box:   { flex: 1, minWidth: '45%', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, margin: 4 },
  emoji: { fontSize: 24, marginBottom: 4 },
  value: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.extrabold },
  unit:  { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { padding: SPACING.lg, paddingTop: SPACING.xl },
  headerTitle:     { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.extrabold, color: COLORS.textPrimary },
  headerSub:       { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  tabs:            { flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4 },
  tab:             { flex: 1, padding: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:       { backgroundColor: COLORS.card, elevation: 3 },
  tabText:         { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  tabTextActive:   { color: COLORS.textPrimary, fontWeight: FONTS.weights.bold },
  scroll:          { paddingBottom: SPACING.xl },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: SPACING.sm, marginBottom: SPACING.md },
  aiCard:          { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '40' },
  aiTitle:         { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: 4 },
  aiSub:           { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, lineHeight: 20, marginBottom: SPACING.md },
  analyzeBtn:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  analyzeBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
  analyzingRow:    { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  analyzeBtnText:  { color: '#fff', fontWeight: FONTS.weights.semibold, fontSize: FONTS.sizes.sm },
  analysisResult:  { marginTop: SPACING.md, gap: SPACING.sm },
  analysisSection: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: SPACING.sm },
  analysisSectionTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.primaryLight, marginBottom: 4 },
  analysisText:    { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  logList:         { marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  logListTitle:    { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, marginBottom: SPACING.sm, letterSpacing: 1 },
  logItem:         { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.xs, borderLeftWidth: 3, borderLeftColor: COLORS.border },
  logTime:         { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: FONTS.weights.medium },
  logNotes:        { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
});

export default ProgressScreen;
