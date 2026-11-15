'use strict';

const { Pool } = require('@neondatabase/serverless');

let pool;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to connect to Neon PostgreSQL');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }

  return pool;
}

async function closeDb() {
  if (!pool) return;
  const activePool = pool;
  pool = null;
  await activePool.end();
}

module.exports = { getDb, closeDb };
