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
const listPledges = (req, res) => {
  try {
    const db     = getDb();
    const uid    = req.anonId;
    const limit  = Math.min(parseInt(req.query.limit  || '20', 10), MAX_PLEDGES_PER_PAGE);
    const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);

    const rows = db.prepare(`
      SELECT
        p.id,
        p.uid,
        p.display_name AS displayName,
        p.message,
        p.streak,
        p.hearts,
        p.created_at   AS createdAt,
        CASE WHEN h.uid IS NOT NULL THEN 1 ELSE 0 END AS hearted
      FROM pledges p
      LEFT JOIN pledge_hearts h ON h.pledge_id = p.id AND h.uid = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(uid, limit, offset);

    const total = db.prepare('SELECT COUNT(*) AS n FROM pledges').get().n;

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
const createPledge = (req, res) => {
  try {
    const db  = getDb();
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

    // Insert
    const id = db.prepare(`
      INSERT INTO pledges (uid, display_name, message, streak)
      VALUES (?, ?, ?, ?)
    `).run(uid, safeDisplayName, trimmed, safeStreak).lastInsertRowid;

    // Fetch the inserted row to return
    const row = db.prepare('SELECT * FROM pledges WHERE rowid = ?').get(id);

    return res.status(201).json(normalise(row));
  } catch (err) {
    console.error('createPledge error:', err);
    return res.status(500).json({ error: 'Failed to create pledge' });
  }
};

// ── POST /api/pledges/:id/heart ───────────────────────────────────────────────
/**
 * Toggle heart on a pledge. Returns { hearted: boolean, hearts: number }.
 */
const toggleHeart = (req, res) => {
  try {
    const db        = getDb();
    const uid       = req.anonId;
    const pledgeId  = req.params.id;

    // Check pledge exists
    const pledge = db.prepare('SELECT id, hearts FROM pledges WHERE id = ?').get(pledgeId);
    if (!pledge) {
      return res.status(404).json({ error: 'Pledge not found' });
    }

    // Check existing heart
    const existing = db.prepare(
      'SELECT 1 FROM pledge_hearts WHERE pledge_id = ? AND uid = ?'
    ).get(pledgeId, uid);

    const toggle = db.transaction(() => {
      if (existing) {
        // Remove heart
        db.prepare('DELETE FROM pledge_hearts WHERE pledge_id = ? AND uid = ?').run(pledgeId, uid);
        db.prepare('UPDATE pledges SET hearts = MAX(hearts - 1, 0) WHERE id = ?').run(pledgeId);
        return false;
      } else {
        // Add heart
        db.prepare('INSERT OR IGNORE INTO pledge_hearts (pledge_id, uid) VALUES (?, ?)').run(pledgeId, uid);
        db.prepare('UPDATE pledges SET hearts = hearts + 1 WHERE id = ?').run(pledgeId);
        return true;
      }
    });

    const hearted = toggle();
    const updated = db.prepare('SELECT hearts FROM pledges WHERE id = ?').get(pledgeId);

    return res.json({ hearted, hearts: updated.hearts });
  } catch (err) {
    console.error('toggleHeart error:', err);
    return res.status(500).json({ error: 'Failed to toggle heart' });
  }
};

// ── DELETE /api/pledges/:id ───────────────────────────────────────────────────
/**
 * Delete own pledge. Only the posting uid may delete.
 */
const deletePledge = (req, res) => {
  try {
    const db       = getDb();
    const uid      = req.anonId;
    const pledgeId = req.params.id;

    const pledge = db.prepare('SELECT uid FROM pledges WHERE id = ?').get(pledgeId);
    if (!pledge) {
      return res.status(404).json({ error: 'Pledge not found' });
    }
    if (pledge.uid !== uid) {
      return res.status(403).json({ error: 'You can only delete your own pledges' });
    }

    db.prepare('DELETE FROM pledges WHERE id = ?').run(pledgeId);
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
