import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Parses Bearer JWT from Authorization header and sets req.user.
 * Logs authentication verification status and allows anonymous requests to pass through gracefully.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      console.log(`[Auth Middleware] Authenticated user: ${decoded.email}`);
    } catch (err) {
      console.warn(`[Auth Middleware Warning] JWT verification failed: ${err.message}`);
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

export default requireAuth;
