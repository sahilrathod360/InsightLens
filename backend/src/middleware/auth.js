import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Strict Authentication Middleware.
 * Enforces valid Bearer JWT in the Authorization header.
 * Rejects unauthenticated or invalid requests with HTTP 401.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid session token.',
      data: null
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No session token provided in Bearer header.',
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

export default requireAuth;
