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

    const result = await pool.query('SELECT * FROM user_preferences WHERE user_email = $1', [userEmail]);
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          userEmail,
          theme: 'dark',
          provider: 'auto',
          model: 'auto',
          autoModelFallback: true,
          compactMode: false,
          fontSize: 'medium',
          animationsOn: true,
          writingStyle: 'classic',
          researchLength: 'long',
          citationStyle: 'APA',
          language: 'en',
          exportFormat: 'pdf',
          autoSaveReports: true
        }
      });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        userEmail: row.user_email,
        theme: row.theme,
        provider: row.provider || 'auto',
        model: row.model,
        autoModelFallback: row.auto_model_fallback,
        compactMode: row.compact_mode,
        fontSize: row.font_size,
        animationsOn: row.animations_on,
        writingStyle: row.writing_style,
        researchLength: row.research_length,
        citationStyle: row.citation_style,
        language: row.language,
        exportFormat: row.export_format,
        autoSaveReports: row.auto_save_reports
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

    const query = `
      INSERT INTO user_preferences (
        user_email, theme, provider, model, auto_model_fallback, compact_mode,
        font_size, animations_on, writing_style, research_length,
        citation_style, language, export_format, auto_save_reports, updated_at
      )
      VALUES (
        $1, COALESCE($2, 'dark'), COALESCE($3, 'auto'), COALESCE($4, 'auto'),
        COALESCE($5, TRUE), COALESCE($6, FALSE), COALESCE($7, 'medium'),
        COALESCE($8, TRUE), COALESCE($9, 'classic'), COALESCE($10, 'long'),
        COALESCE($11, 'APA'), COALESCE($12, 'en'), COALESCE($13, 'pdf'), COALESCE($14, TRUE),
        NOW()
      )
      ON CONFLICT (user_email) DO UPDATE SET
        theme = COALESCE(EXCLUDED.theme, user_preferences.theme),
        provider = COALESCE(EXCLUDED.provider, user_preferences.provider),
        model = COALESCE(EXCLUDED.model, user_preferences.model),
        auto_model_fallback = COALESCE(EXCLUDED.auto_model_fallback, user_preferences.auto_model_fallback),
        compact_mode = COALESCE(EXCLUDED.compact_mode, user_preferences.compact_mode),
        font_size = COALESCE(EXCLUDED.font_size, user_preferences.font_size),
        animations_on = COALESCE(EXCLUDED.animations_on, user_preferences.animations_on),
        writing_style = COALESCE(EXCLUDED.writing_style, user_preferences.writing_style),
        research_length = COALESCE(EXCLUDED.research_length, user_preferences.research_length),
        citation_style = COALESCE(EXCLUDED.citation_style, user_preferences.citation_style),
        language = COALESCE(EXCLUDED.language, user_preferences.language),
        export_format = COALESCE(EXCLUDED.export_format, user_preferences.export_format),
        auto_save_reports = COALESCE(EXCLUDED.auto_save_reports, user_preferences.auto_save_reports),
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      userEmail,
      theme !== undefined ? theme : null,
      provider === 'gemini' || provider === 'openrouter' ? provider : 'auto',
      model !== undefined ? model : null, autoModelFallback !== undefined ? autoModelFallback : null,
      compactMode !== undefined ? compactMode : null, fontSize !== undefined ? fontSize : null,
      animationsOn !== undefined ? animationsOn : null, writingStyle !== undefined ? writingStyle : null,
      researchLength !== undefined ? researchLength : null, citationStyle !== undefined ? citationStyle : null,
      language !== undefined ? language : null, exportFormat !== undefined ? exportFormat : null,
      autoSaveReports !== undefined ? autoSaveReports : null
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'System preferences saved to database.',
      data: {
        userEmail: row.user_email,
        theme: row.theme,
        provider: row.provider || 'auto',
        model: row.model,
        autoModelFallback: row.auto_model_fallback,
        compactMode: row.compact_mode,
        fontSize: row.font_size,
        animationsOn: row.animations_on,
        writingStyle: row.writing_style,
        researchLength: row.research_length,
        citationStyle: row.citation_style,
        language: row.language,
        exportFormat: row.export_format,
        autoSaveReports: row.auto_save_reports
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
