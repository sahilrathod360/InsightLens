import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { config } from '../config/env.js';

export function getInitials(name) {
  if (!name) return 'SR';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export const register = async (req, res, next) => {
  try {
    const { email, password, name, firstName, lastName } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const fullName = (name || `${firstName || ''} ${lastName || ''}`).trim();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        data: null
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
        data: null
      });
    }

    if (!pool) {
      // Fallback if database is unavailable
      const initials = getInitials(fullName || 'User');
      return res.status(200).json({
        success: true,
        message: 'User registered (local session)',
        data: {
          user: { email: cleanEmail, name: fullName || cleanEmail, initials, role: 'Researcher' },
          token: jwt.sign({ email: cleanEmail }, config.jwtSecret, { expiresIn: '7d' })
        }
      });
    }

    // Check for existing user
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please Sign In.',
        data: null
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = getInitials(fullName || cleanEmail);

    const insertUser = await pool.query(
      `INSERT INTO users (email, password_hash, name, initials, role)
       VALUES ($1, $2, $3, $4, 'Researcher')
       RETURNING id, email, name, initials, role, created_at`,
      [cleanEmail, hashedPassword, fullName || cleanEmail, initials]
    );

    const newUser = insertUser.rows[0];

    // Initialize default preferences
    await pool.query(
      `INSERT INTO user_preferences (user_email) VALUES ($1) ON CONFLICT (user_email) DO NOTHING`,
      [cleanEmail]
    ).catch(() => {});

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: `Welcome, ${newUser.name}! Account registered successfully.`,
      data: {
        user: newUser,
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
        data: null
      });
    }

    if (!pool) {
      return res.status(200).json({
        success: true,
        message: 'Sign in successful (local session)',
        data: {
          user: { email: cleanEmail, name: cleanEmail, initials: getInitials(cleanEmail), role: 'Researcher' },
          token: jwt.sign({ email: cleanEmail }, config.jwtSecret, { expiresIn: '7d' })
        }
      });
    }

    const userRes = await pool.query(
      'SELECT id, email, password_hash, name, initials, role, avatar FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null
      });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null
      });
    }

    await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      role: user.role,
      avatar: user.avatar
    };

    return res.status(200).json({
      success: true,
      message: 'Sign in successful.',
      data: {
        user: safeUser,
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
    data: null
  });
};

export const getMe = async (req, res, next) => {
  try {
    const userEmail = req.user?.email || req.query.email;
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        data: null
      });
    }

    if (!pool) {
      return res.status(200).json({
        success: true,
        data: { email: userEmail, name: userEmail, initials: getInitials(userEmail), role: 'Researcher' }
      });
    }

    const userRes = await pool.query(
      'SELECT id, email, name, initials, role, avatar, created_at FROM users WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: userRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
