// ─────────────────────────────────────────────────────────────────────────────
// middleware/anonId.js — Extract or generate anonymous device ID from header
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the x-anon-id header sent by ApiService.js.
 * Falls back to a request-scoped temporary ID so routes never crash.
 * The ID is attached to req.anonId.
 */
const anonIdMiddleware = (req, _res, next) => {
  const raw = req.headers['x-anon-id'];
  // Basic sanity check: non-empty string, max 64 chars
  if (raw && typeof raw === 'string' && raw.trim().length <= 64) {
    req.anonId = raw.trim();
  } else {
    req.anonId = 'unknown_' + Date.now();
  }
  next();
};

module.exports = anonIdMiddleware;
