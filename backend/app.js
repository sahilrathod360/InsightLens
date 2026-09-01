import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';

import { config } from './src/config/env.js';
import { corsOptions } from './src/config/cors.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import pool from './src/config/db.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import analysisRoutes from './src/routes/analysis.routes.js';
import reportRoutes from './src/routes/report.routes.js';
import archiveRoutes from './src/routes/archive.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import historyRoutes from './src/routes/history.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';

console.log('Creating Express app instance...');
const app = express();

// Trust reverse proxy (Render, Cloudflare, Vercel)
app.set('trust proxy', 1);

// Phase 3 & Phase 15: Disable X-Powered-By header completely
app.disable('x-powered-by');

// Phase 3 & Phase 16: Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Prevent breaking frontend external scripts/CDNs
  xPoweredBy: false,
  referrerPolicy: { policy: "no-referrer-when-downgrade" }
}));

// Phase 4: Enforce Strict CORS Security
app.use(cors(corsOptions));

// Phase 11: Protect against HTTP Parameter Pollution
app.use(hpp());

// Phase 12: Enable Compression
app.use(compression());

// Phase 6 & Phase 13: 35 MB Payload Protection (Accommodates 25MB raw file Base64 expansion)
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Standard Render Health Check Route
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Phase 5: Rate Limiting on API Routes (100 requests per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP address. Please try again after 15 minutes.',
      data: null,
      errors: [],
      timestamp: new Date().toISOString()
    });
  }
});
app.use('/api', apiLimiter);

// API Health Check for Frontend & Monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'InsightLens Backend is healthy.',
    timestamp: new Date().toISOString()
  });
});

// =========================================================================
// [TEMPORARY DEV-ONLY ENDPOINT] Database Connectivity Diagnostic
// Target file: backend/app.js (lines 90-145)
// Remove immediately after Render -> Aiven PostgreSQL verification is complete.
// =========================================================================
app.get('/api/db-test', async (req, res) => {
  const rawDbUrl = process.env.DATABASE_URL || config.databaseUrl || '';
  const isPresent = Boolean(rawDbUrl && rawDbUrl.trim().length > 0);
  const cleanTrimmed = rawDbUrl.trim().replace(/^["']|["']$/g, '');
  const isFormatValid = isPresent && /^(postgres|postgresql):\/\//i.test(cleanTrimmed);
  const isPoolInitialized = Boolean(pool);

  console.log('\n--- [DATABASE DIAGNOSTIC AUDIT] ---');
  console.log(`DATABASE_URL_PRESENT=${isPresent}`);
  console.log(`DATABASE_URL_FORMAT_VALID=${isFormatValid}`);
  console.log(`POOL_INITIALIZED=${isPoolInitialized}`);

  if (!pool) {
    console.error('[DB Diagnostic Error] PostgreSQL pool is null.');
    if (!isPresent) {
      console.error('[DB Diagnostic Root Cause] DATABASE_URL is missing from Render process.env.');
    }
    console.log('------------------------------------\n');
    return res.status(500).json({
      success: false,
      database: 'disconnected'
    });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() AS server_time');
      const serverTime = result.rows[0]?.server_time;
      console.log(`[DB Diagnostic Success] Connected to PostgreSQL. Server time: ${serverTime}`);
      console.log('------------------------------------\n');
      return res.status(200).json({
        success: true,
        database: 'connected',
        server_time: serverTime ? new Date(serverTime).toISOString() : new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (err) {
    const sanitizedMsg = (err.message || '').replace(/postgres(ql)?:\/\/[^\s]+/gi, '[REDACTED_URL]');
    console.error('[DB Diagnostic Failure]');
    console.error(`Error Name: ${err.name || 'Error'}`);
    console.error(`Error Code: ${err.code || 'N/A'}`);
    console.error(`Sanitized Message: ${sanitizedMsg}`);
    console.log('------------------------------------\n');
    return res.status(500).json({
      success: false,
      database: 'disconnected'
    });
  }
});

console.log('Registering routes...');
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
