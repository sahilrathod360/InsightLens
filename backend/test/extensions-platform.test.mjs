import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateExtensionManifest } from '../src/services/extensions/ExtensionManifestValidator.js';
import ExtensionService from '../src/services/extensions/ExtensionService.js';
import { BUILTIN_EXTENSIONS, BUILTIN_THEMES, BUILTIN_TYPOGRAPHY, BUILTIN_LAYOUTS } from '../src/services/extensions/BuiltinExtensions.js';

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

  // 3. Built-in Extensions Catalog Integrity
  it('should contain all 10 standard built-in extensions with valid manifests', () => {
    assert.equal(BUILTIN_EXTENSIONS.length, 10);
    const expectedIds = [
      'theme-studio',
      'typography-lab',
      'ui-layouts',
      'hint-engine',
      'academic-mode',
      'presentation-mode',
      'focus-mode',
      'developer-mode',
      'research-mode',
      'playground'
    ];

    for (const expectedId of expectedIds) {
      const ext = BUILTIN_EXTENSIONS.find(e => e.id === expectedId);
      assert.ok(ext, `Built-in extension ${expectedId} must exist`);
      const val = validateExtensionManifest(ext.manifest);
      assert.equal(val.valid, true, `Manifest for ${expectedId} must be valid`);
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

  // 5. Extension Lifecycle Management
  it('should support listing, installing, enabling, disabling, and updating extension settings', async () => {
    const list = await ExtensionService.listExtensionsForUser('test@insightlens.edu');
    assert.ok(list.length >= 10);

    const installRes = await ExtensionService.installExtension('test@insightlens.edu', 'theme-studio');
    assert.equal(installRes.success, true);

    const toggleRes = await ExtensionService.toggleExtension('test@insightlens.edu', 'theme-studio', false);
    assert.equal(toggleRes.success, true);

    const settingsRes = await ExtensionService.updateExtensionSettings('test@insightlens.edu', 'hint-engine', { frequency: 'high' });
    assert.equal(settingsRes.success, true);
  });
});
