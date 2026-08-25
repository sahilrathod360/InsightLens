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

// Phase 6: Protect against Oversized Payload Injection (10 MB Ceiling)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend foundation is running successfully.',
    data: null,
    timestamp: new Date().toISOString()
  });
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
