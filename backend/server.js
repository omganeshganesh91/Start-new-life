// ─────────────────────────────────────────────────────────────────────────────
// server.js — Start A New Life — Node.js + Express + Neon PostgreSQL backend
//
// Start:   node server.js
// Dev:     nodemon server.js
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// Load .env if present (Railway/Render inject env vars directly in production)
try { require('fs').accessSync('.env'); require('dotenv').config(); } catch {}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const pledgesRouter = require('./routes/pledges');
const quotesRouter   = require('./routes/quotes');
const geminiRouter  = require('./routes/gemini');
const anonId        = require('./middleware/anonId');
const errorHandler  = require('./middleware/errorHandler');

const { getDb } = require('./db');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// ── CORS — must be FIRST, before every other middleware ───────────────────────
//
// Allowed origins:
//   • http://localhost:8081   — Expo web (Metro dev server)
//   • http://localhost:19006  — Expo web (older Metro port)
//   • http://localhost:19000  — Expo Go tunnel
//   • http://192.168.*.*:8081 — Expo Go on LAN (physical device)
//   • CORS_ORIGIN env var     — override for production / custom origins
//
const DEV_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
];

const getAllowedOrigins = () => {
  const envOrigin = process.env.CORS_ORIGIN;
  if (!envOrigin || envOrigin === '*') return null; // null = allow all
  return [
    ...DEV_ORIGINS,
    ...envOrigin.split(',').map((s) => s.trim()),
  ];
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow all if no restrictions configured
    if (!allowedOrigins) return callback(null, true);
    // Check whitelist
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(anonId);

app.get('/health', async (_req, res) => {
  try {
    await getDb().query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check database error:', err);
    return res.status(503).json({ status: 'error', error: 'Database unavailable' });
  }
});

app.use('/api/pledges', pledgesRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/gemini', geminiRouter);
app.use(errorHandler);

module.exports = app; // exported for supertest

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`✅  Backend listening on port ${port}`);
  });
}
