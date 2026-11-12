// ─────────────────────────────────────────────────────────────────────────────
// middleware/errorHandler.js — Centralised error handler for Express
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const isDev    = process.env.NODE_ENV !== 'production';
  const status   = err.status || err.statusCode || 500;
  const message  = err.message || 'Internal Server Error';

  console.error(`[${req.method} ${req.path}]`, err.message || err);

  return res.status(status).json({
    error:   message,
    ...(isDev ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
