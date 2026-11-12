// ─────────────────────────────────────────────────────────────────────────────
// __mocks__/firebase.js — Firebase has been REMOVED from this project.
// If a test or source file still imports @react-native-firebase/*,
// it will receive this mock and should be updated to use ApiService instead.
// ─────────────────────────────────────────────────────────────────────────────
const noop = () => {};
const noopPromise = () => Promise.resolve(null);

const firestoreMock = {
  collection: () => firestoreMock,
  doc:        () => firestoreMock,
  add:        noopPromise,
  set:        noopPromise,
  get:        noopPromise,
  update:     noopPromise,
  delete:     noopPromise,
  onSnapshot: (cb) => { cb({ docs: [] }); return noop; },
  orderBy:    () => firestoreMock,
  limit:      () => firestoreMock,
  startAfter: () => firestoreMock,
  where:      () => firestoreMock,
  FieldValue: {
    serverTimestamp: () => new Date().toISOString(),
    increment:       (n) => n,
    arrayUnion:      (...args) => args,
    arrayRemove:     () => [],
  },
};

// @react-native-firebase/firestore
module.exports = Object.assign(() => firestoreMock, firestoreMock);
