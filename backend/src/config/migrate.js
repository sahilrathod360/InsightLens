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
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_timestamp ON reports(user_email, timestamp DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_app_metrics_user_email ON app_metrics(user_email)`);
      await client.query('COMMIT');
      console.log('[Database Migration] PostgreSQL tables & indexes verified successfully.');
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
