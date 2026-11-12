// ─────────────────────────────────────────────────────────────────────────────
// db/migrate.js — Create / migrate SQLite schema
// Run: node db/migrate.js
// Safe to re-run (uses IF NOT EXISTS + ALTER TABLE migrations table)
// ─────────────────────────────────────────────────────────────────────────────
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sanl.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
const SCHEMA = `
  -- Pledges posted to The Wall
  CREATE TABLE IF NOT EXISTS pledges (
    id           TEXT     PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    uid          TEXT     NOT NULL,                   -- anonymous device ID
    display_name TEXT     NOT NULL DEFAULT 'Warrior',
    message      TEXT     NOT NULL,
    streak       INTEGER  NOT NULL DEFAULT 0,
    hearts       INTEGER  NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Hearts (uid can heart each pledge once)
  CREATE TABLE IF NOT EXISTS pledge_hearts (
    pledge_id TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
    uid       TEXT NOT NULL,
    PRIMARY KEY (pledge_id, uid)
  );

  -- Indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_pledges_created_at ON pledges (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pledges_uid        ON pledges (uid);
`;

db.exec(SCHEMA);

console.log('✅  SQLite schema migrated successfully:', DB_PATH);
db.close();
