'use strict';

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

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
