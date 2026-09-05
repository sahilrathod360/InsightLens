export const errorHandler = (err, req, res, next) => {
  // Sanitize logged message to ensure no connection strings, tokens, or keys are printed
  const rawLog = err.stack || err.message || 'Unknown error';
  const sanitizedLog = String(rawLog)
    .replace(/postgres:\/\/[^@]+@/gi, 'postgres://***:***@')
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[GEMINI_KEY_REDACTED]')
    .replace(/sk-or-v1-[a-z0-9]+/gi, '[OPENROUTER_KEY_REDACTED]');

  console.error(`[Error] [${req.method} ${req.originalUrl}]`, sanitizedLog);

  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Prevent database or internal server error details from leaking to clients
  let message = err.message || 'Internal server error.';
  const isDatabaseOrInternalError = statusCode === 500 ||
    /postgres|pg_|database|connection|syntax error at or near|relation.*does not exist/i.test(message);

  if (isDatabaseOrInternalError) {
    message = 'An internal error occurred. Please try again later.';
  }

  res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    success: false,
    message,
    data: null,
    errors: isProduction || isDatabaseOrInternalError ? [] : (err.errors || []),
    timestamp: new Date().toISOString()
  });
};
