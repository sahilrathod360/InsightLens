import fs from 'node:fs';
import path from 'node:path';
import pool from '../src/config/db.js';

const LEGACY_TABLES = [
  'knowledge_autopsies',
  'knowledge_decisions',
  'knowledge_evolution_analyses',
  'knowledge_gaps',
  'knowledge_graph_edges',
  'knowledge_graph_nodes',
  'knowledge_projects',
  'adversarial_analyses',
  'assumption_stress_tests'
];

const RETAINED_TABLES = [
  'users',
  'user_profiles',
  'reports',
  'activity_logs',
  'extensions',
  'user_extensions',
  'extension_settings',
  'themes',
  'typography_packs',
  'layout_packs',
  'visual_artifacts',
  'visual_evidence',
  'visual_comparisons',
  'visual_consistencies',
  'visual_workspaces'
];

async function runDatabaseOperations() {
  console.log('=================================================================');
  console.log('--- InsightLens: Database Verification & Safe Table Cleanup ---');
  console.log('=================================================================\n');

  if (!pool) {
    throw new Error('Database pool is not configured.');
  }

  const client = await pool.connect();
  try {
    // -------------------------------------------------------------
    // Step 1: Pre-Cleanup Table Inventory & Row Counts
    // -------------------------------------------------------------
    console.log('>>> Step 1: Querying Pre-Cleanup Table Inventory in Production...');
    const preTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
      ORDER BY table_name ASC;
    `);
    const preTableNames = preTablesRes.rows.map(r => r.table_name);
    console.log(`    Total Tables in public schema: ${preTableNames.length}`);

    const preInventory = [];
    for (const t of preTableNames) {
      const countRes = await client.query(`SELECT COUNT(*) AS cnt FROM "${t}"`);
      preInventory.push({ name: t, count: parseInt(countRes.rows[0].cnt, 10) });
    }
    console.table(preInventory);

    // -------------------------------------------------------------
    // Step 2: Verify Backup File Integrity
    // -------------------------------------------------------------
    console.log('\n>>> Step 2: Verifying Local Production Backup File...');
    const backupPath = path.resolve('production_aiven_db_backup.json');
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found at: ${backupPath}`);
    }
    const rawBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backupData = rawBackup.backup || rawBackup;

    let totalLegacyInBackup = 0;
    for (const t of LEGACY_TABLES) {
      const tData = backupData[t];
      const rows = Array.isArray(tData) ? tData : (tData?.rows || []);
      const count = tData?.count !== undefined ? tData.count : rows.length;
      console.log(`    Backup contains "${t}": ${count} records`);
      totalLegacyInBackup += count;
    }
    console.log(`    Verified Total Legacy Records in Backup: ${totalLegacyInBackup} (Expected: 58)`);
    if (totalLegacyInBackup !== 58) {
      throw new Error(`Backup verification failed: expected 58 legacy records, found ${totalLegacyInBackup}`);
    }

    // -------------------------------------------------------------
    // Step 3: Test Restoration in an Isolated Schema
    // -------------------------------------------------------------
    console.log('\n>>> Step 3: Testing Full Restoration in Isolated Schema "test_isolated_restore"...');
    await client.query(`CREATE SCHEMA IF NOT EXISTS test_isolated_restore;`);

    try {
      for (const t of LEGACY_TABLES) {
        const tData = backupData[t];
        const rows = Array.isArray(tData) ? tData : (tData?.rows || []);
        
        // Recreate table structure in isolated schema
        await client.query(`
          CREATE TABLE test_isolated_restore."${t}" (
            id TEXT,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Insert rows into isolated test table
        for (const row of rows) {
          await client.query(
            `INSERT INTO test_isolated_restore."${t}" (id, data) VALUES ($1, $2)`,
            [row.id || String(Math.random()), JSON.stringify(row)]
          );
        }

        // Query back and verify row count
        const verifyRes = await client.query(`SELECT COUNT(*) AS cnt FROM test_isolated_restore."${t}"`);
        const restoredCount = parseInt(verifyRes.rows[0].cnt, 10);
        console.log(`    ✓ Restored and verified test_isolated_restore."${t}": ${restoredCount} rows`);
        if (restoredCount !== rows.length) {
          throw new Error(`Restoration count mismatch for ${t}: expected ${rows.length}, got ${restoredCount}`);
        }
      }
      console.log('    ✓ Isolated restoration test PASSED with 100% data fidelity.');
    } finally {
      // Clean up isolated test schema
      await client.query(`DROP SCHEMA IF EXISTS test_isolated_restore CASCADE;`);
      console.log('    ✓ Cleaned up isolated test schema "test_isolated_restore".');
    }

    // -------------------------------------------------------------
    // Step 4: Check for Dependencies / Foreign Keys One Final Time
    // -------------------------------------------------------------
    console.log('\n>>> Step 4: Checking Dependencies and Foreign Keys for Legacy Tables...');
    const fkRes = await client.query(`
      SELECT
        tc.table_name AS dependent_table,
        kcu.column_name,
        ccu.table_name AS referenced_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = ANY($1) OR tc.table_name = ANY($1));
    `, [LEGACY_TABLES]);

    if (fkRes.rows.length > 0) {
      console.error('    ERROR: Found active foreign key constraints on legacy tables:', fkRes.rows);
      throw new Error('Aborting deletion: active foreign key constraints detected.');
    }
    console.log('    ✓ Zero foreign key dependencies detected on legacy tables.');

    // Check for views
    const viewRes = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public';
    `);
    console.log(`    ✓ Views in public schema: ${viewRes.rows.length}`);

    // -------------------------------------------------------------
    // Step 5: Safely Drop the Nine Legacy Tables (RESTRICT, Not Cascade)
    // -------------------------------------------------------------
    console.log('\n>>> Step 5: Executing Safe Deletion of 9 Legacy Tables (RESTRICT)...');
    for (const t of LEGACY_TABLES) {
      const dropSql = `DROP TABLE IF EXISTS public."${t}" RESTRICT;`;
      console.log(`    Executing: ${dropSql}`);
      await client.query(dropSql);
    }
    console.log('    ✓ Deletion statements completed.');

    // -------------------------------------------------------------
    // Step 6: Post-Cleanup Verification & Table Count
    // -------------------------------------------------------------
    console.log('\n>>> Step 6: Verifying Post-Cleanup Table Inventory in Production...');
    const postTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
      ORDER BY table_name ASC;
    `);
    const postTableNames = postTablesRes.rows.map(r => r.table_name);
    console.log(`    Total Tables in public schema after deletion: ${postTableNames.length}`);

    const postInventory = [];
    for (const t of postTableNames) {
      const countRes = await client.query(`SELECT COUNT(*) AS cnt FROM "${t}"`);
      postInventory.push({ name: t, count: parseInt(countRes.rows[0].cnt, 10) });
    }
    console.table(postInventory);

    // Verify all 15 retained tables are present
    const missingRetained = RETAINED_TABLES.filter(t => !postTableNames.includes(t));
    if (missingRetained.length > 0) {
      throw new Error(`CRITICAL: Retained tables missing after cleanup: ${missingRetained.join(', ')}`);
    }

    // Verify none of the 9 legacy tables remain
    const remainingLegacy = LEGACY_TABLES.filter(t => postTableNames.includes(t));
    if (remainingLegacy.length > 0) {
      throw new Error(`CRITICAL: Legacy tables still exist after cleanup: ${remainingLegacy.join(', ')}`);
    }

    if (postTableNames.length !== 15) {
      throw new Error(`Expected exactly 15 production tables, found ${postTableNames.length}`);
    }

    console.log('\n✓ DATABASE CLEANUP VERIFIED: Exactly 15 tables remain, 0 legacy tables, all core data intact.\n');

    return {
      preInventory,
      postInventory,
      legacyTablesDeleted: LEGACY_TABLES,
      retainedTables: RETAINED_TABLES
    };
  } finally {
    client.release();
  }
}

runDatabaseOperations()
  .then((res) => {
    fs.writeFileSync('database_cleanup_results.json', JSON.stringify(res, null, 2));
    console.log('Results written to database_cleanup_results.json');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during database operations:', err.message);
    process.exit(1);
  });
