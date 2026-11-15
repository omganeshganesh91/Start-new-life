# 🌱 Start A New Life

A React Native (Expo SDK 51) recovery support app — streak tracking, community wall, blocker, daily motivation via Gemini AI.

**Tech stack:** React Native · Expo SDK 51 · Redux Toolkit · Node.js · Neon PostgreSQL · Axios · expo-notifications

---

## 🚀 Quick Start

### 1. Install Expo app dependencies

```bash
cd StartANewLife
npm install
```

### 2. Configure the Expo app

```bash
Copy-Item .env.example .env
# In .env, set EXPO_PUBLIC_API_URL to your computer's LAN IP for a physical phone.
```

### 3. Install and start the backend

```bash
cd backend
npm install
# Copy .env.example to .env and set DATABASE_URL and GEMINI_API_KEY on the backend only.
npm start       # starts on http://localhost:5000
```

The Gemini API key belongs in `backend/.env`; never put it in the Expo app's
public environment variables. Redis is optional and the backend runs without it.
Set `DATABASE_URL` to your Neon connection string in `backend/.env` and in the
backend's Vercel environment variables. Run `npm run migrate` from `backend/`
once to create the PostgreSQL tables.

---

## 📱 Run Commands

### Run in Browser (Web — responsive preview for all devices)

```bash
npx expo start --web
```

Then open **http://localhost:8081** in your browser.

Use **Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)** to preview any device:

| Device | Resolution |
|---|---|
| iPhone SE | 375 × 667 |
| iPhone 14 Pro | 393 × 852 |
| iPhone 14 Pro Max | 430 × 932 |
| Samsung Galaxy S21 | 360 × 800 |
| Samsung Galaxy S22 Ultra | 384 × 854 |
| Pixel 7 | 412 × 915 |
| iPad Air | 820 × 1180 |
| iPad Pro 12.9" | 1024 × 1366 |

### Run on a phone with Expo Go (same Wi-Fi)

Install **Expo Go** from Google Play or the iOS App Store. Set
`EXPO_PUBLIC_API_URL` in the project-root `.env` to your computer's LAN address
(for example, `http://192.168.1.25:5000`). Do not use `localhost` on a phone:
that refers to the phone itself.

Start the backend in one PowerShell window:

```bash
Set-Location C:\Users\omgan\Downloads\StartANewLife\backend
npm start
```

Start Expo in a second PowerShell window from the project root:

```bash
Set-Location C:\Users\omgan\Downloads\StartANewLife
npx expo start --lan
```

Scan the terminal QR code from Expo Go. Keep the phone and computer on the same
Wi-Fi. If the phone cannot connect, allow Node.js through Windows Firewall and
make sure ports 8081 (Expo) and 5000 (backend) are reachable.

For the Android emulator, set the app API URL to
`http://10.0.2.2:5000` instead of `localhost`.

### Install a local Android build

```bash
npx expo run:android
```

Install Android Studio with its Android SDK, connect an Android phone with USB
debugging enabled (or start an emulator), then run the command from the project
root. Expo will generate the native Android project if needed, build the app,
and install it on the connected device. The backend must still be running, and
the app `.env` must use the computer's LAN IP for a physical phone.

This project uses Expo SDK 51. If the current Expo Go app reports an SDK
mismatch, use a local Android build instead. Building/running iOS locally
requires macOS and Xcode; Windows users need a cloud iOS build service.

`npx expo start --web` runs the browser preview; it does not install a mobile
app. `npx expo start --android` opens Expo on an Android emulator or device but
also does not create a standalone install package.

---

## 🔧 Backend Commands

```bash
cd backend

npm start          # production
npm run dev        # dev with auto-reload (nodemon)
npm test           # run integration tests
npm run migrate    # create/update Neon PostgreSQL tables
```

Backend endpoints:

| Method | URL | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/pledges?limit=20&offset=0` | List pledges |
| POST | `/api/pledges` | Create pledge |
| POST | `/api/pledges/:id/heart` | Toggle heart |
| DELETE | `/api/pledges/:id` | Delete own pledge |
| POST | `/api/gemini/motivation` | Daily motivation |
| POST | `/api/gemini/triggers` | Trigger-pattern analysis |
| POST | `/api/gemini/vision` | Vision-board affirmation |
| POST | `/api/gemini/generate` | Generic text generation |

---

## 🧪 Tests

```bash
# Expo app tests
npm test

# Backend API tests
cd backend && npm test
```

---

## 📁 Project Structure

```
StartANewLife/
├── App.js                        # Root — Redux Provider + AppNavigator
├── .env                          # EXPO_PUBLIC_GEMINI_API_KEY + EXPO_PUBLIC_API_URL
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js       # Bottom tabs + Stack navigator
│   ├── screens/
│   │   ├── DashboardScreen.js    # Home: streak, check-in, motivation
│   │   ├── CommunityWallScreen.js# Anonymous pledge wall (→ REST API)
│   │   ├── ProgressScreen.js     # Charts + trigger analysis
│   │   ├── MotivationScreen.js   # Daily quote + grounding exercise
│   │   ├── BlockerScreen.js      # DNS setup guide + private gallery item count
│   │   └── AppLockScreen.js      # Focus timer + app-avoidance preferences
│   ├── services/
│   │   ├── ApiService.js         # REST client → Neon-backed Node.js API ✅
│   │   ├── GeminiService.js      # Gemini AI free tier (1500 req/day)
│   │   ├── NotificationService.js# expo-notifications local push ✅
│   │   └── FirebaseService.js    # ⛔ DEPRECATED tombstone (Firebase removed)
│   ├── store/
│   │   ├── store.js              # Redux store
│   │   ├── streakSlice.js        # Streak state (AsyncStorage)
│   │   ├── coinsSlice.js         # Soul Coins (AsyncStorage)
│   │   └── motivationSlice.js    # Daily motivation (Gemini)
│   ├── components/               # Reusable UI components
│   └── utils/
│       ├── constants.js          # COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS ✅
│       ├── responsive.js         # hs/vs/ms/wp/hp — responsive for all screen sizes
│       ├── dateUtils.js          # Streak calculation helpers
│       └── encryption.js        # expo-secure-store helpers
├── backend/                      # Node.js + Neon PostgreSQL backend
│   ├── server.js                 # Express app entry point
│   ├── db/
│   │   ├── index.js              # Neon PostgreSQL connection pool
│   │   └── migrate.js            # Schema migration script
│   ├── routes/
│   │   └── pledges.js            # /api/pledges router
│   ├── controllers/
│   │   └── pledgesController.js  # CRUD + heart toggle logic
│   ├── middleware/
│   │   ├── anonId.js             # x-anon-id header → req.anonId
│   │   └── errorHandler.js       # Centralised error handler
│   └── tests/
│       └── pledges.test.js       # Supertest integration tests
├── __mocks__/
│   ├── ApiService.js             # Jest mock for community wall ✅
│   ├── @env.js                   # Jest mock for env vars (no Firebase keys)
│   ├── asyncStorage.js           # Jest mock for AsyncStorage
│   ├── expo-notifications.js     # Jest mock for expo-notifications ✅
│   ├── encryptedStorage.js       # Jest mock for encrypted storage
│   └── firebase.js               # Tombstone mock (prevents crash on missed imports)
└── __tests__/
    ├── coinsSlice.test.js
    ├── dateUtils.test.js
    ├── encryption.test.js
    ├── GeminiService.test.js
    └── responsive.test.js
```

---

## 🔥 What changed (Firebase → Node.js + Neon PostgreSQL)

| Before | After |
|---|---|
| `@react-native-firebase/firestore` | `axios` → `backend/server.js` |
| `@react-native-firebase/auth` (anonymous) | Device-generated UUID stored in AsyncStorage |
| Firestore realtime listener | 15-second polling (`setInterval`) |
| Firebase Cloud Messaging | `expo-notifications` (local push) |
| Firebase env vars | Removed — `EXPO_PUBLIC_API_URL` is in the app `.env`; `GEMINI_API_KEY` stays in `backend/.env` |

---

## 📱 Responsive Design

The app is fully responsive across all device sizes:

- **Small phones** (360px): SE, A-series budget
- **Standard phones** (390–414px): iPhone 14, Pixel 7, Galaxy S
- **Large phones** (430px+): Pro Max, Galaxy Ultra  
- **Foldables** (600–768px): Z Fold inner screen
- **Tablets** (768px+): iPad, Galaxy Tab — two-column layout
- **Web browser**: Max 720px centered, full keyboard/mouse support

Use `hs()`, `vs()`, `ms()` from `responsive.js` for scaling. Import `FONTS.sizes.*`, `SPACING.*`, `RADIUS.*` from `constants.js`.

## Platform capability notes

- Expo Go cannot change device DNS or block/monitor other apps. The DNS screen
  provides manual setup guidance and stores only your confirmation; app-lock
  toggles are saved preferences, not system-enforced locks.
- The gallery check reads the media-library item count only. It does not inspect
  or classify photos/videos, and does not upload them.
- Enforcing DNS or app blocking requires a separate native implementation and
  appropriate operating-system permissions. Do not treat these screens as
  substitutes for device-level parental controls or professional support.
