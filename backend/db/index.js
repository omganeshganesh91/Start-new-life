// ─────────────────────────────────────────────────────────────────────────────
// db/index.js — SQLite connection singleton (better-sqlite3)
// ─────────────────────────────────────────────────────────────────────────────
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sanl.db');

// Ensure data directory exists before opening the file
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db = null;

/**
 * Returns the shared SQLite connection, auto-initialising schema on first call.
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Auto-create schema if tables don't exist yet (no external migration step needed for dev)
  _db.exec(`
    CREATE TABLE IF NOT EXISTS pledges (
      id           TEXT     PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      uid          TEXT     NOT NULL,
      display_name TEXT     NOT NULL DEFAULT 'Warrior',
      message      TEXT     NOT NULL,
      streak       INTEGER  NOT NULL DEFAULT 0,
      hearts       INTEGER  NOT NULL DEFAULT 0,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pledge_hearts (
      pledge_id TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
      uid       TEXT NOT NULL,
      PRIMARY KEY (pledge_id, uid)
    );

    CREATE INDEX IF NOT EXISTS idx_pledges_created_at ON pledges (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pledges_uid        ON pledges (uid);
  `);

  return _db;
}

module.exports = { getDb };
