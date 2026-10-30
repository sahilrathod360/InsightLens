import { config } from '../config/env.js';
import pool from '../config/db.js';

/**
 * Retrieve User Preferences from PostgreSQL.
 * Scoped strictly to the authenticated user from req.user.
 */
export const getPreferences = async (req, res, next) => {
  try {
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    if (!pool) {
      console.error('[SettingsController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.',
        data: null
      });
    }

    try {
      await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{}'::jsonb`);
    } catch (_) {}

    const result = await pool.query('SELECT ui_preferences FROM user_profiles WHERE user_email = $1', [userEmail]);
    const prefs = result.rows[0]?.ui_preferences || {};

    return res.status(200).json({
      success: true,
      data: {
        userEmail,
        theme: prefs.theme || 'dark',
        provider: prefs.provider || 'auto',
        model: prefs.model || 'auto',
        autoModelFallback: prefs.autoModelFallback !== undefined ? prefs.autoModelFallback : true,
        compactMode: prefs.compactMode || false,
        fontSize: prefs.fontSize || 'medium',
        animationsOn: prefs.animationsOn !== undefined ? prefs.animationsOn : true,
        writingStyle: prefs.writingStyle || 'classic',
        researchLength: prefs.researchLength || 'long',
        citationStyle: prefs.citationStyle || 'APA',
        language: prefs.language || 'en',
        exportFormat: prefs.exportFormat || 'pdf',
        autoSaveReports: prefs.autoSaveReports !== undefined ? prefs.autoSaveReports : true
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Save / Update User Preferences in PostgreSQL.
 * Scoped strictly to the authenticated user from req.user.
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    const {
      theme,
      provider,
      model,
      autoModelFallback,
      compactMode,
      fontSize,
      animationsOn,
      writingStyle,
      researchLength,
      citationStyle,
      language,
      exportFormat,
      autoSaveReports
    } = req.body;

    if (!pool) {
      console.error('[SettingsController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.',
        data: null
      });
    }

    const newPrefs = {
      theme: theme || 'dark',
      provider: provider === 'gemini' || provider === 'openrouter' ? provider : 'auto',
      model: model || 'auto',
      autoModelFallback: autoModelFallback !== undefined ? autoModelFallback : true,
      compactMode: compactMode || false,
      fontSize: fontSize || 'medium',
      animationsOn: animationsOn !== undefined ? animationsOn : true,
      writingStyle: writingStyle || 'classic',
      researchLength: researchLength || 'long',
      citationStyle: citationStyle || 'APA',
      language: language || 'en',
      exportFormat: exportFormat || 'pdf',
      autoSaveReports: autoSaveReports !== undefined ? autoSaveReports : true
    };

    try {
      await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{}'::jsonb`);
    } catch (_) {}

    const query = `
      INSERT INTO user_profiles (user_email, ui_preferences, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (user_email) DO UPDATE SET
        ui_preferences = COALESCE(user_profiles.ui_preferences, '{}'::jsonb) || EXCLUDED.ui_preferences,
        updated_at = NOW()
      RETURNING ui_preferences;
    `;

    const result = await pool.query(query, [userEmail, JSON.stringify(newPrefs)]);
    const merged = result.rows[0]?.ui_preferences || newPrefs;

    return res.status(200).json({
      success: true,
      message: 'System preferences saved to database.',
      data: {
        userEmail,
        theme: merged.theme,
        provider: merged.provider || 'auto',
        model: merged.model,
        autoModelFallback: merged.autoModelFallback,
        compactMode: merged.compactMode,
        fontSize: merged.fontSize,
        animationsOn: merged.animationsOn,
        writingStyle: merged.writingStyle,
        researchLength: merged.researchLength,
        citationStyle: merged.citationStyle,
        language: merged.language,
        exportFormat: merged.exportFormat,
        autoSaveReports: merged.autoSaveReports
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Diagnostic Provider Connection Test.
 */
export const testProviderConnection = async (req, res, next) => {
  const { provider, apiKey } = req.body;
  const startMs = Date.now();

  try {
    if (provider === 'openrouter') {
      const keyToUse = apiKey || config.apiKeys.openrouter;
      if (!keyToUse) {
        return res.status(200).json({
          success: false,
          message: 'Please enter or configure an OpenRouter API key to test connection.',
          data: { status: 'Missing Key', latency: 0 }
        });
      }

      const openrouterRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${keyToUse}` }
      });
      const elapsed = Date.now() - startMs;

      if (openrouterRes.ok) {
        return res.status(200).json({
          success: true,
          message: `OpenRouter API Connection Successful (${elapsed}ms latency)`,
          data: { status: 'HTTP 200 OK', latency: elapsed }
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `OpenRouter API key error (HTTP ${openrouterRes.status})`,
          data: { status: `HTTP ${openrouterRes.status}`, latency: elapsed }
        });
      }
    } else {
      // Default: Gemini
      const keyToUse = apiKey || config.apiKeys.gemini;
      if (!keyToUse) {
        return res.status(200).json({
          success: false,
          message: 'Please enter or configure a Google Gemini API key to test connection.',
          data: { status: 'Missing Key', latency: 0 }
        });
      }

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);
      const elapsed = Date.now() - startMs;

      if (geminiRes.ok) {
        return res.status(200).json({
          success: true,
          message: `Google Gemini API Connection Successful (${elapsed}ms latency)`,
          data: { status: 'HTTP 200 OK', latency: elapsed }
        });
      } else if (geminiRes.status === 429) {
        return res.status(200).json({
          success: true,
          message: `Gemini API Quota Limit Reached (HTTP 429). Auto Model Fallback active.`,
          data: { status: 'HTTP 429 Quota', latency: elapsed }
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `Gemini API Key Error (HTTP ${geminiRes.status})`,
          data: { status: `HTTP ${geminiRes.status}`, latency: elapsed }
        });
      }
    }
  } catch (err) {
    const elapsed = Date.now() - startMs;
    return res.status(200).json({
      success: false,
      message: `Failed to reach ${provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'} provider server.`,
      data: { status: 'Network Error', latency: elapsed }
    });
  }
};

/**
 * Safe Audit Inventory & Pre-Cleanup Full Record Extraction
 * Authenticated via JWT middleware.
 */
export const getAuditInventoryAndBackup = async (req, res, next) => {
  try {
    if (!pool) {
      return res.status(500).json({ success: false, message: 'Database pool unavailable.' });
    }

    const [
      usersRes,
      profilesRes,
      reportsCountRes,
      logsCountRes,
      extsCountRes,
      wsCountRes,
      catalogRes,
      sizesRes,
      pgSettingsRes,
      targetReportsRes,
      targetLogsRes,
      targetWsRes,
      targetExtsRes,
      fkConstraintsRes
    ] = await Promise.all([
      pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'),
      pool.query('SELECT user_email, user_id, role, created_at FROM user_profiles'),
      pool.query('SELECT user_email, count(*)::int as count FROM reports GROUP BY user_email'),
      pool.query('SELECT user_email, count(*)::int as count FROM activity_logs GROUP BY user_email'),
      pool.query('SELECT user_email, count(*)::int as count FROM user_extensions GROUP BY user_email'),
      pool.query('SELECT user_email, count(*)::int as count FROM visual_workspaces GROUP BY user_email'),
      pool.query('SELECT id, name, version, category, is_builtin FROM extensions ORDER BY id ASC'),
      pool.query(`
        SELECT relname AS table_name,
               pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
               pg_total_relation_size(relid)::bigint AS total_bytes
        FROM pg_catalog.pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
      `),
      pool.query(`
        SELECT name, setting 
        FROM pg_settings 
        WHERE name IN ('archive_mode', 'wal_level', 'archive_command', 'max_wal_size', 'checkpoint_timeout')
      `),
      pool.query(`
        SELECT id, user_email, title, subject, category, summary_lead, date_formatted, timestamp, model_used, processing_time_ms, confidence_score, full_data, favorite, created_at
        FROM reports
        WHERE user_email NOT IN (
          'sahil1236@gmail.com', 'sahil2224@gmail.com', 'stoicsahil@gmail.com', 'stoicsahil00@gmail.com',
          'stoicism123@gmail.com', 'stoici123@gmail.com', 'imbatman1234@gmail.com', 'walterwhite@gmail.com',
          'jesse1234@gmail.com', 'dexter1234@gmail.com', 'johncena123@gmail.com', 'heisenberg2013@gmail.com',
          'hellyeah1234@gmail.com', 'rajatagrawal0987@gmail.com', 'abc@gmail.com', 'guest@insightlens.edu'
        )
      `),
      pool.query(`
        SELECT id, user_email, activity_type, text, timestamp, created_at
        FROM activity_logs
        WHERE user_email NOT IN (
          'sahil1236@gmail.com', 'sahil2224@gmail.com', 'stoicsahil@gmail.com', 'stoicsahil00@gmail.com',
          'stoicism123@gmail.com', 'stoici123@gmail.com', 'imbatman1234@gmail.com', 'walterwhite@gmail.com',
          'jesse1234@gmail.com', 'dexter1234@gmail.com', 'johncena123@gmail.com', 'heisenberg2013@gmail.com',
          'hellyeah1234@gmail.com', 'rajatagrawal0987@gmail.com', 'abc@gmail.com', 'guest@insightlens.edu'
        )
      `),
      pool.query(`
        SELECT id, user_email, name, intent, artifacts_json, created_at, updated_at
        FROM visual_workspaces
        WHERE user_email NOT IN (
          'sahil1236@gmail.com', 'sahil2224@gmail.com', 'stoicsahil@gmail.com', 'stoicsahil00@gmail.com',
          'stoicism123@gmail.com', 'stoici123@gmail.com', 'imbatman1234@gmail.com', 'walterwhite@gmail.com',
          'jesse1234@gmail.com', 'dexter1234@gmail.com', 'johncena123@gmail.com', 'heisenberg2013@gmail.com',
          'hellyeah1234@gmail.com', 'rajatagrawal0987@gmail.com', 'abc@gmail.com', 'guest@insightlens.edu'
        )
      `),
      pool.query(`
        SELECT id, user_email, extension_id, is_installed, is_enabled, installed_at, updated_at
        FROM user_extensions
        WHERE user_email NOT IN (
          'sahil1236@gmail.com', 'sahil2224@gmail.com', 'stoicsahil@gmail.com', 'stoicsahil00@gmail.com',
          'stoicism123@gmail.com', 'stoici123@gmail.com', 'imbatman1234@gmail.com', 'walterwhite@gmail.com',
          'jesse1234@gmail.com', 'dexter1234@gmail.com', 'johncena123@gmail.com', 'heisenberg2013@gmail.com',
          'hellyeah1234@gmail.com', 'rajatagrawal0987@gmail.com', 'abc@gmail.com', 'guest@insightlens.edu',
          'verify_ext_1793369660669@insightlens.test'
        )
      `),
      pool.query(`
        SELECT tc.table_schema, tc.constraint_name, tc.table_name, kcu.column_name,
               ccu.table_name AS foreign_table_name,
               ccu.column_name AS foreign_column_name,
               rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE ccu.table_name = 'users';
      `)
    ]);

    return res.status(200).json({
      success: true,
      users: usersRes.rows,
      profiles: profilesRes.rows,
      reportsCount: reportsCountRes.rows,
      logsCount: logsCountRes.rows,
      extsCount: extsCountRes.rows,
      workspacesCount: wsCountRes.rows,
      extensionsCatalog: catalogRes.rows,
      tableSizes: sizesRes.rows,
      pgSettings: pgSettingsRes.rows,
      targetData: {
        reports: targetReportsRes.rows,
        logs: targetLogsRes.rows,
        workspaces: targetWsRes.rows,
        user_extensions: targetExtsRes.rows
      },
      foreignKeys: fkConstraintsRes.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Execute Option B Cleanup (Atomic Serializable Transaction)
 * Authenticated via JWT middleware.
 */
export const executeOptionBCleanup = async (req, res, next) => {
  const { confirmationToken, candidateAccounts } = req.body;

  if (confirmationToken !== 'EXECUTE_OPTION_B_104_ACCOUNTS') {
    return res.status(400).json({ success: false, message: 'Invalid confirmation token.' });
  }

  if (!Array.isArray(candidateAccounts) || candidateAccounts.length !== 104) {
    return res.status(400).json({
      success: false,
      message: `Expected candidateAccounts array of exactly 104 items, got ${candidateAccounts?.length}`
    });
  }

  // Mandatory preserved accounts
  const preservedEmails = new Set([
    'sahil1236@gmail.com', 'sahil2224@gmail.com', 'stoicsahil@gmail.com', 'stoicsahil00@gmail.com',
    'stoicism123@gmail.com', 'stoici123@gmail.com', 'imbatman1234@gmail.com', 'walterwhite@gmail.com',
    'jesse1234@gmail.com', 'dexter1234@gmail.com', 'johncena123@gmail.com', 'heisenberg2013@gmail.com',
    'hellyeah1234@gmail.com', 'rajatagrawal0987@gmail.com', 'abc@gmail.com', 'guest@insightlens.edu'
  ]);

  const diagnosticEmails = new Set([
    'verify_ext_1793369660669@insightlens.test',
    'inspector_1793372122372@insightlens.test'
  ]);

  for (const acc of candidateAccounts) {
    if (!acc.id || !acc.email) {
      return res.status(400).json({ success: false, message: `Account missing id or email: ${JSON.stringify(acc)}` });
    }
    if (preservedEmails.has(acc.email)) {
      return res.status(400).json({ success: false, message: `CRITICAL: Preserved account ${acc.email} present in candidate list!` });
    }
    if (diagnosticEmails.has(acc.email)) {
      return res.status(400).json({ success: false, message: `CRITICAL: Diagnostic account ${acc.email} present in candidate list!` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    // 1. Verify all 16 genuine accounts exist
    const genuineRes = await client.query('SELECT email FROM users WHERE email = ANY($1::text[])', [Array.from(preservedEmails)]);
    if (genuineRes.rows.length !== preservedEmails.size) {
      throw new Error(`PRE-CHECK FAILED: Preserved users found ${genuineRes.rows.length}, expected ${preservedEmails.size}`);
    }

    // 2. Verify both diagnostic accounts exist
    const diagRes = await client.query('SELECT email FROM users WHERE email = ANY($1::text[])', [Array.from(diagnosticEmails)]);
    if (diagRes.rows.length !== diagnosticEmails.size) {
      throw new Error(`PRE-CHECK FAILED: Diagnostic users found ${diagRes.rows.length}, expected ${diagnosticEmails.size}`);
    }

    // 3. Verify all 104 candidate accounts match BOTH id and email
    const candidateEmails = candidateAccounts.map(a => a.email);
    const candidateIds = candidateAccounts.map(a => a.id);

    const matchRes = await client.query(
      'SELECT id, email FROM users WHERE id = ANY($1::uuid[]) AND email = ANY($2::text[])',
      [candidateIds, candidateEmails]
    );
    if (matchRes.rows.length !== 104) {
      throw new Error(`PRE-CHECK FAILED: Matching candidate accounts in database is ${matchRes.rows.length}, expected exactly 104`);
    }

    // Verify exact 1-to-1 pair match
    const dbUserMap = new Map(matchRes.rows.map(r => [r.email, r.id]));
    for (const acc of candidateAccounts) {
      if (dbUserMap.get(acc.email) !== acc.id) {
        throw new Error(`PRE-CHECK FAILED: Mismatched UUID for email ${acc.email}`);
      }
    }

    // Record initial counts
    const countBeforeUsers = (await client.query('SELECT count(*)::int as c FROM users')).rows[0].c;
    const countBeforeProfiles = (await client.query('SELECT count(*)::int as c FROM user_profiles')).rows[0].c;
    const countBeforeReports = (await client.query('SELECT count(*)::int as c FROM reports')).rows[0].c;
    const countBeforeLogs = (await client.query('SELECT count(*)::int as c FROM activity_logs')).rows[0].c;
    const countBeforeExts = (await client.query('SELECT count(*)::int as c FROM user_extensions')).rows[0].c;
    const countBeforeWs = (await client.query('SELECT count(*)::int as c FROM visual_workspaces')).rows[0].c;
    const countBeforeCatalog = (await client.query('SELECT count(*)::int as c FROM extensions')).rows[0].c;

    // Execute deletions in exact dependency order
    const delExts = await client.query('DELETE FROM user_extensions WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delExtSettings = await client.query('DELETE FROM extension_settings WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delWs = await client.query('DELETE FROM visual_workspaces WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delReports = await client.query('DELETE FROM reports WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delLogs = await client.query('DELETE FROM activity_logs WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delArtifacts = await client.query('DELETE FROM visual_artifacts WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delComparisons = await client.query('DELETE FROM visual_comparisons WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delConsistencies = await client.query('DELETE FROM visual_consistencies WHERE user_email = ANY($1::text[])', [candidateEmails]);
    const delProfiles = await client.query(
      'DELETE FROM user_profiles WHERE user_email = ANY($1::text[]) OR user_id = ANY($2::uuid[])',
      [candidateEmails, candidateIds]
    );
    const delUsers = await client.query(
      'DELETE FROM users WHERE id = ANY($1::uuid[]) AND email = ANY($2::text[])',
      [candidateIds, candidateEmails]
    );

    if (delUsers.rowCount !== 104) {
      throw new Error(`DELETION ASSERTION FAILED: Deleted ${delUsers.rowCount} users, expected exactly 104`);
    }

    // Post-deletion verification assertions
    const countAfterUsers = (await client.query('SELECT count(*)::int as c FROM users')).rows[0].c;
    const countAfterProfiles = (await client.query('SELECT count(*)::int as c FROM user_profiles')).rows[0].c;
    const countAfterReports = (await client.query('SELECT count(*)::int as c FROM reports')).rows[0].c;
    const countAfterLogs = (await client.query('SELECT count(*)::int as c FROM activity_logs')).rows[0].c;
    const countAfterExts = (await client.query('SELECT count(*)::int as c FROM user_extensions')).rows[0].c;
    const countAfterWs = (await client.query('SELECT count(*)::int as c FROM visual_workspaces')).rows[0].c;
    const countAfterCatalog = (await client.query('SELECT count(*)::int as c FROM extensions')).rows[0].c;

    if (countAfterUsers !== 17) {
      throw new Error(`POST-CHECK FAILED: Remaining users count is ${countAfterUsers}, expected exactly 17 (15 genuine + 2 diagnostic)`);
    }
    if (countAfterReports !== 85) {
      throw new Error(`POST-CHECK FAILED: Remaining reports count is ${countAfterReports}, expected exactly 85`);
    }
    if (countAfterLogs !== 91) {
      throw new Error(`POST-CHECK FAILED: Remaining activity logs count is ${countAfterLogs}, expected exactly 91`);
    }
    if (countAfterCatalog !== 12) {
      throw new Error(`POST-CHECK FAILED: Extensions catalog modified! Remaining count: ${countAfterCatalog}`);
    }
    if (countAfterWs !== 0) {
      throw new Error(`POST-CHECK FAILED: Remaining workspaces count is ${countAfterWs}, expected exactly 0`);
    }
    if (countAfterExts !== 18) {
      throw new Error(`POST-CHECK FAILED: Remaining user_extensions count is ${countAfterExts}, expected exactly 18 (17 genuine + 1 diagnostic)`);
    }
    if (countAfterProfiles !== 8) {
      throw new Error(`POST-CHECK FAILED: Remaining user_profiles count is ${countAfterProfiles}, expected exactly 8 (6 genuine/guest + 2 diagnostic)`);
    }

    // Verify all 16 genuine users still exist
    const checkGenuine = await client.query('SELECT email FROM users WHERE email = ANY($1::text[])', [Array.from(preservedEmails)]);
    if (checkGenuine.rows.length !== preservedEmails.size) {
      throw new Error(`POST-CHECK FAILED: Preserved users check failed! Found ${checkGenuine.rows.length}`);
    }

    // Verify diagnostic users still exist
    const checkDiag = await client.query('SELECT email FROM users WHERE email = ANY($1::text[])', [Array.from(diagnosticEmails)]);
    if (checkDiag.rows.length !== diagnosticEmails.size) {
      throw new Error(`POST-CHECK FAILED: Diagnostic users check failed! Found ${checkDiag.rows.length}`);
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Option B production database cleanup executed successfully with all assertions passed.',
      deletedCounts: {
        users: delUsers.rowCount,
        user_profiles: delProfiles.rowCount,
        user_extensions: delExts.rowCount,
        extension_settings: delExtSettings.rowCount,
        reports: delReports.rowCount,
        activity_logs: delLogs.rowCount,
        visual_workspaces: delWs.rowCount,
        visual_artifacts: delArtifacts.rowCount,
        visual_comparisons: delComparisons.rowCount,
        visual_consistencies: delConsistencies.rowCount
      },
      countsBefore: {
        users: countBeforeUsers,
        user_profiles: countBeforeProfiles,
        reports: countBeforeReports,
        activity_logs: countBeforeLogs,
        user_extensions: countBeforeExts,
        visual_workspaces: countBeforeWs,
        extensions: countBeforeCatalog
      },
      countsAfter: {
        users: countAfterUsers,
        user_profiles: countAfterProfiles,
        reports: countAfterReports,
        activity_logs: countAfterLogs,
        user_extensions: countAfterExts,
        visual_workspaces: countAfterWs,
        extensions: countAfterCatalog
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Option B Cleanup Error - Rolled Back]', err);
    return res.status(500).json({
      success: false,
      message: `Transaction failed and was safely rolled back: ${err.message}`,
      error: err.message
    });
  } finally {
    client.release();
  }
};

