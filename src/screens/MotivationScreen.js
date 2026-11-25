// ─────────────────────────────────────────────────────────────────────────────
// MotivationScreen.js — Full motivation feed + grounding + future letter tabs
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, Linking, Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import GroundingExercise from '../components/GroundingExercise';
import FutureLetter      from '../components/FutureLetter';
import { fetchMotivationQuotes } from '../services/GeminiService';
import { addCoins }        from '../store/coinsSlice';
import { COLORS, FONTS, SPACING, RADIUS, COIN_REWARDS } from '../utils/constants';

const TABS = [
  { key: 'motivation', label: '✨ Inspire',   emoji: '✨' },
  { key: 'grounding',  label: '🧘 Ground Me', emoji: '🧘' },
  { key: 'letter',     label: '💌 My Letter', emoji: '💌' },
];

const MotivationScreen = () => {
  const dispatch    = useDispatch();
  const [activeTab, setActiveTab]       = useState('motivation');
  const [groundingModal, setGroundingModal] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [quoteTotal, setQuoteTotal] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const quoteOffset = React.useRef(0);
  const quoteHasMore = React.useRef(true);
  const quoteRequestInFlight = React.useRef(false);
  const PAGE_SIZE = 30;

  useEffect(() => {
    loadQuotes(true);
  }, []);

  const loadQuotes = async (reset = false) => {
    if (quoteRequestInFlight.current || (!reset && !quoteHasMore.current)) return;
    quoteRequestInFlight.current = true;
    setQuoteLoading(true);
    setQuoteError('');
    const offset = reset ? 0 : quoteOffset.current;
    try {
      const page = await fetchMotivationQuotes({ offset, limit: PAGE_SIZE });
      setQuotes((current) => reset ? page.quotes : [...current, ...page.quotes]);
      quoteOffset.current = offset + page.quotes.length;
      quoteHasMore.current = page.hasMore;
      setQuoteTotal(page.total);
    } catch (error) {
      setQuoteError(error.message || 'Could not load quotes.');
    } finally {
      quoteRequestInFlight.current = false;
      setQuoteLoading(false);
    }
  };

  const handleGroundingComplete = () => {
    setGroundingModal(false);
    dispatch(addCoins({ amount: COIN_REWARDS.groundingExercise, reason: 'Grounding exercise' }));
  };

  const handleMotivationRead = () => {
    dispatch(addCoins({ amount: COIN_REWARDS.readMotivation, reason: 'Read motivation' }));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Inspiration</Text>
        <Text style={styles.headerSub}>Your mind is your greatest asset</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'motivation' && (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          onEndReached={() => loadQuotes()}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={(
            <>
          {/* SOS Urge Button */}
          <TouchableOpacity
            style={styles.urgeSOS}
            onPress={() => setGroundingModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.urgeSosEmoji}>🆘</Text>
            <View style={styles.urgeSOSText}>
              <Text style={styles.urgeSOSTitle}>I'm Having an Urge Right Now</Text>
              <Text style={styles.urgeSOSSub}>Start 90-second grounding exercise →</Text>
            </View>
          </TouchableOpacity>

            <Text style={styles.quoteCount}>Showing {quotes.length} of {quoteTotal || '...'} quotes</Text>
            {quoteError ? (
              <TouchableOpacity onPress={() => loadQuotes(quotes.length === 0)} style={styles.quoteError}>
                <Text style={styles.quoteErrorText}>{quoteError}  Tap to retry</Text>
              </TouchableOpacity>
            ) : null}
            </>
          )}
          renderItem={({ item, index }) => (
            <TouchableOpacity activeOpacity={0.9} onPress={handleMotivationRead} style={styles.quoteRow}>
              <Text style={styles.quoteNumber}>#{index + 1}  ·  {item.category}</Text>
              <Text style={styles.quoteText}>“{item.quote}”</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!quoteLoading && !quoteError ? <Text style={styles.emptyQuotes}>No quotes are available yet.</Text> : null}
          ListFooterComponent={(
            <>
              {quoteLoading ? <ActivityIndicator style={styles.quoteSpinner} color={COLORS.primaryLight} /> : null}
              {!quoteHasMore.current && quotes.length > 0 ? <Text style={styles.endOfQuotes}>You’ve reached the end of the quote library.</Text> : null}

          {/* Urge Playlist */}
          <View style={styles.urgePlaylist}>
            <Text style={styles.cardTitle}>🎵 Urge Playlist</Text>
            <Text style={styles.cardSub}>
              Music interrupts the urge cycle. Open your strongest playlist now.
            </Text>
            <TouchableOpacity
              style={styles.playlistBtn}
              onPress={async () => {
                try {
                  await Linking.openURL('https://open.spotify.com/search/calm%20recovery%20music');
                } catch (error) {
                  console.warn('Could not open playlist search:', error);
                  Alert.alert('Could not open music', 'Try opening your music app and choosing a calming playlist.');
                }
              }}
            >
              <Text style={styles.playlistBtnText}>▶ Find Calming Music</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: SPACING.xxl }} />
            </>
          )}
        />
      )}

      {activeTab === 'grounding' && (
        <GroundingExercise
          onComplete={handleGroundingComplete}
          onExit={() => setActiveTab('motivation')}
        />
      )}

      {activeTab === 'letter' && (
        <FutureLetter />
      )}

      {/* Grounding Modal (SOS) */}
      <Modal
        visible={groundingModal}
        animationType="slide"
        onRequestClose={() => setGroundingModal(false)}
      >
        <GroundingExercise
          onComplete={handleGroundingComplete}
          onExit={() => setGroundingModal(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.lg,
    paddingBottom:     SPACING.sm,
  },
  headerTitle: {
    fontSize:   FONTS.sizes.xxl,
    fontWeight: FONTS.weights.extrabold,
    color:      COLORS.textPrimary,
  },
  headerSub: {
    fontSize:  FONTS.sizes.sm,
    color:     COLORS.textMuted,
    marginTop: 2,
  },
  tabs: {
    flexDirection:    'row',
    marginHorizontal: SPACING.md,
    marginBottom:     SPACING.sm,
    backgroundColor:  COLORS.surface,
    borderRadius:     RADIUS.lg,
    padding:          4,
  },
  tab: {
    flex:           1,
    padding:        SPACING.sm,
    alignItems:     'center',
    borderRadius:   RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.card,
    elevation:       3,
  },
  tabText: {
    fontSize:   FONTS.sizes.sm,
    color:      COLORS.textMuted,
    fontWeight: FONTS.weights.medium,
  },
  tabTextActive: {
    color:      COLORS.textPrimary,
    fontWeight: FONTS.weights.bold,
  },
  scroll: {
    paddingBottom: SPACING.xl,
  },
  quoteCount: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginHorizontal: SPACING.md, marginTop: SPACING.sm },
  quoteRow: { marginHorizontal: SPACING.md, marginTop: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  quoteNumber: { color: COLORS.primaryLight, fontSize: FONTS.sizes.xs, marginBottom: SPACING.xs, textTransform: 'capitalize' },
  quoteText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, lineHeight: 24, fontWeight: FONTS.weights.medium },
  quoteError: { margin: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.accentRed + '20' },
  quoteErrorText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm },
  quoteSpinner: { margin: SPACING.lg },
  emptyQuotes: { color: COLORS.textMuted, textAlign: 'center', margin: SPACING.lg },
  endOfQuotes: { color: COLORS.textMuted, textAlign: 'center', margin: SPACING.md, fontSize: FONTS.sizes.xs },
  urgeSOS: {
    flexDirection:    'row',
    alignItems:       'center',
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    backgroundColor:  COLORS.accentRed + '15',
    borderRadius:     RADIUS.lg,
    padding:          SPACING.md,
    borderWidth:      2,
    borderColor:      COLORS.accentRed + '60',
    gap:              SPACING.sm,
  },
  urgeSosEmoji: {
    fontSize: 32,
  },
  urgeSOSText:  { flex: 1 },
  urgeSOSTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.accentRed },
  urgeSOSSub:   { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 2 },
  urgePlaylist: {
    marginHorizontal: SPACING.md,
    marginVertical:   SPACING.sm,
    backgroundColor:  COLORS.card,
    borderRadius:     RADIUS.lg,
    padding:          SPACING.md,
    borderWidth:      1,
    borderColor:      COLORS.border,
  },
  cardTitle:     { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  cardSub:       { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 },
  playlistBtn: {
    marginTop:       SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    alignItems:      'center',
  },
  playlistBtnText: { color: '#fff', fontWeight: FONTS.weights.semibold, fontSize: FONTS.sizes.sm },
});

export default MotivationScreen;
