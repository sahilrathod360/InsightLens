import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Strict Authentication Middleware.
 * Enforces valid Bearer JWT in the Authorization header.
 * Rejects unauthenticated or invalid requests with HTTP 401.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const cookieToken = req.cookies?.insightlens_session;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid session token.',
      data: null
    });
  }

  if (!config.isJwtConfigured || !config.jwtSecret) {
    console.error('[Auth Middleware Error] Rejecting request: JWT verification secret is not configured.');
    return res.status(503).json({
      success: false,
      message: 'Authentication service is unavailable: token verification is not configured.',
      data: null
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token payload.',
        data: null
      });
    }

    req.user = {
      ...decoded,
      email: decoded.email.toLowerCase().trim()
    };
    next();
  } catch (err) {
    console.warn(`[Auth Middleware] JWT verification failed: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please sign in again.',
      data: null
    });
  }
};

/**
 * Optional Authentication Middleware.
 * Decodes a valid token when present, but never invents a shared guest identity.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.insightlens_session;

  if ((authHeader && authHeader.startsWith('Bearer ')) || cookieToken) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;
    if (token && config.isJwtConfigured && config.jwtSecret) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded && decoded.email) {
          req.user = {
            ...decoded,
            email: decoded.email.toLowerCase().trim()
          };
          return next();
        }
      } catch (err) {
        // Token invalid/expired: fall through to guest
      }
    }
  }

  next();
};

export default requireAuth;
