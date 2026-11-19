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
const GEMINI_URL     =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
const FALLBACK_GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
const GEMINI_REQUEST_TIMEOUT_MS = 15000;

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
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return res.status(503).json({ error: 'Gemini API key not configured on server' });
  }

  const { prompt, generationConfig, safetySettings } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'prompt is required and must be a non-empty string' });
  }

  try {
    const requestOptions = {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt.trim() }] }],
        generationConfig: { ...DEFAULT_GENERATION_CONFIG, ...generationConfig },
        safetySettings:   safetySettings || DEFAULT_SAFETY_SETTINGS,
      }),
    };

    const requestStartedAt = Date.now();
    console.info(`[Gemini] ${req.method} ${req.path} started`);
    const requestModel = async (modelUrl, modelName) => {
      const modelStartedAt = Date.now();
      console.info(`[Gemini] ${req.path} calling ${modelName}`);
      try {
        const response = await fetch(`${modelUrl}?key=${encodeURIComponent(apiKey)}`, requestOptions);
        const responseData = await response.json();
        console.info(
          `[Gemini] ${req.path} ${modelName} status=${response.status} durationMs=${Date.now() - modelStartedAt}`
        );
        return { response, responseData };
      } catch (error) {
        console.warn(
          `[Gemini] ${req.path} ${modelName} failed durationMs=${Date.now() - modelStartedAt}: ${error.message}`
        );
        throw error;
      }
    };

    let { response: upstream, responseData: data } = await requestModel(GEMINI_URL, 'gemini-3.8-flash');

    if (upstream.status === 503) {
      console.warn(`[Gemini] ${req.path} primary model overloaded; trying gemini-3.6-flash`);
      ({ response: upstream, responseData: data } = await requestModel(
        FALLBACK_GEMINI_URL,
        'gemini-3.6-flash'
      ));
    }

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
      console.info(`[Gemini] ${req.path} completed durationMs=${Date.now() - requestStartedAt}`);
      return res.status(200).json({ text: rawText });
    }

    // ── Non-200 from Gemini — forward status, do NOT cache ────────────────────
    console.warn(
      `[Gemini] ${req.path} failed status=${upstream.status} durationMs=${Date.now() - requestStartedAt}:`,
      data?.error?.message || data
    );
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
