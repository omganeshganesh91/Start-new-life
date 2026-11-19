'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS motivational_quotes (
      id       TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      quote    TEXT NOT NULL
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_motivational_quotes_category ON motivational_quotes (category)');

  const quoteFile = path.join(__dirname, '..', 'data', 'motivational_quotes.json');
  const quotes = JSON.parse(fs.readFileSync(quoteFile, 'utf8'));
  if (!Array.isArray(quotes) || quotes.length !== 5000) {
    throw new Error('Expected exactly 5000 quotes in backend/data/motivational_quotes.json');
  }

  const batchSize = 500;
  for (let start = 0; start < quotes.length; start += batchSize) {
    const batch = quotes.slice(start, start + batchSize);
    const values = [];
    const placeholders = batch.map((quote, index) => {
      const offset = index * 3;
      values.push(quote.id, quote.category, quote.quote);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    });

    await db.query(`
      INSERT INTO motivational_quotes (id, category, quote)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE
      SET category = EXCLUDED.category, quote = EXCLUDED.quote
    `, values);
  }

  console.log('Neon PostgreSQL schema migrated successfully');
  console.log(`Seeded ${quotes.length} motivational quotes`);
}

migrate()
  .catch((err) => {
    console.error('Database migration failed:', err);
    process.exitCode = 1;
  })
  .finally(closeDb);
