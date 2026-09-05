import { config } from './env.js';

// Base trusted production and development origins
const defaultAllowedOrigins = [
  'https://insight-lens.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

const allowedOriginsSet = new Set(defaultAllowedOrigins);

// Append clientUrl from env config
if (config.clientUrl) {
  allowedOriginsSet.add(config.clientUrl.trim().replace(/\/+$/, ''));
}

// Support CORS_ORIGINS and ALLOWED_ORIGINS env variables (comma separated)
const envOrigins = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '';
if (envOrigins) {
  envOrigins.split(',').forEach(raw => {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (trimmed) allowedOriginsSet.add(trimmed);
  });
}

export const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests with no Origin header (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    
    // Explicit exact match in allowlist
    if (allowedOriginsSet.has(cleanOrigin)) {
      return callback(null, true);
    }

    // Dynamic matches: official InsightLens Vercel deployments (insight-lens*.vercel.app)
    const isInsightLensVercel = /^https:\/\/insight-?lens(-[a-z0-9]+)?\.vercel\.app$/i.test(cleanOrigin);
    // Localhost / 127.0.0.1 development ports (only in non-production)
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanOrigin);

    if (isInsightLensVercel || isLocalhost) {
      return callback(null, true);
    }

    // Reject unknown / unauthorized origins
    return callback(new Error(`CORS error: Origin "${origin}" is not authorized.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};
