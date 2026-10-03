import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Automatically initializes and verifies database schema upon server startup.
 * Safe for multiple executions (idempotent CREATE TABLE IF NOT EXISTS).
 */
export async function initDb() {
  if (!pool) {
    console.log('[Database Migration] Skipped schema initialization (DATABASE_URL not configured).');
    return { initialized: false, message: 'DATABASE_URL not configured' };
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(schemaSql);
      // Backward-compatible additive migrations for existing deployed tables.
      await client.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS thumbnail_data_url TEXT`);
      await client.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'auto'`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR(150)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS institution VARCHAR(200)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);

      await client.query(`
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
        )
      `);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100)`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Researcher'`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS field VARCHAR(150)`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS institution VARCHAR(200)`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar TEXT`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_uses JSONB DEFAULT '[]'::jsonb`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS visual_types JSONB DEFAULT '[]'::jsonb`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS analysis_depth VARCHAR(50) DEFAULT 'balanced'`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS presentation_style JSONB DEFAULT '["balanced", "evidence-first"]'::jsonb`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS evidence_preference VARCHAR(50) DEFAULT 'strict'`);
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_timestamp ON reports(user_email, timestamp DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_app_metrics_user_email ON app_metrics(user_email)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username)`);
      await client.query('COMMIT');
      console.log('[Database Migration] PostgreSQL tables & indexes verified successfully.');

      // Seed builtin extensions and catalog
      try {
        const { default: ExtensionService } = await import('../services/extensions/ExtensionService.js');
        await ExtensionService.seedBuiltinExtensions();
        console.log('[Database Migration] Built-in extensions catalog seeded successfully.');
      } catch (seedErr) {
        console.warn('[Database Migration] Extension seeding warning:', seedErr.message);
      }

      return { initialized: true };
    } catch (queryErr) {
      await client.query('ROLLBACK');
      console.error('[Database Migration Error] Failed executing schema.sql:', queryErr.message);
      return { initialized: false, error: queryErr.message };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Database Migration Error]', err.message);
    return { initialized: false, error: err.message };
  }
}

export default initDb;
