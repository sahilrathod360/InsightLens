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
import { requireAuth } from './src/middleware/auth.js';
import pool from './src/config/db.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
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

// Unthrottled Health Check Routes (Must be before rate limiters for monitoring reliability)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Health Check for Frontend & Monitoring (Checks Server + PostgreSQL + Auth Readiness)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        dbStatus = 'connected';
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[Health Check DB Notice]', err.message);
      dbStatus = 'error';
    }
  }

  const isHealthy = dbStatus === 'connected';
  const isAuthHealthy = Boolean(config.isJwtConfigured && config.jwtSecret);
  const isFullyReady = isHealthy && isAuthHealthy;
  const httpStatus = isHealthy ? 200 : 503;

  const issues = [];
  if (!isHealthy) issues.push('database is unavailable or not configured');
  if (!isAuthHealthy) issues.push('JWT_SECRET is missing or invalid in production');

  res.status(httpStatus).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    database: dbStatus,
    auth: isAuthHealthy ? 'configured' : 'unconfigured',
    message: isHealthy ? 'InsightLens Backend is healthy.' : `InsightLens Backend degraded: ${issues.join('; ')}.`,
    timestamp: new Date().toISOString()
  });
});

// Dedicated Rate Limiters (Abuse protection with reasonable limits for college project)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    data: null,
    errors: ['Rate limit exceeded'],
    timestamp: new Date().toISOString()
  }
});

const analyzeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.ANALYZE_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    // Rate limit per authenticated user if available, else IP
    return req.user?.email ? `user_${req.user.email}` : (req.ip || 'unknown_ip');
  },
  message: {
    success: false,
    message: 'Analysis rate limit reached. Please wait a few moments before starting another visual research task.',
    data: null,
    errors: ['Analysis rate limit exceeded'],
    timestamp: new Date().toISOString()
  }
});

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
    data: null,
    errors: ['API rate limit exceeded'],
    timestamp: new Date().toISOString()
  }
});

// Apply General Rate Limiter to API routes (excluding already-matched health routes)
app.use('/api', generalApiLimiter);

console.log('Registering routes...');

// Public Auth Routes (With dedicated brute-force protection)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// Protected Routes (Strictly Enforced JWT Authentication & User Scoping)
app.use('/api/analyze', requireAuth, analyzeLimiter, analysisRoutes);
app.use('/api/report', requireAuth, reportRoutes);
app.use('/api/archive', requireAuth, archiveRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/history', requireAuth, historyRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
