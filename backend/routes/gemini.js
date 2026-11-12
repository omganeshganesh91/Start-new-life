// ─────────────────────────────────────────────────────────────────────────────
// routes/gemini.js — Backend proxy for Google Gemini API
//
// Why proxy?
//   • Keeps the API key server-side — never exposed to the client bundle.
//   • Redis cache sits here: only HTTP 200 responses are stored.
//   • All non-200 (4xx, 5xx) pass through uncached so errors are never served
//     from stale cache.
//
// Routes:
//   POST /api/gemini/motivation    → dailyMotivation prompt  (TTL 24 h)
//   POST /api/gemini/triggers      → triggerAnalysis prompt  (TTL 1 h)
//   POST /api/gemini/vision        → visionBoard prompt      (TTL 12 h)
//   POST /api/gemini/generate      → raw/generic prompt      (TTL 1 h)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const express = require('express');

const { redisCache } = require('../middleware/redisCache');

const router = express.Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL     =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const DEFAULT_GENERATION_CONFIG = {
  temperature:     0.85,
  topK:            40,
  topP:            0.95,
  maxOutputTokens: 300,
};

const DEFAULT_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

// ── Core proxy helper ─────────────────────────────────────────────────────────
// Calls Gemini and forwards the result.
// Only 200 responses reach res.json() — so only they get cached by the
// redisCache middleware that patched res.json.
const proxyToGemini = async (req, res, next) => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return res.status(503).json({ error: 'Gemini API key not configured on server' });
  }

  const { prompt, generationConfig, safetySettings } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'prompt is required and must be a non-empty string' });
  }

  try {
    const upstream = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt.trim() }] }],
        generationConfig: { ...DEFAULT_GENERATION_CONFIG, ...generationConfig },
        safetySettings:   safetySettings || DEFAULT_SAFETY_SETTINGS,
      }),
    });

    const data = await upstream.json();

    // ── Only 200 → cached by redisCache middleware via patched res.json ────────
    if (upstream.status === 200) {
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        // Gemini returned 200 but with no usable text — treat as upstream error
        return res.status(502).json({
          error:  'Empty response from Gemini',
          detail: data,
        });
      }
      // This is the ONLY path that triggers the Redis SET in redisCache
      return res.status(200).json({ text: rawText });
    }

    // ── Non-200 from Gemini — forward status, do NOT cache ────────────────────
    console.warn(`[Gemini] upstream ${upstream.status}:`, data?.error?.message || data);
    return res.status(upstream.status).json({
      error:  data?.error?.message || `Gemini error ${upstream.status}`,
      status: upstream.status,
    });

  } catch (err) {
    next(err); // network / parse errors → centralised errorHandler
  }
};

// ── Routes — each uses a different cache type / TTL ──────────────────────────

// Daily motivation — cached 24 h
router.post('/motivation', redisCache('dailyMotivation'), proxyToGemini);

// Trigger pattern analysis — cached 1 h
router.post('/triggers',   redisCache('triggerAnalysis'), proxyToGemini);

// Vision board affirmation — cached 12 h
router.post('/vision',     redisCache('visionBoard'),     proxyToGemini);

// Generic / raw prompt — cached 1 h (default)
router.post('/generate',   redisCache('default'),         proxyToGemini);

module.exports = router;
