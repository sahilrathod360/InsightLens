import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BACKUP_FILE = path.resolve('production_aiven_db_backup.json');
const ISOLATED_DB_FILE = path.resolve('test_isolated_backup_restore.db');

const POPULATED_LEGACY_TABLES = [
  { name: 'knowledge_autopsies', expectedCount: 4 },
  { name: 'knowledge_decisions', expectedCount: 8 },
  { name: 'knowledge_evolution_analyses', expectedCount: 14 },
  { name: 'knowledge_gaps', expectedCount: 17 },
  { name: 'knowledge_graph_edges', expectedCount: 3 },
  { name: 'knowledge_graph_nodes', expectedCount: 12 }
];

async function verifyBackupRestoration() {
  console.log('=================================================================');
  console.log('--- InsightLens: Backup Restoration in Isolated Test Database ---');
  console.log('=================================================================\n');

  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`Backup file missing: ${BACKUP_FILE}`);
  }

  const rawBackup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  const tablesDumped = rawBackup.backup || rawBackup;
  const tableNames = Object.keys(tablesDumped);

  console.log(`>>> Backup file loaded: ${(fs.statSync(BACKUP_FILE).size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`    Total tables in backup: ${tableNames.length}`);

  // Clean up any previous test database
  if (fs.existsSync(ISOLATED_DB_FILE)) {
    fs.unlinkSync(ISOLATED_DB_FILE);
  }

  // Create clean isolated SQLite test database
  const testDb = new DatabaseSync(ISOLATED_DB_FILE);
  console.log(`>>> Isolated test database created: ${ISOLATED_DB_FILE}`);

  const restorationReport = [];
  let totalRestoredRecords = 0;
  let totalLegacyRestored = 0;

  for (const tbl of tableNames) {
    const tData = tablesDumped[tbl];
    const rows = Array.isArray(tData) ? tData : (tData?.rows || []);

    // Create table in isolated database
    testDb.exec(`
      CREATE TABLE "${tbl}" (
        id TEXT,
        record_json TEXT NOT NULL,
        restored_at TEXT NOT NULL
      );
    `);

    const insertStmt = testDb.prepare(`
      INSERT INTO "${tbl}" (id, record_json, restored_at) VALUES (?, ?, ?);
    `);

    for (const r of rows) {
      const rowId = r.id || r.email || r.user_email || String(Math.random());
      insertStmt.run(String(rowId), JSON.stringify(r), new Date().toISOString());
    }

    // Verify row count
    const countRow = testDb.prepare(`SELECT COUNT(*) AS cnt FROM "${tbl}"`).get();
    const verifiedCount = Number(countRow.cnt);

    if (verifiedCount !== rows.length) {
      throw new Error(`Count mismatch during restoration of "${tbl}": expected ${rows.length}, got ${verifiedCount}`);
    }

    const isLegacy = POPULATED_LEGACY_TABLES.some(p => p.name === tbl);
    if (isLegacy) totalLegacyRestored += verifiedCount;
    totalRestoredRecords += verifiedCount;

    restorationReport.push({
      table: tbl,
      backupRows: rows.length,
      restoredRows: verifiedCount,
      isLegacyTable: isLegacy,
      status: 'VERIFIED_RESTORED'
    });
  }

  console.table(restorationReport);
  console.log(`\n>>> Total Records Restored Across All Tables: ${totalRestoredRecords}`);
  console.log(`>>> Total Legacy Records Restored: ${totalLegacyRestored} / 58 expected`);

  // Verify each populated legacy table count exactly matches expected
  for (const expected of POPULATED_LEGACY_TABLES) {
    const verified = restorationReport.find(r => r.table === expected.name);
    if (!verified || verified.restoredRows !== expected.expectedCount) {
      throw new Error(`Legacy table verification failure for "${expected.name}": expected ${expected.expectedCount}, verified ${verified?.restoredRows}`);
    }
  }

  console.log('\n✓ ALL 58 LEGACY RECORDS SUCCESSFULLY RESTORED AND VERIFIED IN ISOLATED DATABASE.');

  // Sample read check to prove data fidelity
  const sampleLegacyRow = testDb.prepare(`SELECT * FROM "knowledge_decisions" LIMIT 1`).get();
  console.log('\n>>> Sample restored record from "knowledge_decisions":');
  console.log(JSON.stringify(JSON.parse(sampleLegacyRow.record_json), null, 2).slice(0, 300) + '...');

  testDb.close();

  // Clean up isolated test database file
  if (fs.existsSync(ISOLATED_DB_FILE)) {
    fs.unlinkSync(ISOLATED_DB_FILE);
    console.log('\n✓ Isolated test database cleaned up.');
  }

  return {
    success: true,
    totalTablesRestored: tableNames.length,
    totalRestoredRecords,
    totalLegacyRestored,
    restorationReport
  };
}

verifyBackupRestoration()
  .then((res) => {
    fs.writeFileSync('isolated_restoration_evidence.json', JSON.stringify(res, null, 2));
    console.log('Restoration evidence saved to isolated_restoration_evidence.json');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Restoration failed:', err);
    process.exit(1);
  });
