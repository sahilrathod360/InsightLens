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
    const cleanOrigin = origin ? origin.replace(/\/+$/, '') : null;
    if (!cleanOrigin || allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: Origin ${origin} is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

