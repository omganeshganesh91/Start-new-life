// ─────────────────────────────────────────────────────────────────────────────
// CommunityWallScreen.js — Anonymous pledge wall + accountability
// Uses ApiService (Node.js + SQLite REST backend) — no Firebase
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';

import {
  subscribeToPledges,
  postPledge,
  toggleHeart,
  deletePledge,
  getAnonymousId,
} from '../services/ApiService';

import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import moment from 'moment';

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const CommunityWallScreen = () => {
  const streak = useSelector((s) => s.streak.currentStreak);

  const [pledges,     setPledges]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [myUid,       setMyUid]       = useState(null);
  const [myHearts,    setMyHearts]    = useState({}); // { [pledgeId]: boolean }

  const unsubscribeRef = useRef(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getAnonymousId().then(setMyUid);
    startPolling();
    return () => unsubscribeRef.current?.();
  }, []);

  const startPolling = () => {
    unsubscribeRef.current?.(); // stop any existing poll
    unsubscribeRef.current = subscribeToPledges((data) => {
      setPledges(data);
      setLoading(false);
      setRefreshing(false);
    }, 15000);
  };

  const onRefresh = () => {
    setRefreshing(true);
    startPolling();
  };

  // ── Heart toggle ───────────────────────────────────────────────────────────
  const handleHeart = async (pledgeId) => {
    // Optimistic UI update
    const wasHearted = myHearts[pledgeId] ?? pledges.find(p => p.id === pledgeId)?.hearted;
    setMyHearts((prev) => ({ ...prev, [pledgeId]: !wasHearted }));
    setPledges((prev) =>
      prev.map((p) =>
        p.id === pledgeId
          ? { ...p, hearts: wasHearted ? p.hearts - 1 : p.hearts + 1, hearted: !wasHearted }
          : p
      )
    );
    // Confirm with server
    const serverHearted = await toggleHeart(pledgeId);
    setMyHearts((prev) => ({ ...prev, [pledgeId]: serverHearted }));
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (pledgeId) => {
    Alert.alert('Delete Pledge?', 'Remove your pledge from the wall?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deletePledge(pledgeId);
          if (ok) setPledges((prev) => prev.filter((p) => p.id !== pledgeId));
        },
      },
    ]);
  };

  // ── Pledge posted callback ─────────────────────────────────────────────────
  const onPledgePosted = (newPledge) => {
    setPledges((prev) => [newPledge, ...prev]);
  };

  // ── Render pledge card ─────────────────────────────────────────────────────
  const renderPledge = ({ item }) => {
    const isOwn     = item.uid === myUid;
    const hasHearted = myHearts[item.id] ?? item.hearted ?? false;
    const streakDay  = item.streak || 0;

    return (
      <View style={[styles.pledgeCard, isOwn && styles.pledgeCardOwn]}>
        {/* Header */}
        <View style={styles.pledgeHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>
              {streakDay >= 30 ? '👑' : streakDay >= 7 ? '🔥' : '🌱'}
            </Text>
          </View>
          <View style={styles.pledgeMeta}>
            <Text style={styles.pledgeName}>{item.displayName}</Text>
            <Text style={styles.pledgeTime}>
              Day {streakDay} ·{' '}
              {item.createdAt
                ? moment(item.createdAt).fromNow()
                : 'just now'}
            </Text>
          </View>
          {isOwn && (
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Message */}
        <Text style={styles.pledgeMessage}>{item.message}</Text>

        {/* Footer */}
        <View style={styles.pledgeFooter}>
          <TouchableOpacity onPress={() => handleHeart(item.id)} style={styles.heartBtn}>
            <Text style={styles.heartEmoji}>{hasHearted ? '❤️' : '🤍'}</Text>
            <Text style={[styles.heartCount, hasHearted && styles.heartCountActive]}>
              {item.hearts || 0}
            </Text>
          </TouchableOpacity>
          {streakDay >= 7 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {streakDay} days</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧱 The Wall</Text>
        <Text style={styles.headerSub}>Anonymous pledges from warriors like you</Text>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {pledges.length} pledges ·{' '}
          {pledges.filter((p) => (p.streak || 0) >= 7).length} warriors at 7+ days
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading the wall...</Text>
        </View>
      ) : (
        <FlatList
          data={pledges}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPledge}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>Be the first to post a pledge.</Text>
            </View>
          }
        />
      )}

      {/* Post Pledge FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCompose(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>✏️ Post Pledge</Text>
      </TouchableOpacity>

      {/* Compose Modal */}
      <ComposePledgeModal
        visible={showCompose}
        streak={streak}
        onClose={() => setShowCompose(false)}
        onPosted={onPledgePosted}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Compose Modal
// ─────────────────────────────────────────────────────────────────────────────
const PLEDGE_PROMPTS = [
  'Day 1. I choose freedom.',
  'I will not let one weak moment destroy all my strong moments.',
  'Fighting for a better version of myself.',
  'Every day clean is a day I chose myself.',
  'No more. Starting over and this time I mean it.',
];

const ComposePledgeModal = ({ visible, streak, onClose, onPosted }) => {
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (message.trim().length < 5) {
      Alert.alert('Too short', 'Write a short message for the wall.');
      return;
    }
    setPosting(true);
    try {
      const newPledge = await postPledge({ message, streak });
      setMessage('');
      onPosted?.(newPledge);
      onClose();
    } catch {
      Alert.alert('Error', 'Could not post. Check your connection.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>✏️ Your Pledge</Text>
          <Text style={styles.modalSub}>Anonymous · Max 280 characters</Text>

          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Write your pledge to the wall..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={280}
            autoFocus
          />

          <Text style={styles.charCount}>{message.length}/280</Text>

          {/* Prompt chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phrasesScroll}
          >
            {PLEDGE_PROMPTS.map((p) => (
              <TouchableOpacity key={p} onPress={() => setMessage(p)} style={styles.phraseChip}>
                <Text style={styles.phraseText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.postBtn, posting && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={posting}
            activeOpacity={0.85}
          >
            {posting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Post to The Wall 🧱</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { padding: SPACING.lg, paddingTop: SPACING.xl },
  headerTitle:      { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.extrabold, color: COLORS.textPrimary },
  headerSub:        { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  statsBar:         { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  statsText:        { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText:      { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  list:             { paddingHorizontal: SPACING.md, paddingBottom: 100 },

  pledgeCard:       {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  pledgeCardOwn:    { borderColor: COLORS.primary + '60' },
  pledgeHeader:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  avatarCircle:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji:      { fontSize: 20 },
  pledgeMeta:       { flex: 1 },
  pledgeName:       { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  pledgeTime:       { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 },
  deleteBtn:        { padding: SPACING.xs },
  deleteBtnText:    { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  pledgeMessage:    { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.sm },
  pledgeFooter:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heartBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heartEmoji:       { fontSize: 18 },
  heartCount:       { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  heartCountActive: { color: COLORS.accentRed },
  streakBadge:      { backgroundColor: COLORS.accent + '20', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  streakBadgeText:  { fontSize: FONTS.sizes.xs, color: COLORS.accent, fontWeight: FONTS.weights.semibold },

  fab:              {
    position:          'absolute',
    bottom:            SPACING.xl,
    right:             SPACING.lg,
    backgroundColor:   COLORS.primary,
    borderRadius:      RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical:   SPACING.md,
    elevation:         8,
    shadowColor:       COLORS.primary,
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.5,
    shadowRadius:      8,
  },
  fabText:          { color: '#fff', fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },

  emptyState:       { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
  emptyEmoji:       { fontSize: 60 },
  emptyText:        { color: COLORS.textMuted, fontSize: FONTS.sizes.md },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
  modalTitle:       { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: 4 },
  modalSub:         { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  textInput:        {
    backgroundColor:  COLORS.card,
    borderRadius:     RADIUS.lg,
    padding:          SPACING.md,
    color:            COLORS.textPrimary,
    fontSize:         FONTS.sizes.md,
    lineHeight:       22,
    minHeight:        100,
    textAlignVertical:'top',
    borderWidth:      1,
    borderColor:      COLORS.border,
  },
  charCount:        { textAlign: 'right', fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  phrasesScroll:    { gap: SPACING.xs, marginBottom: SPACING.md },
  phraseChip:       { backgroundColor: COLORS.card, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  phraseText:       { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  postBtn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm, elevation: 4 },
  postBtnDisabled:  { backgroundColor: COLORS.surfaceAlt },
  postBtnText:      { color: '#fff', fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
  cancelBtn:        { padding: SPACING.sm, alignItems: 'center' },
  cancelBtnText:    { color: COLORS.textMuted },
});

export default CommunityWallScreen;
