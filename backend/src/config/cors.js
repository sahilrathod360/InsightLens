import { config } from './env.js';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

if (config.clientUrl && !allowedOrigins.includes(config.clientUrl)) {
  allowedOrigins.push(config.clientUrl);
}

if (process.env.ALLOWED_ORIGINS) {
  const extra = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  extra.forEach(o => {
    if (o && !allowedOrigins.includes(o)) {
      allowedOrigins.push(o);
    }
  });
}

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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

