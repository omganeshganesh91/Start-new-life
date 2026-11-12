// ─────────────────────────────────────────────────────────────────────────────
// server.js — Start A New Life — Node.js + Express + SQLite backend
//
// Start:   node server.js
// Dev:     nodemon server.js
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// Load .env if present (Railway/Render inject env vars directly in production)
try { require('fs').accessSync('.env'); require('dotenv').config(); } catch {}

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');

const pledgesRouter = require('./routes/pledges');
const geminiRouter  = require('./routes/gemini');
const anonId        = require('./middleware/anonId');
const errorHandler  = require('./middleware/errorHandler');

// ── Bootstrap SQLite (auto-creates schema on first start) ─────────────────────
const { getDb } = require('./db');
try {
  getDb();
  console.log('✅  SQLite database ready');
} catch (err) {
  console.error('❌  Database init failed:', err.message);
  process.exit(1);
}

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
    // Allow a5
}

module.exports = app; // exported for supertest
