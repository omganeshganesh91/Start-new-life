// ─────────────────────────────────────────────────────────────────────────────
// FirebaseService.js — DEPRECATED — Firebase has been removed from this project
//
// All Firebase (Firestore + Auth + FCM) functionality has been replaced:
//   • Community Wall pledges  → src/services/ApiService.js  (Neon-backed REST API)
//   • Push notifications      → src/services/NotificationService.js (expo-notifications)
//
// This file is kept as a tombstone so any missed import fails with a clear message.
// ─────────────────────────────────────────────────────────────────────────────

const REMOVED_MSG =
  '[FirebaseService] Firebase has been removed. Use ApiService.js for community wall features.';

const stub = () => { throw new Error(REMOVED_MSG); };

export const ensureAnonymousAuth = stub;
export const getAnonymousId      = stub;
export const fetchPledges        = stub;
export const postPledge          = stub;
export const toggleHeart         = stub;
export const deletePledge        = stub;
export const subscribeToPledges  = stub;
