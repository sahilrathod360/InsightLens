import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL Connection Pool for Aiven PostgreSQL / Production Database.
 * Securely uses process.env.DATABASE_URL.
 * Aiven PostgreSQL mandates SSL encryption; configured with rejectUnauthorized: false for cloud compatibility.
 */
let pool = null;

if (config.databaseUrl) {
  pool = new Pool({
    connectionString: config.databaseUrl,
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
