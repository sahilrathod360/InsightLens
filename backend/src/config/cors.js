import { config } from './env.js';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://insight-lens.vercel.app'
];

const addNormalizedOrigin = (rawUrl) => {
  if (!rawUrl) return;
  const clean = rawUrl.trim().replace(/\/+$/, '');
  if (clean && !allowedOrigins.includes(clean)) {
    allowedOrigins.push(clean);
  }
};

addNormalizedOrigin(config.clientUrl);

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(addNormalizedOrigin);
}

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, '');
    
    // Explicit matches
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Dynamic matches: any Vercel deployment (*.vercel.app), Render deployment (*.onrender.com), or localhost port
    const isVercelDomain = /^https:\/\/[a-z0-9-]+(\.vercel\.app)$/i.test(cleanOrigin) || /^https:\/\/insight-?lens.*\.vercel\.app$/i.test(cleanOrigin);
    const isRenderDomain = /^https:\/\/[a-z0-9-]+(\.onrender\.com)$/i.test(cleanOrigin);
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanOrigin);

    if (isVercelDomain || isRenderDomain || isLocalhost) {
      return callback(null, true);
    }

    callback(new Error(`CORS error: Origin ${origin} is not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

