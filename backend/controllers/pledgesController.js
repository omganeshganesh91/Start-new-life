// ─────────────────────────────────────────────────────────────────────────────
// controllers/pledgesController.js — Business logic for The Wall
// ─────────────────────────────────────────────────────────────────────────────
const { getDb } = require('../db');

const MAX_MESSAGE_LENGTH = 280;
const MAX_PLEDGES_PER_PAGE = 50;

// ── GET /api/pledges ──────────────────────────────────────────────────────────
/**
 * List pledges newest-first with pagination.
 * Query params: limit (default 20, max 50), offset (default 0)
 * Attaches `hearted: boolean` for the requesting uid.
 */
const listPledges = async (req, res) => {
  try {
    const db     = getDb();
    const uid    = req.anonId;
    const limit  = Math.min(parseInt(req.query.limit  || '20', 10), MAX_PLEDGES_PER_PAGE);
    const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);

    const { rows } = await db.query(`
      SELECT
        p.id,
        p.uid,
        p.display_name AS "displayName",
        p.message,
        p.streak,
        p.hearts,
        p.created_at   AS "createdAt",
        CASE WHEN h.uid IS NOT NULL THEN TRUE ELSE FALSE END AS hearted
      FROM pledges p
      LEFT JOIN pledge_hearts h ON h.pledge_id = p.id AND h.uid = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [uid, limit, offset]);

    const countResult = await db.query('SELECT COUNT(*) AS n FROM pledges');
    const total = Number(countResult.rows[0].n);

    return res.json({
      pledges: rows.map(normalise),
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('listPledges error:', err);
    return res.status(500).json({ error: 'Failed to fetch pledges' });
  }
};

// ── POST /api/pledges ─────────────────────────────────────────────────────────
/**
 * Create a new pledge.
 * Body: { message, streak, displayName }
 * Header: x-anon-id (set by middleware)
 */
const createPledge = async (req, res) => {
  try {
    const uid = req.anonId;

    const { message, streak, displayName } = req.body;

    // Validate
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (trimmed.length < 5) {
      return res.status(400).json({ error: 'message too short (min 5 chars)' });
    }

    const safeStreak      = Number.isFinite(+streak)     ? Math.max(0, +streak)          : 0;
    const safeDisplayName = typeof displayName === 'string' && displayName.trim()
      ? displayName.trim().slice(0, 50)
      : generateAnonymousName();
    const db = getDb();

    // Insert
    const { rows } = await db.query(`
      INSERT INTO pledges (uid, display_name, message, streak)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        uid,
        display_name AS "displayName",
        message,
        streak,
        hearts,
        FALSE AS hearted,
        created_at AS "createdAt"
    `, [uid, safeDisplayName, trimmed, safeStreak]);

    return res.status(201).json(normalise(rows[0]));
  } catch (err) {
    console.error('createPledge error:', err);
    return res.status(500).json({ error: 'Failed to create pledge' });
  }
};

// ── POST /api/pledges/:id/heart ───────────────────────────────────────────────
/**
 * Toggle heart on a pledge. Returns { hearted: boolean, hearts: number }.
 */
const toggleHeart = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const db        = getDb();
    const uid       = req.anonId;
    const pledgeId  = req.params.id;
    client = await db.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    const pledge = await client.query(
      'SELECT id FROM pledges WHERE id = $1 FOR UPDATE',
      [pledgeId]
    );
    if (pledge.rowCount === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ error: 'Pledge not found' });
    }

    const existing = await client.query(
      'SELECT 1 FROM pledge_hearts WHERE pledge_id = $1 AND uid = $2',
      [pledgeId, uid]
    );

    const hearted = existing.rowCount === 0;
    if (hearted) {
      await client.query(
        'INSERT INTO pledge_hearts (pledge_id, uid) VALUES ($1, $2)',
        [pledgeId, uid]
      );
      await client.query(
        'UPDATE pledges SET hearts = hearts + 1 WHERE id = $1',
        [pledgeId]
      );
    } else {
      await client.query(
        'DELETE FROM pledge_hearts WHERE pledge_id = $1 AND uid = $2',
        [pledgeId, uid]
      );
      await client.query(
        'UPDATE pledges SET hearts = GREATEST(hearts - 1, 0) WHERE id = $1',
        [pledgeId]
      );
    }

    const updated = await client.query(
      'SELECT hearts FROM pledges WHERE id = $1',
      [pledgeId]
    );
    await client.query('COMMIT');
    transactionStarted = false;

    return res.json({ hearted, hearts: updated.rows[0].hearts });
  } catch (err) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('toggleHeart rollback error:', rollbackError);
      }
    }
    console.error('toggleHeart error:', err);
    return res.status(500).json({ error: 'Failed to toggle heart' });
  } finally {
    if (client) client.release();
  }
};

// ── DELETE /api/pledges/:id ───────────────────────────────────────────────────
/**
 * Delete own pledge. Only the posting uid may delete.
 */
const deletePledge = async (req, res) => {
  try {
    const db       = getDb();
    const uid      = req.anonId;
    const pledgeId = req.params.id;

    const pledge = await db.query(
      'SELECT uid FROM pledges WHERE id = $1',
      [pledgeId]
    );
    if (pledge.rowCount === 0) {
      return res.status(404).json({ error: 'Pledge not found' });
    }
    if (pledge.rows[0].uid !== uid) {
      return res.status(403).json({ error: 'You can only delete your own pledges' });
    }

    await db.query('DELETE FROM pledges WHERE id = $1', [pledgeId]);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('deletePledge error:', err);
    return res.status(500).json({ error: 'Failed to delete pledge' });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise a DB row to the shape CommunityWallScreen expects */
const normalise = (row) => ({
  id:          row.id,
  uid:         row.uid,
  displayName: row.displayName || row.display_name,
  message:     row.message,
  streak:      row.streak,
  hearts:      row.hearts,
  hearted:     Boolean(row.hearted),
  createdAt:   row.createdAt || row.created_at,
});

const ADJECTIVES = ['Brave','Silent','Rising','Strong','New','Free','Clear','Bold','Calm','Pure'];
const NOUNS      = ['Phoenix','Warrior','Dawn','Spirit','Journey','Soul','Path','Light','Hope','Star'];

const generateAnonymousName = () => {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

module.exports = { listPledges, createPledge, toggleHeart, deletePledge };
