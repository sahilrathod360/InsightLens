import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL Connection Pool for Aiven PostgreSQL / Production Database.
 * Securely uses process.env.DATABASE_URL.
 *
 * Aiven PostgreSQL mandates SSL encryption.
 * We strip any ?sslmode=... or &sslmode=... from the connection URI to prevent
 * pg-connection-string from overriding our explicit rejectUnauthorized: false setting,
 * which resolves the SELF_SIGNED_CERT_IN_CHAIN error on cloud containers.
 */
let pool = null;

const rawDbUrl = (process.env.DATABASE_URL || config.databaseUrl || '').trim().replace(/^["']|["']$/g, '');

if (rawDbUrl) {
  // Strip ?sslmode=... or &sslmode=... from URI cleanly
  const cleanDbUrl = rawDbUrl
    .replace(/([?&])sslmode=[^&]*(&?)/gi, (match, prefix, suffix) => {
      return prefix === '?' && suffix === '&' ? '?' : '';
    })
    .replace(/[?&]$/, '');

  pool = new Pool({
    connectionString: cleanDbUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('[Database Pool Error]', err.message);
  });
}

/**
 * Test database connectivity without leaking credentials.
 */
export async function testDbConnection() {
  if (!pool) {
    return { connected: false, message: 'DATABASE_URL environment variable is not set.' };
  }
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time');
      return {
        connected: true,
        timestamp: res.rows[0].current_time
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Database Connection Error]', err.message);
    return {
      connected: false,
      error: err.message
    };
  }
}

export default pool;
