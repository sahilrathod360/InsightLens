import pool from '../config/db.js';

const AUDIT_TOKEN = process.env.AUDIT_TOKEN;

function verifyAuditAccess(req, res) {
  if (!AUDIT_TOKEN) {
    res.status(403).json({ success: false, error: 'Audit functionality is disabled.' });
    return false;
  }
  const token = req.headers['x-audit-token'];
  if (!token || token !== AUDIT_TOKEN) {
    res.status(403).json({ success: false, error: 'Unauthorized audit access.' });
    return false;
  }
  return true;
}

export const getDbInventory = async (req, res) => {
  if (!verifyAuditAccess(req, res)) return;
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database pool is not configured.' });
  }

  try {
    const client = await pool.connect();
    try {
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
        ORDER BY table_name ASC;
      `);

      const tables = [];
      for (const row of tablesRes.rows) {
        const tbl = row.table_name;
        try {
          const countRes = await client.query(`SELECT COUNT(*) AS cnt FROM "${tbl}"`);
          tables.push({
            name: tbl,
            rowCount: parseInt(countRes.rows[0].cnt, 10)
          });
        } catch (cntErr) {
          tables.push({
            name: tbl,
            rowCount: -1,
            error: cntErr.message
          });
        }
      }

      res.status(200).json({
        success: true,
        database: 'connected',
        totalTables: tables.length,
        tables,
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const exportTableBackup = async (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Database backup endpoint has been permanently disabled for production security.'
  });
};
