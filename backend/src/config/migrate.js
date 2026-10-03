import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Automatically initializes and verifies database schema upon server startup.
 * Safe for multiple executions (idempotent CREATE TABLE IF NOT EXISTS & safe migration).
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

      // Additive columns for existing deployments
      await client.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS thumbnail_data_url TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR(150)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS institution VARCHAR(200)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);

      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`);
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
      await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{}'::jsonb`);

      // 1. Backfill user_profiles.user_id from users.id
      await client.query(`
        UPDATE user_profiles p
        SET user_id = u.id
        FROM users u
        WHERE LOWER(u.email) = LOWER(p.user_email) AND p.user_id IS NULL;
      `);

      // 2. Safe consolidation: Migrate user_preferences & user_ui_preferences into user_profiles.ui_preferences
      try {
        await client.query(`
          UPDATE user_profiles p
          SET ui_preferences = COALESCE(p.ui_preferences, '{}'::jsonb) || jsonb_build_object(
            'theme', up.theme,
            'provider', up.provider,
            'model', up.model,
            'autoModelFallback', up.auto_model_fallback,
            'compactMode', up.compact_mode,
            'fontSize', up.font_size,
            'animationsOn', up.animations_on,
            'writingStyle', up.writing_style,
            'researchLength', up.research_length,
            'citationStyle', up.citation_style,
            'language', up.language,
            'exportFormat', up.export_format,
            'autoSaveReports', up.auto_save_reports
          )
          FROM user_preferences up
          WHERE LOWER(up.user_email) = LOWER(p.user_email);
        `);
      } catch (e) {
        // user_preferences table might not exist
      }

      try {
        await client.query(`
          UPDATE user_profiles p
          SET ui_preferences = COALESCE(p.ui_preferences, '{}'::jsonb) || jsonb_build_object(
            'themeSlug', uui.theme_slug,
            'typographySlug', uui.typography_slug,
            'layoutSlug', uui.layout_slug,
            'activeModes', uui.active_modes,
            'customPreferences', uui.preferences_json
          )
          FROM user_ui_preferences uui
          WHERE LOWER(uui.user_email) = LOWER(p.user_email);
        `);
      } catch (e) {
        // user_ui_preferences table might not exist
      }

      // 3. Drop legacy redundant tables after safe migration
      await client.query(`DROP TABLE IF EXISTS user_preferences CASCADE`);
      await client.query(`DROP TABLE IF EXISTS user_ui_preferences CASCADE`);
      await client.query(`DROP TABLE IF EXISTS app_metrics CASCADE`);

      // 4. Verification Indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_timestamp ON reports(user_email, timestamp DESC)`);

      await client.query('COMMIT');
      console.log('[Database Migration] PostgreSQL tables & indexes consolidated successfully.');

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
