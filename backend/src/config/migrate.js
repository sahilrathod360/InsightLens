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
      // 1. Execute base schema idempotently
      await client.query(schemaSql);

      // 2. Additive columns for existing deployments (individual safe executions)
      const additiveQueries = [
        `ALTER TABLE reports ADD COLUMN IF NOT EXISTS thumbnail_data_url TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR(150)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS institution VARCHAR(200)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100)`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Researcher'`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS field VARCHAR(150)`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS institution VARCHAR(200)`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar TEXT`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_uses JSONB DEFAULT '[]'::jsonb`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS visual_types JSONB DEFAULT '[]'::jsonb`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS analysis_depth VARCHAR(50) DEFAULT 'balanced'`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS presentation_style JSONB DEFAULT '["balanced", "evidence-first"]'::jsonb`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS evidence_preference VARCHAR(50) DEFAULT 'strict'`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{}'::jsonb`
      ];

      for (const q of additiveQueries) {
        try {
          await client.query(q);
        } catch (colErr) {
          console.warn('[Database Migration] Column migration notice:', colErr.message);
        }
      }

      // 3. Backfill user_profiles.user_id from users.id
      try {
        await client.query(`
          UPDATE user_profiles p
          SET user_id = u.id
          FROM users u
          WHERE LOWER(u.email) = LOWER(p.user_email) AND p.user_id IS NULL;
        `);
      } catch (bfErr) {
        console.warn('[Database Migration] User ID backfill notice:', bfErr.message);
      }

      // 4. Safe consolidation: Check table existence first before reading legacy tables
      try {
        const hasPrefs = await client.query("SELECT to_regclass('public.user_preferences') AS tbl");
        if (hasPrefs.rows[0]?.tbl) {
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
        }
      } catch (prefErr) {
        console.warn('[Database Migration] Legacy user_preferences notice:', prefErr.message);
      }

      try {
        const hasUiPrefs = await client.query("SELECT to_regclass('public.user_ui_preferences') AS tbl");
        if (hasUiPrefs.rows[0]?.tbl) {
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
        }
      } catch (uiPrefErr) {
        console.warn('[Database Migration] Legacy user_ui_preferences notice:', uiPrefErr.message);
      }

      // 5. Drop legacy redundant tables safely
      try {
        await client.query(`DROP TABLE IF EXISTS user_preferences CASCADE`);
        await client.query(`DROP TABLE IF EXISTS user_ui_preferences CASCADE`);
        await client.query(`DROP TABLE IF EXISTS app_metrics CASCADE`);
      } catch (dropErr) {
        console.warn('[Database Migration] Drop legacy tables notice:', dropErr.message);
      }

      // 6. Verification Indexes
      const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username)`,
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reports_user_timestamp ON reports(user_email, timestamp DESC)`
      ];

      for (const idxQ of indexQueries) {
        try {
          await client.query(idxQ);
        } catch (idxErr) {
          console.warn('[Database Migration] Index creation notice:', idxErr.message);
        }
      }

      console.log('[Database Migration] PostgreSQL tables & indexes consolidated successfully.');

      // 7. Seed builtin extensions catalog
      try {
        const { default: ExtensionService } = await import('../services/extensions/ExtensionService.js');
        await ExtensionService.seedBuiltinExtensions();
        console.log('[Database Migration] Built-in extensions catalog seeded successfully.');
      } catch (seedErr) {
        console.warn('[Database Migration] Extension seeding warning:', seedErr.message);
      }

      return { initialized: true };
    } catch (queryErr) {
      console.error('[Database Migration Error] Migration issue:', queryErr.message);
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
