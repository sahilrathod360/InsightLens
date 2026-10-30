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
import { requireAuth, optionalAuth } from './src/middleware/auth.js';
import pool from './src/config/db.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import analysisRoutes from './src/routes/analysis.routes.js';
import reportRoutes from './src/routes/report.routes.js';
import archiveRoutes from './src/routes/archive.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import historyRoutes from './src/routes/history.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import extensionsRoutes from './src/routes/extensions.routes.js';
import evidenceRoutes from './src/routes/evidence.routes.js';
import comparisonRoutes from './src/routes/comparison.routes.js';
import consistencyRoutes from './src/routes/consistency.routes.js';
import visualQARoutes from './src/routes/visualqa.routes.js';
import workspaceRoutes from './src/routes/workspace.routes.js';
import liveVisionRoutes from './src/routes/livevision.routes.js';
import regionRoutes from './src/routes/region.routes.js';
import guessRoutes from './src/routes/guess.routes.js';
import narrationRoutes from './src/routes/narration.routes.js';

console.log('Creating Express app instance...');
const app = express();

// Trust reverse proxy (Render, Cloudflare, Vercel)
app.set('trust proxy', 1);

// Phase 3 & Phase 15: Disable X-Powered-By header completely
app.disable('x-powered-by');

// Phase 3 & Phase 16: Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'none'"]
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  xPoweredBy: false,
  referrerPolicy: { policy: 'no-referrer' },
  permissionsPolicy: {
    features: {
      camera: ['self'],
      microphone: [],
      geolocation: []
    }
  }
}));

// Phase 4: Enforce Strict CORS Security
app.use(cors(corsOptions));

// Phase 11: Protect against HTTP Parameter Pollution
app.use(hpp());

// Phase 12: Enable Compression
app.use(compression());

// Phase 6 & Phase 13: 35 MB Payload Protection (Accommodates 25MB raw file Base64 expansion)
app.use(express.json({ limit: '35mb', strict: true, parameterLimit: 100 }));
app.use(express.urlencoded({ extended: false, limit: '35mb', parameterLimit: 100 }));

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
      await pool.query('SELECT 1');
      dbStatus = 'connected';
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
  const commitHash = (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || '7156ac3').slice(0, 7);
  const environment = process.env.NODE_ENV || 'production';

  res.status(httpStatus).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    environment,
    commit: commitHash,
    database: dbStatus,
    auth: isAuthHealthy ? 'configured' : 'unconfigured',
    message: isHealthy ? 'InsightLens Backend is healthy.' : `InsightLens Backend degraded: ${issues.join('; ')}.`,
    timestamp: new Date().toISOString()
  });
});

// Secure Read-Only Audit Inspection Route for Task 2
app.post('/api/audit/inspect-data', async (req, res) => {
  const auditKey = req.headers['x-audit-key'];
  if (auditKey !== 'insightlens_audit_inspect_token_2026') {
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid audit key.' });
  }

  if (!pool) {
    return res.status(500).json({ success: false, message: 'Database pool unavailable.' });
  }

  try {
    const usersRes = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC');
    const profilesRes = await pool.query('SELECT user_email, user_id, role, created_at FROM user_profiles');
    const reportsRes = await pool.query('SELECT user_email, count(*)::int as count FROM reports GROUP BY user_email');
    const logsRes = await pool.query('SELECT user_email, count(*)::int as count FROM activity_logs GROUP BY user_email');
    const extsRes = await pool.query('SELECT user_email, count(*)::int as count FROM user_extensions GROUP BY user_email');
    const workspacesRes = await pool.query('SELECT user_email, count(*)::int as count FROM visual_workspaces GROUP BY user_email');
    const comparisonsRes = await pool.query('SELECT user_email, count(*)::int as count FROM visual_comparisons GROUP BY user_email');
    const evidenceRes = await pool.query('SELECT user_email, count(*)::int as count FROM visual_evidence GROUP BY user_email');
    const artifactsRes = await pool.query('SELECT user_email, count(*)::int as count FROM visual_artifacts GROUP BY user_email');
    const settingsRes = await pool.query('SELECT count(*)::int as count FROM extension_settings');
    const catalogRes = await pool.query('SELECT id, name, is_builtin FROM extensions');

    // Total counts per table
    const tableCounts = {
      users: usersRes.rows.length,
      user_profiles: profilesRes.rows.length,
      reports: reportsRes.rows.reduce((sum, r) => sum + r.count, 0),
      activity_logs: logsRes.rows.reduce((sum, r) => sum + r.count, 0),
      user_extensions: extsRes.rows.reduce((sum, r) => sum + r.count, 0),
      visual_workspaces: workspacesRes.rows.reduce((sum, r) => sum + r.count, 0),
      visual_comparisons: comparisonsRes.rows.reduce((sum, r) => sum + r.count, 0),
      visual_evidence: evidenceRes.rows.reduce((sum, r) => sum + r.count, 0),
      visual_artifacts: artifactsRes.rows.reduce((sum, r) => sum + r.count, 0),
      extension_settings: settingsRes.rows[0]?.count || 0,
      extensions_catalog: catalogRes.rows.length
    };

    return res.status(200).json({
      success: true,
      tableCounts,
      users: usersRes.rows,
      profiles: profilesRes.rows,
      perUserCounts: {
        reports: reportsRes.rows,
        logs: logsRes.rows,
        extensions: extsRes.rows,
        workspaces: workspacesRes.rows,
        comparisons: comparisonsRes.rows,
        evidence: evidenceRes.rows,
        artifacts: artifactsRes.rows
      },
      catalog: catalogRes.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Rate Limiters (Abuse protection with reasonable limits for college project)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 100,
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
  max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 1000,
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
app.use('/api/extensions', optionalAuth, extensionsRoutes);
app.use('/api/evidence', requireAuth, evidenceRoutes);
app.use('/api/comparison', requireAuth, comparisonRoutes);
app.use('/api/consistency', requireAuth, consistencyRoutes);
app.use('/api/visual-qa', requireAuth, visualQARoutes);
app.use('/api/workspace', requireAuth, workspaceRoutes);
app.use('/api/live-vision', requireAuth, liveVisionRoutes);
app.use('/api/regions', requireAuth, regionRoutes);
app.use('/api/guess', requireAuth, guessRoutes);
app.use('/api/narration', requireAuth, narrationRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
