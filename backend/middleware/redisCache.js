// ─────────────────────────────────────────────────────────────────────────────
// middleware/redisCache.js — Redis cache for Gemini API proxy
//
// Behaviour:
//   • Checks Redis for a cached response keyed by SHA-256 of the prompt.
//   • On cache HIT  → returns cached JSON immediately (no upstream call).
//   • On cache MISS → calls next(); after route handler responds with 200,
//     the response body is stored in Redis with a configurable TTL.
//   • Only HTTP 200 responses are cached — errors are never stored.
//   • If Redis is unavailable the middleware is a transparent no-op so the
//     app keeps working without cache.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const crypto = require('crypto');
const Redis  = require('ioredis');

// ── Singleton Redis client ────────────────────────────────────────────────────
let redisClient = null;

const getRedis = () => {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL || null;

  const options = {
    host:               process.env.REDIS_HOST     || '127.0.0.1',
    port:               parseInt(process.env.REDIS_PORT || '6379', 10),
    password:           process.env.REDIS_PASSWORD || undefined,
    db:                 parseInt(process.env.REDIS_DB   || '0',    10),
    // Fail fast on connect so the app starts even without Redis
    lazyConnect:        true,
    connectTimeout:     3000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };

  redisClient = url ? new Redis(url, { lazyConnect: true, enableOfflineQueue: false })
                    : new Redis(options);

  redisClient.on('connect',  () => console.log('✅  Redis connected'));
  redisClient.on('error',    (e) => console.warn('⚠️   Redis error (cache disabled):', e.message));
  redisClient.on('close',    () => console.warn('⚠️   Redis connection closed'));

  redisClient.connect().catch(() => {}); // non-fatal
  return redisClient;
};

// ── Cache TTL defaults (seconds) ──────────────────────────────────────────────
const TTL = {
  dailyMotivation:  86400,  // 24 h  — refreshes once per day
  triggerAnalysis:  3600,   // 1 h   — user-specific, moderate freshness
  visionBoard:      43200,  // 12 h  — semi-static
  default:          3600,   // 1 h   — fallback
};

// ── Derive cache key from prompt text ─────────────────────────────────────────
const cacheKey = (prefix, prompt) => {
  const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  return `gemini:${prefix}:${hash}`;
};

// ── Determine TTL from route type hint ────────────────────────────────────────
const getTtl = (type) => TTL[type] || TTL.default;

// ── Middleware factory ────────────────────────────────────────────────────────
//
// Usage:
//   router.post('/generate', redisCache('dailyMotivation'), handler);
//
// The handler must set res.locals.cacheKey and res.locals.responseBody before
// calling res.json() — or use the patched res.json provided below.
//
const redisCache = (type = 'default') => async (req, res, next) => {
  const redis = getRedis();

  // Extract prompt from request body
  const prompt = req.body?.prompt || req.body?.contents?.[0]?.parts?.[0]?.text || '';
  const key    = cacheKey(type, prompt || JSON.stringify(req.body));

  // ── Cache lookup ────────────────────────────────────────────────────────────
  try {
    if (redis.status === 'ready') {
      const hit = await redis.get(key);
      if (hit) {
        console.log(`[Redis] HIT  ${key}`);
        return res
          .status(200)
          .set('X-Cache', 'HIT')
          .json(JSON.parse(hit));
      }
      console.log(`[Redis] MISS ${key}`);
    }
  } catch (err) {
    console.warn('[Redis] lookup error:', err.message);
  }

  // ── Patch res.json to intercept 200 responses for caching ──────────────────
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only cache successful responses
    if (res.statusCode === 200) {
      const ttl = getTtl(type);
      const serialised = JSON.stringify(body);

      // Fire-and-forget — don't delay response for cache write
      if (redis.status === 'ready') {
        redis.set(key, serialised, 'EX', ttl)
          .then(() => console.log(`[Redis] SET  ${key} TTL=${ttl}s`))
          .catch((e) => console.warn('[Redis] set error:', e.message));
      }

      res.set('X-Cache', 'MISS');
    }

    return originalJson(body);
  };

  next();
};

// ── Manual cache invalidation helper (exported for admin routes if needed) ────
const invalidateCache = async (type, prompt) => {
  try {
    const redis = getRedis();
    const key   = cacheKey(type, prompt);
    await redis.del(key);
    console.log(`[Redis] DEL  ${key}`);
  } catch (err) {
    console.warn('[Redis] invalidation error:', err.message);
  }
};

module.exports = { redisCache, invalidateCache, getRedis };
