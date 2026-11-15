'use strict';

require('dotenv').config();
const { closeDb, getDb } = require('./index');

async function migrate() {
  const db = getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS pledges (
      id           TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
      uid          TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Warrior',
      message      TEXT NOT NULL,
      streak       INTEGER NOT NULL DEFAULT 0,
      hearts       INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS pledge_hearts (
      pledge_id TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
      uid       TEXT NOT NULL,
      PRIMARY KEY (pledge_id, uid)
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_pledges_created_at ON pledges (created_at DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_pledges_uid ON pledges (uid)');
  console.log('Neon PostgreSQL schema migrated successfully');
}

migrate()
  .catch((err) => {
    console.error('Database migration failed:', err);
    process.exitCode = 1;
  })
  .finally(closeDb);
