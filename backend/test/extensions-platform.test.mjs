import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateExtensionManifest } from '../src/services/extensions/ExtensionManifestValidator.js';
import ExtensionService from '../src/services/extensions/ExtensionService.js';
import { BUILTIN_EXTENSIONS, BUILTIN_THEMES, BUILTIN_TYPOGRAPHY, BUILTIN_LAYOUTS } from '../src/services/extensions/BuiltinExtensions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Extensions Platform & Security Suite', () => {
  // 1. Manifest Validation
  it('should validate valid extension manifests and reject malformed manifests', () => {
    const validManifest = {
      id: 'custom-analyzer',
      name: 'Custom Domain Analyzer',
      version: '1.0.0',
      description: 'Domain analysis extension for research briefs.',
      author: 'Research Lab',
      category: 'Analysis',
      capabilities: ['academic_workflows', 'citation_tools']
    };

    const validCheck = validateExtensionManifest(validManifest);
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.errors.length, 0);

    const invalidManifest = {
      id: 'BAD ID WITH SPACES',
      name: 'A',
      version: 'invalid-version',
      category: 'UnapprovedCategory',
      capabilities: ['arbitrary_unsafe_exec']
    };

    const invalidCheck = validateExtensionManifest(invalidManifest);
    assert.equal(invalidCheck.valid, false);
    assert.ok(invalidCheck.errors.length >= 4);
  });

  // 2. Security Prohibitions (No raw JS / script injections in manifest)
  it('should strictly reject manifests containing script tags or dangerous code patterns', () => {
    const unsafeManifest = {
      id: 'malicious-extension',
      name: 'Malicious Plugin',
      version: '1.0.0',
      description: '<script>alert("xss")</script>',
      category: 'Themes',
      capabilities: ['themes']
    };

    const check = validateExtensionManifest(unsafeManifest);
    assert.equal(check.valid, false);
    assert.ok(check.errors.some(err => err.includes('Security violation')));
  });

  // 3. Built-in Extensions Catalog Integrity & Filesystem Manifests
  it('should contain all 10 standard built-in extensions with valid manifests on disk', () => {
    assert.equal(BUILTIN_EXTENSIONS.length, 10);
    const expectedIds = [
      'theme-studio',
      'typography-lab',
      'layout-packs',
      'hint-engine',
      'academic-mode',
      'presentation-mode',
      'focus-mode',
      'developer-mode',
      'research-mode',
      'prompt-playground'
    ];

    for (const expectedId of expectedIds) {
      const ext = BUILTIN_EXTENSIONS.find(e => e.id === expectedId);
      assert.ok(ext, `Built-in extension ${expectedId} must exist`);
      const val = validateExtensionManifest(ext.manifest);
      assert.equal(val.valid, true, `Manifest for ${expectedId} must be valid`);
    }

    // Check disk manifests in extensions/built-in
    const rootBuiltin = path.resolve(__dirname, '../../extensions/built-in');
    if (fs.existsSync(rootBuiltin)) {
      const folders = fs.readdirSync(rootBuiltin);
      assert.ok(folders.length >= 10, 'All 10 built-in folders must exist on disk');
      for (const folder of folders) {
        const manifestPath = path.join(rootBuiltin, folder, 'manifest.json');
        assert.ok(fs.existsSync(manifestPath), `Manifest must exist at ${manifestPath}`);
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        assert.ok(parsed.id && parsed.name, `Parsed manifest for ${folder} must have id and name`);
      }
    }
  });

  // 4. Bundled Themes, Typography, and Layouts
  it('should provide 5 polished themes, 5 typography packs, and 5 UI layout modes', () => {
    assert.equal(BUILTIN_THEMES.length, 5);
    const themeSlugs = BUILTIN_THEMES.map(t => t.slug);
    assert.ok(themeSlugs.includes('midnight-research'));
    assert.ok(themeSlugs.includes('neo-glass'));
    assert.ok(themeSlugs.includes('terminal'));
    assert.ok(themeSlugs.includes('paper'));
    assert.ok(themeSlugs.includes('solarized-lab'));

    assert.equal(BUILTIN_TYPOGRAPHY.length, 5);
    const typoSlugs = BUILTIN_TYPOGRAPHY.map(t => t.slug);
    assert.ok(typoSlugs.includes('academic'));
    assert.ok(typoSlugs.includes('editorial'));
    assert.ok(typoSlugs.includes('technical'));
    assert.ok(typoSlugs.includes('modern'));
    assert.ok(typoSlugs.includes('minimal'));

    assert.equal(BUILTIN_LAYOUTS.length, 5);
    const layoutSlugs = BUILTIN_LAYOUTS.map(l => l.slug);
    assert.ok(layoutSlugs.includes('command-center'));
    assert.ok(layoutSlugs.includes('research-desk'));
    assert.ok(layoutSlugs.includes('minimal-workspace'));
    assert.ok(layoutSlugs.includes('analysis-lab'));
    assert.ok(layoutSlugs.includes('presentation-board'));
  });

  // 5. Complete Lifecycle: INSTALL -> ENABLE -> USE -> DISABLE -> ENABLE -> UNINSTALL
  it('should execute full extension lifecycle with filesystem and database synchronization', async () => {
    const userEmail = `lifecycle-user-${Date.now()}@insightlens.edu`;
    const extId = 'theme-studio';

    // 1. INSTALL
    const installRes = await ExtensionService.installExtension(userEmail, extId);
    assert.equal(installRes.success, true);
    assert.ok(installRes.installedPath, 'Install must report target installed path on disk');
    assert.ok(fs.existsSync(installRes.installedPath), 'Installed directory must physically exist on disk');
    assert.ok(fs.existsSync(path.join(installRes.installedPath, 'manifest.json')), 'manifest.json must exist in installed folder');

    // 2. ENABLE
    const enableRes1 = await ExtensionService.toggleExtension(userEmail, extId, true);
    assert.equal(enableRes1.success, true);

    // 3. USE (Get available themes)
    const themes = await ExtensionService.getThemes();
    assert.ok(themes.length >= 5, 'Must provide available themes for use');

    // 4. DISABLE
    const disableRes = await ExtensionService.toggleExtension(userEmail, extId, false);
    assert.equal(disableRes.success, true);

    // 5. RE-ENABLE
    const enableRes2 = await ExtensionService.toggleExtension(userEmail, extId, true);
    assert.equal(enableRes2.success, true);

    // 6. UNINSTALL
    const uninstallRes = await ExtensionService.uninstallExtension(userEmail, extId);
    assert.equal(uninstallRes.success, true);
    assert.equal(uninstallRes.removedFromDisk, true);
    assert.strictEqual(fs.existsSync(installRes.installedPath), false, 'Installed directory must be removed from disk after uninstall');

    // Built-in source package must remain untouched
    const rootBuiltin = path.resolve(__dirname, '../../extensions/built-in/theme-studio/manifest.json');
    if (fs.existsSync(path.dirname(rootBuiltin))) {
      assert.ok(fs.existsSync(rootBuiltin), 'Built-in source manifest must NEVER be deleted upon uninstall');
    }
  });

  // 6. Authoritative PostgreSQL UI & Extension State Persistence
  it('should persist and retrieve authoritative active UI state from PostgreSQL', async () => {
    const userEmail = `pref-user-${Date.now()}@insightlens.edu`;

    // 1. Initial default state
    const initial = await ExtensionService.getActiveState(userEmail);
    assert.ok(initial.theme);
    assert.ok(initial.typography);
    assert.ok(initial.layout);

    // 2. Update to custom theme and typography
    const updated = await ExtensionService.updateActiveState(userEmail, {
      theme: 'paper',
      typography: 'academic',
      layout: 'command-center',
      activeModes: ['academic-mode', 'hint-engine']
    });
    assert.equal(updated.theme, 'paper');
    assert.equal(updated.typography, 'academic');
    assert.equal(updated.layout, 'command-center');

    // 3. Retrieve authoritative state to verify persistence
    const reloaded = await ExtensionService.getActiveState(userEmail);
    assert.equal(reloaded.theme, 'paper');
    assert.equal(reloaded.typography, 'academic');
    assert.equal(reloaded.layout, 'command-center');
    assert.ok(Array.isArray(reloaded.activeModes));
    assert.ok(reloaded.activeModes.includes('academic-mode'));
  });
});
