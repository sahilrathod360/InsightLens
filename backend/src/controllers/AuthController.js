import bcrypt from 'bcryptjs';
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

/**
 * Validates avatar base64 data URLs to ensure safe image types & reasonable size (< 4MB)
 */
function validateAvatar(avatarStr) {
  if (!avatarStr || typeof avatarStr !== 'string') return null;
  const trimmed = avatarStr.trim();
  if (!trimmed.startsWith('data:image/')) return null;
  const mimeMatch = trimmed.match(/^data:(image\/(jpeg|jpg|png|webp|gif));base64,/i);
  if (!mimeMatch) return null;
  // Check approx size (base64 length * 0.75 <= 4MB)
  if (trimmed.length > 5.5 * 1024 * 1024) return null;
  return trimmed;
}

export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, name, username, avatar } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanFirstName = (firstName || '').trim();
    const cleanLastName = (lastName || '').trim();
    const fullName = (name || `${cleanFirstName} ${cleanLastName}`).trim();
    
    // Auto-derive or clean username
    let cleanUsername = (username || '').trim().toLowerCase().replace(/^@+/, '');
    if (!cleanUsername) {
      cleanUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '_');
    }

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        data: null
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
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

    if (!config.isJwtConfigured || !config.jwtSecret) {
      console.error('[AuthController Error] Cannot process registration: JWT_SECRET is unconfigured in production.');
      return res.status(503).json({
        success: false,
        message: 'Authentication service is unavailable: secure token signing is not configured.',
        data: null
      });
    }

    if (!pool) {
      console.error('[AuthController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.',
        data: null
      });
    }

    // Check for existing user by email
    const checkEmail = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (checkEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please Sign In.',
        data: null
      });
    }

    // Auto-heal schema if running before startup migration completes
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_email VARCHAR(255) PRIMARY KEY,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          username VARCHAR(100),
          role VARCHAR(100) DEFAULT 'Researcher',
          field VARCHAR(150),
          institution VARCHAR(200),
          bio TEXT,
          avatar TEXT,
          primary_uses JSONB DEFAULT '[]'::jsonb,
          interests JSONB DEFAULT '[]'::jsonb,
          visual_types JSONB DEFAULT '[]'::jsonb,
          analysis_depth VARCHAR(50) DEFAULT 'balanced',
          presentation_style JSONB DEFAULT '["balanced", "evidence-first"]'::jsonb,
          evidence_preference VARCHAR(50) DEFAULT 'strict',
          technical_level VARCHAR(50) DEFAULT 'advanced',
          onboarding_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (e) {
      // Ignore if table/columns already present or in concurrent migration
    }

    // Check if username already taken by another user
    try {
      const checkUsername = await pool.query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanUsername]);
      if (checkUsername.rows.length > 0) {
        cleanUsername = `${cleanUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }
    } catch (e) {}

    const validatedAvatar = validateAvatar(avatar);
    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = getInitials(fullName || cleanEmail);

    let insertUser;
    try {
      insertUser = await pool.query(
        `INSERT INTO users (email, password_hash, name, first_name, last_name, username, initials, role, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Researcher', $8)
         RETURNING id, email, name, first_name, last_name, username, initials, role, avatar, created_at`,
        [cleanEmail, hashedPassword, fullName || cleanEmail, cleanFirstName || null, cleanLastName || null, cleanUsername, initials, validatedAvatar]
      );
    } catch (insertErr) {
      // Fallback for minimal legacy schema
      insertUser = await pool.query(
        `INSERT INTO users (email, password_hash, name, initials, role)
         VALUES ($1, $2, $3, $4, 'Researcher')
         RETURNING id, email, name, initials, role, created_at`,
        [cleanEmail, hashedPassword, fullName || cleanEmail, initials]
      );
    }

    const newUser = insertUser.rows[0];

    // Initialize user_profiles with onboarding_completed = false
    try {
      await pool.query(
        `INSERT INTO user_profiles (user_email, first_name, last_name, username, role, avatar, onboarding_completed)
         VALUES ($1, $2, $3, $4, 'Researcher', $5, FALSE)
         ON CONFLICT (user_email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           username = EXCLUDED.username,
           avatar = COALESCE(EXCLUDED.avatar, user_profiles.avatar),
           updated_at = NOW()`,
        [cleanEmail, cleanFirstName || null, cleanLastName || null, cleanUsername, validatedAvatar]
      );
    } catch (pErr) {
      console.warn('[AuthController] Notice: user_profiles init skipped:', pErr.message);
    }

    // Initialize default preferences in PostgreSQL
    try {
      await pool.query(
        `INSERT INTO user_preferences (user_email) VALUES ($1) ON CONFLICT (user_email) DO NOTHING`,
        [cleanEmail]
      );
    } catch (prefErr) {}

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, username: newUser.username || cleanUsername },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.cookie('insightlens_session', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(201).json({
      success: true,
      message: `Welcome, ${cleanFirstName || newUser.name}! Account registered successfully.`,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          firstName: cleanFirstName || newUser.first_name || (newUser.name ? newUser.name.split(' ')[0] : ''),
          lastName: cleanLastName || newUser.last_name || '',
          username: newUser.username,
          initials: newUser.initials,
          role: newUser.role,
          avatar: newUser.avatar,
          onboarding_completed: false
        },
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email/username and password.',
        data: null
      });
    }

    if (!config.isJwtConfigured || !config.jwtSecret) {
      console.error('[AuthController Error] Cannot process login: JWT_SECRET is unconfigured in production.');
      return res.status(503).json({
        success: false,
        message: 'Authentication service is unavailable: secure token signing is not configured.',
        data: null
      });
    }

    if (!pool) {
      console.error('[AuthController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database authentication failed: Database connection pool is unavailable.',
        data: null
      });
    }

    // Match by email or username
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.first_name, u.last_name, u.username, u.initials, u.role, u.avatar, u.created_at,
              p.onboarding_completed, p.bio, p.institution, p.field, p.primary_uses, p.interests, p.visual_types, p.analysis_depth, p.presentation_style, p.evidence_preference
       FROM users u
       LEFT JOIN user_profiles p ON p.user_email = u.email
       WHERE LOWER(u.email) = $1 OR LOWER(u.username) = $1`,
      [identifier]
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
      { id: user.id, email: user.email, name: user.name, username: user.username },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.cookie('insightlens_session', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    const firstName = user.first_name || (user.name ? user.name.split(' ')[0] : 'Researcher');

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName,
      lastName: user.last_name || '',
      username: user.username || user.email.split('@')[0],
      initials: user.initials || getInitials(user.name),
      role: user.role || 'Researcher',
      avatar: user.avatar,
      onboarding_completed: !!user.onboarding_completed,
      bio: user.bio,
      institution: user.institution,
      field: user.field,
      profile: {
        primary_uses: user.primary_uses || [],
        interests: user.interests || [],
        visual_types: user.visual_types || [],
        analysis_depth: user.analysis_depth || 'balanced',
        presentation_style: user.presentation_style || ['balanced', 'evidence-first'],
        evidence_preference: user.evidence_preference || 'strict'
      }
    };

    return res.status(200).json({
      success: true,
      message: `Sign in successful. Welcome, ${firstName}!`,
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
  res.clearCookie('insightlens_session', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/'
  });
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
    data: null
  });
};

export const getMe = async (req, res, next) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database query failed: Database connection pool is unavailable.',
        data: null
      });
    }

    const userRes = await pool.query(
      `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.username, u.initials, u.role, u.avatar, u.created_at,
              p.onboarding_completed, p.bio, p.institution, p.field, p.primary_uses, p.interests, p.visual_types,
              p.analysis_depth, p.presentation_style, p.evidence_preference, p.technical_level
       FROM users u
       LEFT JOIN user_profiles p ON p.user_email = u.email
       WHERE LOWER(u.email) = $1`,
      [userEmail.toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        data: null
      });
    }

    const user = userRes.rows[0];
    const firstName = user.first_name || (user.name ? user.name.split(' ')[0] : 'Researcher');

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName,
        lastName: user.last_name || '',
        username: user.username || user.email.split('@')[0],
        initials: user.initials || getInitials(user.name),
        role: user.role || 'Researcher',
        avatar: user.avatar,
        created_at: user.created_at,
        onboarding_completed: !!user.onboarding_completed,
        bio: user.bio || '',
        institution: user.institution || '',
        field: user.field || '',
        profile: {
          primary_uses: user.primary_uses || [],
          interests: user.interests || [],
          visual_types: user.visual_types || [],
          analysis_depth: user.analysis_depth || 'balanced',
          presentation_style: user.presentation_style || ['balanced', 'evidence-first'],
          evidence_preference: user.evidence_preference || 'strict',
          technical_level: user.technical_level || 'advanced'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Authentication required.', data: null });
    }

    const {
      firstName,
      lastName,
      name,
      username,
      avatar,
      bio,
      institution,
      field,
      role,
      primaryUses,
      interests,
      visualTypes,
      analysisDepth,
      presentationStyle,
      evidencePreference,
      technicalLevel
    } = req.body;

    const cleanFirstName = firstName !== undefined ? String(firstName).trim() : null;
    const cleanLastName = lastName !== undefined ? String(lastName).trim() : null;
    const fullName = (name || `${cleanFirstName || ''} ${cleanLastName || ''}`).trim();
    const cleanUsername = username ? String(username).trim().toLowerCase().replace(/^@+/, '') : null;
    const validatedAvatar = avatar !== undefined ? validateAvatar(avatar) : undefined;
    const initials = fullName ? getInitials(fullName) : undefined;

    // 1. Update users table
    const userUpdates = [];
    const userValues = [];
    let pIdx = 1;

    if (fullName) {
      userUpdates.push(`name = $${pIdx++}`);
      userValues.push(fullName);
      userUpdates.push(`initials = $${pIdx++}`);
      userValues.push(initials);
    }
    if (cleanFirstName !== null) {
      userUpdates.push(`first_name = $${pIdx++}`);
      userValues.push(cleanFirstName);
    }
    if (cleanLastName !== null) {
      userUpdates.push(`last_name = $${pIdx++}`);
      userValues.push(cleanLastName);
    }
    if (cleanUsername) {
      userUpdates.push(`username = $${pIdx++}`);
      userValues.push(cleanUsername);
    }
    if (validatedAvatar !== undefined) {
      userUpdates.push(`avatar = $${pIdx++}`);
      userValues.push(validatedAvatar);
    }
    if (role) {
      userUpdates.push(`role = $${pIdx++}`);
      userValues.push(String(role).trim());
    }
    if (institution !== undefined) {
      userUpdates.push(`institution = $${pIdx++}`);
      userValues.push(String(institution).trim());
    }
    if (field !== undefined) {
      userUpdates.push(`field = $${pIdx++}`);
      userValues.push(String(field).trim());
    }
    if (bio !== undefined) {
      userUpdates.push(`bio = $${pIdx++}`);
      userValues.push(String(bio).trim());
    }

    userUpdates.push(`updated_at = NOW()`);
    userValues.push(email.toLowerCase());

    if (userUpdates.length > 1) {
      await pool.query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE LOWER(email) = $${pIdx}`,
        userValues
      );
    }

    // 2. Upsert user_profiles table with personalization
    const profileRes = await pool.query(
      `INSERT INTO user_profiles (
        user_email, first_name, last_name, username, role, field, institution, bio, avatar,
        primary_uses, interests, visual_types, analysis_depth, presentation_style,
        evidence_preference, technical_level, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (user_email) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        username = COALESCE(EXCLUDED.username, user_profiles.username),
        role = COALESCE(EXCLUDED.role, user_profiles.role),
        field = COALESCE(EXCLUDED.field, user_profiles.field),
        institution = COALESCE(EXCLUDED.institution, user_profiles.institution),
        bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
        avatar = COALESCE(EXCLUDED.avatar, user_profiles.avatar),
        primary_uses = COALESCE(EXCLUDED.primary_uses, user_profiles.primary_uses),
        interests = COALESCE(EXCLUDED.interests, user_profiles.interests),
        visual_types = COALESCE(EXCLUDED.visual_types, user_profiles.visual_types),
        analysis_depth = COALESCE(EXCLUDED.analysis_depth, user_profiles.analysis_depth),
        presentation_style = COALESCE(EXCLUDED.presentation_style, user_profiles.presentation_style),
        evidence_preference = COALESCE(EXCLUDED.evidence_preference, user_profiles.evidence_preference),
        technical_level = COALESCE(EXCLUDED.technical_level, user_profiles.technical_level),
        updated_at = NOW()
      RETURNING *`,
      [
        email.toLowerCase(),
        cleanFirstName || null,
        cleanLastName || null,
        cleanUsername || null,
        role ? String(role).trim() : 'Researcher',
        field !== undefined ? String(field).trim() : null,
        institution !== undefined ? String(institution).trim() : null,
        bio !== undefined ? String(bio).trim() : null,
        validatedAvatar !== undefined ? validatedAvatar : null,
        JSON.stringify(Array.isArray(primaryUses) ? primaryUses : []),
        JSON.stringify(Array.isArray(interests) ? interests : []),
        JSON.stringify(Array.isArray(visualTypes) ? visualTypes : []),
        analysisDepth ? String(analysisDepth).trim() : 'balanced',
        JSON.stringify(Array.isArray(presentationStyle) ? presentationStyle : ['balanced', 'evidence-first']),
        evidencePreference ? String(evidencePreference).trim() : 'strict',
        technicalLevel ? String(technicalLevel).trim() : 'advanced'
      ]
    );

    // Fetch updated user
    const updatedUserRes = await pool.query(
      `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.username, u.initials, u.role, u.avatar, u.created_at,
              p.onboarding_completed, p.bio, p.institution, p.field, p.primary_uses, p.interests, p.visual_types,
              p.analysis_depth, p.presentation_style, p.evidence_preference, p.technical_level
       FROM users u
       LEFT JOIN user_profiles p ON p.user_email = u.email
       WHERE LOWER(u.email) = $1`,
      [email.toLowerCase()]
    );

    const user = updatedUserRes.rows[0];
    const resolvedFirst = user.first_name || (user.name ? user.name.split(' ')[0] : 'Researcher');

    return res.status(200).json({
      success: true,
      message: 'Profile and personalization preferences updated successfully.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: resolvedFirst,
        lastName: user.last_name || '',
        username: user.username || user.email.split('@')[0],
        initials: user.initials,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        institution: user.institution,
        field: user.field,
        onboarding_completed: !!user.onboarding_completed,
        profile: {
          primary_uses: user.primary_uses || [],
          interests: user.interests || [],
          visual_types: user.visual_types || [],
          analysis_depth: user.analysis_depth || 'balanced',
          presentation_style: user.presentation_style || ['balanced', 'evidence-first'],
          evidence_preference: user.evidence_preference || 'strict',
          technical_level: user.technical_level || 'advanced'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const saveOnboarding = async (req, res, next) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Authentication required.', data: null });
    }

    const {
      primaryUses = [],
      interests = [],
      visualTypes = [],
      analysisDepth = 'balanced',
      presentationStyle = ['balanced', 'evidence-first'],
      evidencePreference = 'strict',
      role = 'Researcher',
      field = '',
      institution = '',
      bio = ''
    } = req.body;

    const query = `
      INSERT INTO user_profiles (
        user_email, primary_uses, interests, visual_types, analysis_depth,
        presentation_style, evidence_preference, role, field, institution, bio,
        onboarding_completed, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW())
      ON CONFLICT (user_email) DO UPDATE SET
        primary_uses = EXCLUDED.primary_uses,
        interests = EXCLUDED.interests,
        visual_types = EXCLUDED.visual_types,
        analysis_depth = EXCLUDED.analysis_depth,
        presentation_style = EXCLUDED.presentation_style,
        evidence_preference = EXCLUDED.evidence_preference,
        role = COALESCE(EXCLUDED.role, user_profiles.role),
        field = COALESCE(EXCLUDED.field, user_profiles.field),
        institution = COALESCE(EXCLUDED.institution, user_profiles.institution),
        bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
        onboarding_completed = TRUE,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      email.toLowerCase(),
      JSON.stringify(Array.isArray(primaryUses) ? primaryUses : []),
      JSON.stringify(Array.isArray(interests) ? interests : []),
      JSON.stringify(Array.isArray(visualTypes) ? visualTypes : []),
      String(analysisDepth || 'balanced'),
      JSON.stringify(Array.isArray(presentationStyle) ? presentationStyle : ['balanced', 'evidence-first']),
      String(evidencePreference || 'strict'),
      String(role || 'Researcher'),
      String(field || ''),
      String(institution || ''),
      String(bio || '')
    ];

    const result = await pool.query(query, values);

    // Also update role/field in users table
    if (role || field || institution || bio) {
      await pool.query(
        `UPDATE users SET role = COALESCE($1, role), field = COALESCE($2, field), institution = COALESCE($3, institution), bio = COALESCE($4, bio), updated_at = NOW()
         WHERE LOWER(email) = $5`,
        [role || null, field || null, institution || null, bio || null, email.toLowerCase()]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Onboarding personalization saved successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Authentication required.', data: null });
    }

    const cleanEmail = email.toLowerCase();

    // 1. Total reports and saved favorite reports
    const reportStats = await pool.query(
      `SELECT COUNT(*)::int as total_reports,
              COUNT(CASE WHEN favorite = TRUE THEN 1 END)::int as saved_reports,
              MAX(timestamp) as last_analysis_timestamp
       FROM reports
       WHERE LOWER(user_email) = $1`,
      [cleanEmail]
    );

    // 2. Latest report details
    const lastReport = await pool.query(
      `SELECT title, subject, category, date_formatted, timestamp
       FROM reports
       WHERE LOWER(user_email) = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [cleanEmail]
    );

    // 3. Comparisons count
    const compStats = await pool.query(
      `SELECT COUNT(*)::int as total_comparisons
       FROM visual_comparisons
       WHERE LOWER(user_email) = $1`,
      [cleanEmail]
    );

    // 4. Artifacts count
    const artifactStats = await pool.query(
      `SELECT COUNT(*)::int as total_artifacts
       FROM visual_artifacts
       WHERE LOWER(user_email) = $1`,
      [cleanEmail]
    );

    // 5. User creation date
    const userMeta = await pool.query(
      `SELECT created_at FROM users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    // 6. Recent activity timeline
    const activityLogs = await pool.query(
      `SELECT id, activity_type, text, timestamp, created_at
       FROM activity_logs
       WHERE LOWER(user_email) = $1
       ORDER BY timestamp DESC
       LIMIT 8`,
      [cleanEmail]
    );

    const totalReports = reportStats.rows[0]?.total_reports || 0;
    const savedReports = reportStats.rows[0]?.saved_reports || 0;
    const totalComparisons = compStats.rows[0]?.total_comparisons || 0;
    const totalArtifacts = artifactStats.rows[0]?.total_artifacts || 0;
    const totalAnalyses = totalReports + totalArtifacts;

    return res.status(200).json({
      success: true,
      data: {
        totalReports,
        totalAnalyses,
        totalComparisons,
        savedReports,
        lastAnalysis: lastReport.rows[0] ? {
          title: lastReport.rows[0].title,
          subject: lastReport.rows[0].subject,
          category: lastReport.rows[0].category,
          date: lastReport.rows[0].date_formatted,
          timestamp: lastReport.rows[0].timestamp
        } : null,
        memberSince: userMeta.rows[0]?.created_at || new Date().toISOString(),
        recentActivity: activityLogs.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const email = req.user?.email;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!email || !currentPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Current password and a new password of at least 8 characters are required.',
        data: null
      });
    }

    const userResult = await pool.query('SELECT password_hash FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
    if (!userResult.rows[0] || !(await bcrypt.compare(currentPassword, userResult.rows[0].password_hash))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.', data: null });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2', [passwordHash, email.toLowerCase()]);
    return res.status(200).json({ success: true, message: 'Password updated successfully.', data: null });
  } catch (err) {
    next(err);
  }
};
