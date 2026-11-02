import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL Connection Pool for Aiven PostgreSQL / Production Database.
 * Securely uses process.env.DATABASE_URL.
 *
 * Aiven PostgreSQL mandates SSL encryption.
 * We strip any ?sslmode=... or &sslmode=... from the connection URI so the
 * explicit certificate-validation policy below cannot be overridden by the URI.
 */
let pool = null;

const rawDbUrl = (process.env.DATABASE_URL || config.databaseUrl || '').trim().replace(/^["']|["']$/g, '');

if (rawDbUrl) {
  // Strip sslmode from the URI so it cannot override the explicit SSL policy.
  const cleanDbUrl = rawDbUrl
    .replace(/([?&])sslmode=[^&]*(&?)/gi, (match, prefix, suffix) => {
      return prefix === '?' && suffix === '&' ? '?' : '';
    })
    .replace(/[?&]$/, '');

  const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 5;
  const rawCa = (process.env.DATABASE_CA_CERT || process.env.PGSSLROOTCERT || '')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
  const ca = rawCa && !rawCa.includes('BEGIN CERTIFICATE')
    ? Buffer.from(rawCa, 'base64').toString('utf8').trim()
    : rawCa;
  const rejectUnauthorized = process.env.NODE_ENV === 'production'
    ? true
    : process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

  pool = new Pool({
    connectionString: cleanDbUrl,
    ssl: {
      rejectUnauthorized,
      ...(ca ? { ca } : {})
    },
    max: poolMax,
    idleTimeoutMillis: 10000,
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

export { pool };
export default pool;
