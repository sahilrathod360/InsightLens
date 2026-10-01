import pool from '../../config/db.js';
import { BUILTIN_EXTENSIONS, BUILTIN_THEMES, BUILTIN_TYPOGRAPHY, BUILTIN_LAYOUTS } from './BuiltinExtensions.js';
import { validateExtensionManifest } from './ExtensionManifestValidator.js';
import { APIError } from '../../utils/apiUtils.js';

class ExtensionService {
  /**
   * Seeds builtin extensions, themes, typography, and layouts if not already in DB.
   */
  async seedBuiltinExtensions() {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Seed Built-in Extensions
      for (const ext of BUILTIN_EXTENSIONS) {
        await client.query(`
          INSERT INTO extensions (id, name, version, description, author, category, icon, capabilities, manifest, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            version = EXCLUDED.version,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            icon = EXCLUDED.icon,
            capabilities = EXCLUDED.capabilities,
            manifest = EXCLUDED.manifest,
            updated_at = NOW();
        `, [
          ext.id,
          ext.name,
          ext.version,
          ext.description,
          ext.author,
          ext.category,
          ext.icon,
          JSON.stringify(ext.capabilities),
          JSON.stringify(ext.manifest),
          ext.is_builtin
        ]);
      }

      // 2. Seed Themes
      for (const th of BUILTIN_THEMES) {
        await client.query(`
          INSERT INTO themes (id, name, slug, description, theme_data, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            theme_data = EXCLUDED.theme_data;
        `, [th.id, th.name, th.slug, th.description, JSON.stringify(th.theme_data), th.is_builtin]);
      }

      // 3. Seed Typography Packs
      for (const tp of BUILTIN_TYPOGRAPHY) {
        await client.query(`
          INSERT INTO typography_packs (id, name, slug, description, typography_data, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            typography_data = EXCLUDED.typography_data;
        `, [tp.id, tp.name, tp.slug, tp.description, JSON.stringify(tp.typography_data), tp.is_builtin]);
      }

      // 4. Seed Layout Packs
      for (const lp of BUILTIN_LAYOUTS) {
        await client.query(`
          INSERT INTO layout_packs (id, name, slug, description, layout_data, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            layout_data = EXCLUDED.layout_data;
        `, [lp.id, lp.name, lp.slug, lp.description, JSON.stringify(lp.layout_data), lp.is_builtin]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ExtensionService] Seed failed:', err.message);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all extensions along with the user's installation & enablement status.
   */
  async listExtensionsForUser(userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      // In-memory fallback
      return BUILTIN_EXTENSIONS.map(ext => ({
        ...ext,
        is_installed: true,
        is_enabled: true
      }));
    }

    const query = `
      SELECT 
        e.id,
        e.name,
        e.version,
        e.description,
        e.author,
        e.category,
        e.icon,
        e.capabilities,
        e.manifest,
        e.is_builtin,
        COALESCE(ue.is_installed, e.is_builtin) AS is_installed,
        COALESCE(ue.is_enabled, e.is_builtin) AS is_enabled,
        ue.installed_at,
        es.settings_json AS settings
      FROM extensions e
      LEFT JOIN user_extensions ue ON ue.extension_id = e.id AND ue.user_email = $1
      LEFT JOIN extension_settings es ON es.extension_id = e.id AND es.user_email = $1
      ORDER BY e.is_builtin DESC, e.name ASC;
    `;

    const { rows } = await pool.query(query, [userEmail]);
    return rows;
  }

  /**
   * Installs an extension for a user.
   */
  async installExtension(userEmail, extensionId) {
    if (!pool) return { success: true, extensionId, is_installed: true, is_enabled: true };

    const extRes = await pool.query('SELECT * FROM extensions WHERE id = $1', [extensionId]);
    if (extRes.rowCount === 0) {
      throw new APIError(`Extension with ID "${extensionId}" not found.`, 404, 'ExtensionService');
    }

    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled)
      VALUES ($1, $2, TRUE, TRUE)
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_installed = TRUE,
        is_enabled = TRUE,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId]);
    return { success: true, userExtension: rows[0] };
  }

  /**
   * Uninstalls an extension for a user.
   */
  async uninstallExtension(userEmail, extensionId) {
    if (!pool) return { success: true, extensionId, is_installed: false, is_enabled: false };

    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled)
      VALUES ($1, $2, FALSE, FALSE)
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_installed = FALSE,
        is_enabled = FALSE,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId]);
    return { success: true, userExtension: rows[0] };
  }

  /**
   * Toggles enabled/disabled state of an installed extension.
   */
  async toggleExtension(userEmail, extensionId, enabled) {
    if (!pool) return { success: true, extensionId, is_enabled: enabled };

    const isEnabled = Boolean(enabled);
    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled)
      VALUES ($1, $2, TRUE, $3)
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_enabled = $3,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId, isEnabled]);
    return { success: true, userExtension: rows[0] };
  }

  /**
   * Updates settings for a specific extension.
   */
  async updateExtensionSettings(userEmail, extensionId, settingsJson) {
    if (!pool) return { success: true, settings: settingsJson };

    const query = `
      INSERT INTO extension_settings (user_email, extension_id, settings_json)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        settings_json = $3,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId, JSON.stringify(settingsJson)]);
    return { success: true, settings: rows[0].settings_json };
  }

  /**
   * Gets available themes list.
   */
  async getThemes() {
    if (!pool) return BUILTIN_THEMES;
    const { rows } = await pool.query('SELECT * FROM themes ORDER BY id ASC');
    return rows.length > 0 ? rows : BUILTIN_THEMES;
  }

  /**
   * Gets available typography packs list.
   */
  async getTypographyPacks() {
    if (!pool) return BUILTIN_TYPOGRAPHY;
    const { rows } = await pool.query('SELECT * FROM typography_packs ORDER BY id ASC');
    return rows.length > 0 ? rows : BUILTIN_TYPOGRAPHY;
  }

  /**
   * Gets available layout packs list.
   */
  async getLayoutPacks() {
    if (!pool) return BUILTIN_LAYOUTS;
    const { rows } = await pool.query('SELECT * FROM layout_packs ORDER BY id ASC');
    return rows.length > 0 ? rows : BUILTIN_LAYOUTS;
  }
}

export default new ExtensionService();
