'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// Return a bounded page so the app can browse the quote library without
// loading the whole database into memory at once.
router.get('/', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const parsedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;
  const offset = Number.isFinite(parsedOffset) ? Math.min(Math.max(parsedOffset, 0), 50000) : 0;

  try {
    const db = getDb();
    const [{ rows }, countResult] = await Promise.all([
      db.query(`
        SELECT id, category, quote
        FROM motivational_quotes
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      db.query('SELECT COUNT(*)::int AS total FROM motivational_quotes'),
    ]);
    const total = Math.min(Number(countResult.rows[0]?.total || 0), 50000);
    return res.json({ quotes: rows, total, limit, offset, hasMore: offset + rows.length < total });
  } catch (error) {
    return next(error);
  }
});

router.get('/random', async (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { rows } = await getDb().query(`
      SELECT id, category, quote
      FROM motivational_quotes
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (!rows.length) {
      return res.status(503).json({ error: 'Motivational quotes are not seeded. Run npm run migrate.' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
