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

    const query = `
      INSERT INTO user_profiles (user_email, ui_preferences, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (user_email) DO UPDATE SET
        ui_preferences = COALESCE(user_profiles.ui_preferences, '{}'::jsonb) || $2::jsonb,
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
