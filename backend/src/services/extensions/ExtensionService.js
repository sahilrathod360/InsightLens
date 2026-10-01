import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../../config/db.js';
import { APIError } from '../../utils/apiUtils.js';
import {
  BUILTIN_EXTENSIONS,
  BUILTIN_THEMES,
  BUILTIN_TYPOGRAPHY,
  BUILTIN_LAYOUTS
} from './BuiltinExtensions.js';
import { validateExtensionManifest } from './ExtensionManifestValidator.js';
import { createZipBuffer } from '../../utils/zipBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSIONS_DIR = path.resolve(__dirname, '../../../../extensions');
const BUILTIN_DIR = path.join(EXTENSIONS_DIR, 'built-in');
const INSTALLED_DIR = path.join(EXTENSIONS_DIR, 'installed');

class ExtensionService {
  constructor() {
    this.inMemoryUserExtensions = new Map(); // userEmail -> Map(extensionId -> { is_installed, is_enabled })
    this.inMemorySettings = new Map();       // userEmail -> Map(extensionId -> settings)
    this.inMemoryActiveState = new Map();    // userEmail -> state
    this._ensureDirectories();
  }

  _ensureDirectories() {
    try {
      if (!fs.existsSync(EXTENSIONS_DIR)) fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
      if (!fs.existsSync(BUILTIN_DIR)) fs.mkdirSync(BUILTIN_DIR, { recursive: true });
      if (!fs.existsSync(INSTALLED_DIR)) fs.mkdirSync(INSTALLED_DIR, { recursive: true });

      // Seed built-in folders with manifest.json
      for (const ext of BUILTIN_EXTENSIONS) {
        const extFolder = path.join(BUILTIN_DIR, ext.id);
        if (!fs.existsSync(extFolder)) {
          fs.mkdirSync(extFolder, { recursive: true });
        }
        const manifestPath = path.join(extFolder, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
          fs.writeFileSync(manifestPath, JSON.stringify(ext.manifest, null, 2), 'utf8');
        }
      }
    } catch (err) {
      console.warn('[ExtensionService] FS init notice:', err.message);
    }
  }

  _getUserExtStore(userEmail = 'guest@insightlens.edu') {
    if (!this.inMemoryUserExtensions.has(userEmail)) {
      this.inMemoryUserExtensions.set(userEmail, new Map());
    }
    return this.inMemoryUserExtensions.get(userEmail);
  }

  /**
   * Seed database catalog with built-in extensions and packs.
   * NOTE: Seeding catalog does NOT mark extensions as installed for any user.
   */
  async seedCatalog() {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Seed Extensions Catalog
      for (const ext of BUILTIN_EXTENSIONS) {
        await client.query(`
          INSERT INTO extensions (id, name, version, description, author, category, icon, capabilities, manifest, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            version = EXCLUDED.version,
            description = EXCLUDED.description,
            author = EXCLUDED.author,
            category = EXCLUDED.category,
            icon = EXCLUDED.icon,
            capabilities = EXCLUDED.capabilities,
            manifest = EXCLUDED.manifest,
            is_builtin = EXCLUDED.is_builtin;
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

      // 2. Seed Themes Catalog
      for (const t of BUILTIN_THEMES) {
        await client.query(`
          INSERT INTO themes (id, name, slug, description, css_variables, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            css_variables = EXCLUDED.css_variables;
        `, [t.id, t.name, t.slug, t.description, JSON.stringify(t.css_variables), t.is_builtin]);
      }

      // 3. Seed Typography Packs
      for (const tp of BUILTIN_TYPOGRAPHY) {
        await client.query(`
          INSERT INTO typography_packs (id, name, slug, description, font_family, scale_ratio, is_builtin)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            font_family = EXCLUDED.font_family,
            scale_ratio = EXCLUDED.scale_ratio;
        `, [tp.id, tp.name, tp.slug, tp.description, tp.font_family, tp.scale_ratio, tp.is_builtin]);
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

      // 5. Clean up legacy aliases if present
      await client.query(`
        DELETE FROM extensions 
        WHERE id NOT IN ('theme-studio', 'typography-lab', 'layout-packs', 'hint-engine', 'academic-mode', 'research-mode', 'presentation-mode', 'focus-mode', 'developer-mode', 'prompt-playground');
      `);

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
   * STRICT RULE: Fresh users start with is_installed = false, is_enabled = false for ALL extensions.
   */
  async listExtensionsForUser(userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      const userStore = this._getUserExtStore(userEmail);
      return BUILTIN_EXTENSIONS.map(ext => {
        const userState = userStore.get(ext.id);
        const isInstalled = userState ? Boolean(userState.is_installed) : false;
        const isEnabled = userState ? Boolean(userState.is_enabled) : false;
        return {
          ...ext,
          is_installed: isInstalled,
          is_enabled: isEnabled,
          installed_at: userState?.installed_at || null
        };
      });
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
        COALESCE(ue.is_installed, FALSE) AS is_installed,
        COALESCE(ue.is_enabled, FALSE) AS is_enabled,
        ue.installed_at,
        es.settings_json AS settings
      FROM extensions e
      LEFT JOIN user_extensions ue ON ue.extension_id = e.id AND ue.user_email = $1
      LEFT JOIN extension_settings es ON es.extension_id = e.id AND es.user_email = $1
      WHERE e.id IN ('theme-studio', 'typography-lab', 'layout-packs', 'hint-engine', 'academic-mode', 'research-mode', 'presentation-mode', 'focus-mode', 'developer-mode', 'prompt-playground')
      ORDER BY e.name ASC;
    `;

    const { rows } = await pool.query(query, [userEmail]);
    return rows;
  }

  /**
   * Generates a downloadable .zip package archive for an extension.
   */
  async downloadExtensionPackage(extensionId) {
    const builtin = BUILTIN_EXTENSIONS.find(e => e.id === extensionId);
    let manifest = builtin?.manifest;
    let name = builtin?.name || extensionId;
    let version = builtin?.version || '1.0.0';
    let description = builtin?.description || 'InsightLens Extension Module';

    if (!manifest && pool) {
      const extRes = await pool.query('SELECT * FROM extensions WHERE id = $1', [extensionId]);
      if (extRes.rowCount > 0) {
        manifest = extRes.rows[0].manifest;
        name = extRes.rows[0].name;
        version = extRes.rows[0].version;
        description = extRes.rows[0].description;
      }
    }

    if (!manifest) {
      throw new APIError(`Extension "${extensionId}" not found for package download.`, 404, 'ExtensionService');
    }

    const packageJson = {
      name: `@insightlens/ext-${extensionId}`,
      version,
      description,
      main: 'index.js',
      keywords: ['insightlens', 'extension', manifest.category || 'tools'],
      author: manifest.author || 'InsightLens Team',
      license: 'MIT',
      insightlens: {
        id: extensionId,
        minAppVersion: manifest.minAppVersion || '2.0.0',
        capabilities: manifest.capabilities || []
      }
    };

    const readmeContent = `# ${name} (v${version})

${description}

## Extension Information
- **Identifier**: \`${extensionId}\`
- **Category**: ${manifest.category || 'General'}
- **Author**: ${manifest.author || 'InsightLens'}
- **Capabilities**: ${(manifest.capabilities || []).join(', ') || 'Standard'}

## Installation
In InsightLens, navigate to **Extensions** → Click **Install** or upload this zip package.
After installing, click **Enable** to activate the extension runtime in your workspace.
`;

    const indexJsContent = `/**
 * InsightLens Extension Module: ${name}
 * Version: ${version}
 */

export function activate(context) {
  console.log('[InsightLens Extension] Activated: ${extensionId}');
  return {
    id: '${extensionId}',
    status: 'ACTIVE',
    capabilities: ${JSON.stringify(manifest.capabilities || [])}
  };
}

export function deactivate() {
  console.log('[InsightLens Extension] Deactivated: ${extensionId}');
}
`;

    const files = [
      { path: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
      { path: 'package.json', content: JSON.stringify(packageJson, null, 2) },
      { path: 'README.md', content: readmeContent },
      { path: 'index.js', content: indexJsContent }
    ];

    const zipBuffer = createZipBuffer(files);
    return {
      filename: `${extensionId}-v${version}.zip`,
      buffer: zipBuffer,
      contentType: 'application/zip',
      size: zipBuffer.length
    };
  }

  /**
   * Installs an extension for a user:
   * 1. Validates manifest.
   * 2. Sets is_installed = TRUE, is_enabled = FALSE (INSTALLED awaiting explicit Enable).
   * 3. Writes package to extensions/installed/<extension-id>/ on disk.
   * 4. Registers in PostgreSQL user_extensions.
   */
  async installExtension(userEmail, extensionId) {
    const builtin = BUILTIN_EXTENSIONS.find(e => e.id === extensionId);
    let manifest = builtin?.manifest;

    if (!manifest && pool) {
      const extRes = await pool.query('SELECT * FROM extensions WHERE id = $1', [extensionId]);
      if (extRes.rowCount > 0) {
        manifest = extRes.rows[0].manifest;
      }
    }

    if (!manifest) {
      throw new APIError(`Extension with ID "${extensionId}" not found.`, 404, 'ExtensionService');
    }

    // Validate manifest structure
    const validation = validateExtensionManifest(manifest);
    if (!validation.valid) {
      throw new APIError(`Invalid extension manifest: ${validation.errors.join(', ')}`, 400, 'ExtensionService');
    }

    const capabilities = manifest.capabilities || builtin?.capabilities || [];

    // Filesystem registration
    const targetFolder = path.join(INSTALLED_DIR, extensionId);
    try {
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
      fs.writeFileSync(path.join(targetFolder, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
      fs.writeFileSync(path.join(targetFolder, 'installed_meta.json'), JSON.stringify({
        installedBy: userEmail,
        installedAt: new Date().toISOString(),
        version: manifest.version || '1.0.0',
        capabilities,
        status: 'INSTALLED'
      }, null, 2), 'utf8');
    } catch (fsErr) {
      console.warn('[ExtensionService.installExtension] FS write notice:', fsErr.message);
    }

    // In-Memory store
    if (!pool) {
      this._getUserExtStore(userEmail).set(extensionId, {
        is_installed: true,
        is_enabled: false,
        installed_at: new Date().toISOString()
      });
      return {
        success: true,
        extensionId,
        is_installed: true,
        is_enabled: false,
        installedPath: targetFolder,
        capabilities
      };
    }

    // PostgreSQL registration (INSTALLED, NOT ENABLED)
    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled, installed_at, updated_at)
      VALUES ($1, $2, TRUE, FALSE, NOW(), NOW())
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_installed = TRUE,
        is_enabled = FALSE,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId]);

    return {
      success: true,
      extensionId,
      is_installed: true,
      is_enabled: false,
      userExtension: rows[0],
      installedPath: targetFolder,
      capabilities
    };
  }

  /**
   * Enables an installed extension for a user.
   */
  async enableExtension(userEmail, extensionId) {
    // 1. In-memory
    if (!pool) {
      const userStore = this._getUserExtStore(userEmail);
      userStore.set(extensionId, { is_installed: true, is_enabled: true });
      
      const activeState = await this.getActiveState(userEmail);
      const modes = new Set(activeState.activeModes || []);
      modes.add(extensionId);
      await this.updateActiveState(userEmail, { activeModes: Array.from(modes) });

      return {
        success: true,
        extensionId,
        is_installed: true,
        is_enabled: true
      };
    }

    // 2. PostgreSQL
    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled, updated_at)
      VALUES ($1, $2, TRUE, TRUE, NOW())
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_installed = TRUE,
        is_enabled = TRUE,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId]);

    // Update active modes if relevant
    const activeState = await this.getActiveState(userEmail);
    const modes = new Set(activeState.activeModes || []);
    modes.add(extensionId);
    await this.updateActiveState(userEmail, { activeModes: Array.from(modes) });

    return {
      success: true,
      extensionId,
      is_installed: true,
      is_enabled: true,
      userExtension: rows[0]
    };
  }

  /**
   * Disables an installed extension.
   * If the extension provided active UI elements (e.g. Theme Studio, Typography Lab, Layout Packs, or active modes),
   * reverts those elements back to system defaults.
   */
  async disableExtension(userEmail, extensionId) {
    // 1. In-memory
    if (!pool) {
      const userStore = this._getUserExtStore(userEmail);
      const prev = userStore.get(extensionId) || { is_installed: true };
      userStore.set(extensionId, { ...prev, is_enabled: false });

      const stateUpdates = {};
      const activeState = await this.getActiveState(userEmail);

      if (extensionId === 'theme-studio') stateUpdates.theme = 'midnight-research';
      if (extensionId === 'typography-lab') stateUpdates.typography = 'modern';
      if (extensionId === 'layout-packs') stateUpdates.layout = 'research-desk';

      const modes = new Set(activeState.activeModes || []);
      modes.delete(extensionId);
      stateUpdates.activeModes = Array.from(modes);

      const revertedState = await this.updateActiveState(userEmail, stateUpdates);

      return {
        success: true,
        extensionId,
        is_installed: true,
        is_enabled: false,
        revertedState
      };
    }

    // 2. PostgreSQL
    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled, updated_at)
      VALUES ($1, $2, TRUE, FALSE, NOW())
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_enabled = FALSE,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId]);

    // Revert active modes or styles if needed
    const stateUpdates = {};
    const activeState = await this.getActiveState(userEmail);

    if (extensionId === 'theme-studio') stateUpdates.theme = 'midnight-research';
    if (extensionId === 'typography-lab') stateUpdates.typography = 'modern';
    if (extensionId === 'layout-packs') stateUpdates.layout = 'research-desk';

    const modes = new Set(activeState.activeModes || []);
    modes.delete(extensionId);
    stateUpdates.activeModes = Array.from(modes);

    const revertedState = await this.updateActiveState(userEmail, stateUpdates);

    return {
      success: true,
      extensionId,
      is_installed: true,
      is_enabled: false,
      userExtension: rows[0],
      revertedState
    };
  }

  /**
   * Toggles enabled/disabled state of an installed extension.
   */
  async toggleExtension(userEmail, extensionId, enabled) {
    if (enabled) {
      return this.enableExtension(userEmail, extensionId);
    } else {
      return this.disableExtension(userEmail, extensionId);
    }
  }

  /**
   * Uninstalls an extension for a user:
   * 1. Removes extensions/installed/<extension-id>/ from disk.
   * 2. Updates PostgreSQL user_extensions table (is_installed = false, is_enabled = false).
   * 3. Reverts any dependent UI theme/typography/layout/modes to system default.
   */
  async uninstallExtension(userEmail, extensionId) {
    // 1. Filesystem cleanup
    const targetFolder = path.join(INSTALLED_DIR, extensionId);
    try {
      if (fs.existsSync(targetFolder)) {
        fs.rmSync(targetFolder, { recursive: true, force: true });
      }
    } catch (fsErr) {
      console.warn('[ExtensionService.uninstallExtension] FS cleanup notice:', fsErr.message);
    }

    // 2. Revert active states
    const stateUpdates = {};
    const activeState = await this.getActiveState(userEmail);

    if (extensionId === 'theme-studio') stateUpdates.theme = 'midnight-research';
    if (extensionId === 'typography-lab') stateUpdates.typography = 'modern';
    if (extensionId === 'layout-packs') stateUpdates.layout = 'research-desk';

    const modes = new Set(activeState.activeModes || []);
    modes.delete(extensionId);
    stateUpdates.activeModes = Array.from(modes);

    const revertedState = await this.updateActiveState(userEmail, stateUpdates);

    // 3. In-memory store
    if (!pool) {
      this._getUserExtStore(userEmail).set(extensionId, { is_installed: false, is_enabled: false });
      return {
        success: true,
        extensionId,
        is_installed: false,
        is_enabled: false,
        removedFromDisk: true,
        revertedState
      };
    }

    // 4. PostgreSQL
    const query = `
      INSERT INTO user_extensions (user_email, extension_id, is_installed, is_enabled, updated_at)
      VALUES ($1, $2, FALSE, FALSE, NOW())
      ON CONFLICT (user_email, extension_id) DO UPDATE SET
        is_installed = FALSE,
        is_enabled = FALSE,
        updated_at = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userEmail, extensionId]);

    return {
      success: true,
      extensionId,
      is_installed: false,
      is_enabled: false,
      userExtension: rows[0],
      removedFromDisk: true,
      revertedState
    };
  }

  /**
   * Updates settings for a specific extension.
   */
  async updateExtensionSettings(userEmail, extensionId, settingsJson) {
    if (!pool) {
      if (!this.inMemorySettings.has(userEmail)) this.inMemorySettings.set(userEmail, new Map());
      this.inMemorySettings.get(userEmail).set(extensionId, settingsJson);
      return { success: true, settings: settingsJson };
    }

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
   * Retrieves available layout packs list.
   */
  async getLayoutPacks() {
    if (!pool) return BUILTIN_LAYOUTS;
    const { rows } = await pool.query('SELECT * FROM layout_packs ORDER BY id ASC');
    return rows.length > 0 ? rows : BUILTIN_LAYOUTS;
  }

  /**
   * Retrieves the authoritative user UI preferences & active extension state from PostgreSQL.
   */
  async getActiveState(userEmail = 'guest@insightlens.edu') {
    const defaultState = {
      theme: 'midnight-research',
      typography: 'modern',
      layout: 'research-desk',
      activeTheme: 'midnight-research',
      activeTypography: 'modern',
      activeLayout: 'research-desk',
      activeModes: [],
      preferences: {}
    };

    if (!pool) {
      if (!this.inMemoryActiveState) this.inMemoryActiveState = new Map();
      const prefs = this.inMemoryActiveState.get(userEmail) || defaultState;
      return prefs;
    }

    try {
      const { rows } = await pool.query(`
        SELECT theme_slug as theme, typography_slug as typography, layout_slug as layout, active_modes, preferences_json as preferences
        FROM user_ui_preferences
        WHERE user_email = $1
      `, [userEmail]);

      if (rows.length > 0) {
        return {
          theme: rows[0].theme || 'midnight-research',
          typography: rows[0].typography || 'modern',
          layout: rows[0].layout || 'research-desk',
          activeTheme: rows[0].theme || 'midnight-research',
          activeTypography: rows[0].typography || 'modern',
          activeLayout: rows[0].layout || 'research-desk',
          activeModes: rows[0].active_modes || [],
          preferences: rows[0].preferences || {}
        };
      }

      return defaultState;
    } catch (err) {
      console.warn('[ExtensionService.getActiveState] Notice:', err.message);
      return defaultState;
    }
  }

  /**
   * Persists authoritative user UI preferences & active extension state into PostgreSQL.
   */
  async updateActiveState(userEmail = 'guest@insightlens.edu', updates = {}) {
    const theme = updates.theme !== undefined ? updates.theme : updates.activeTheme;
    const typography = updates.typography !== undefined ? updates.typography : updates.activeTypography;
    const layout = updates.layout !== undefined ? updates.layout : updates.activeLayout;
    const activeModes = updates.activeModes !== undefined ? updates.activeModes : updates.modes;
    const preferences = updates.preferences !== undefined ? updates.preferences : undefined;

    if (!pool) {
      if (!this.inMemoryActiveState) this.inMemoryActiveState = new Map();
      const prev = this.inMemoryActiveState.get(userEmail) || {
        theme: 'midnight-research',
        typography: 'modern',
        layout: 'research-desk',
        activeModes: [],
        preferences: {}
      };
      const nextState = {
        theme: theme !== undefined ? theme : prev.theme,
        typography: typography !== undefined ? typography : prev.typography,
        layout: layout !== undefined ? layout : prev.layout,
        activeModes: activeModes !== undefined ? activeModes : prev.activeModes,
        preferences: preferences !== undefined ? preferences : prev.preferences
      };
      this.inMemoryActiveState.set(userEmail, nextState);
      return nextState;
    }

    const query = `
      INSERT INTO user_ui_preferences (user_email, theme_slug, typography_slug, layout_slug, active_modes, preferences_json, updated_at)
      VALUES ($1, COALESCE($2, 'midnight-research'), COALESCE($3, 'modern'), COALESCE($4, 'research-desk'), COALESCE($5::jsonb, '[]'::jsonb), COALESCE($6::jsonb, '{}'::jsonb), NOW())
      ON CONFLICT (user_email) DO UPDATE SET
        theme_slug = COALESCE($2, user_ui_preferences.theme_slug),
        typography_slug = COALESCE($3, user_ui_preferences.typography_slug),
        layout_slug = COALESCE($4, user_ui_preferences.layout_slug),
        active_modes = CASE WHEN $5::jsonb IS NOT NULL THEN $5::jsonb ELSE user_ui_preferences.active_modes END,
        preferences_json = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE user_ui_preferences.preferences_json END,
        updated_at = NOW()
      RETURNING theme_slug as theme, typography_slug as typography, layout_slug as layout, active_modes, preferences_json as preferences;
    `;

    const { rows } = await pool.query(query, [
      userEmail,
      theme || null,
      typography || null,
      layout || null,
      activeModes ? JSON.stringify(activeModes) : null,
      preferences ? JSON.stringify(preferences) : null
    ]);

    return rows[0];
  }
}

export default new ExtensionService();
