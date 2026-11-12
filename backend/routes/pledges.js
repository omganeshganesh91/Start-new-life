// ─────────────────────────────────────────────────────────────────────────────
// routes/pledges.js — Express router for /api/pledges
// ─────────────────────────────────────────────────────────────────────────────
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/pledgesController');

// GET  /api/pledges            — list (paginated)
// POST /api/pledges            — create
// POST /api/pledges/:id/heart  — toggle heart
// DEL  /api/pledges/:id        — delete own

router.get('/',           controller.listPledges);
router.post('/',          controller.createPledge);
router.post('/:id/heart', controller.toggleHeart);
router.delete('/:id',     controller.deletePledge);

module.exports = router;
