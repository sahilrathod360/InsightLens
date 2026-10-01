/**
 * Extension Manifest Validator
 * Strictly validates extension manifests against safety boundaries and schema specifications.
 * Prohibits unsafe code injection, arbitrary script strings, and unapproved capabilities.
 */

export const ALLOWED_CATEGORIES = [
  'Themes',
  'Typography',
  'Layouts',
  'Analysis',
  'Research',
  'Productivity',
  'Experimental'
];

export const ALLOWED_CAPABILITIES = [
  'themes',
  'ui_styling',
  'color_palette',
  'typography',
  'font_pairing',
  'text_hierarchy',
  'layout_modes',
  'viewport_structure',
  'contextual_hints',
  'workflow_guidance',
  'academic_workflows',
  'citation_tools',
  'methodology_shortcuts',
  'presentation_view',
  'slide_navigation',
  'clean_display',
  'minimal_ui',
  'distraction_free',
  'zen_analysis',
  'raw_json_inspector',
  'telemetry_console',
  'schema_validator',
  'claim_organizer',
  'source_matrix',
  'evidence_workbench',
  'experimental_sandbox',
  'early_access_tools',
  'prototype_lab'
];

export function validateExtensionManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null JSON object.'] };
  }

  // 1. Mandatory Identity Fields
  if (!manifest.id || typeof manifest.id !== 'string' || !/^[a-z0-9-_]{3,80}$/.test(manifest.id)) {
    errors.push('Manifest "id" must be a lowercase alphanumeric hyphenated string (3-80 chars).');
  }

  if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.length < 2 || manifest.name.length > 100) {
    errors.push('Manifest "name" must be a string between 2 and 100 characters.');
  }

  if (!manifest.version || typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push('Manifest "version" must follow semver format (e.g. 1.0.0).');
  }

  if (!manifest.description || typeof manifest.description !== 'string') {
    errors.push('Manifest "description" is required.');
  }

  if (!manifest.category || !ALLOWED_CATEGORIES.includes(manifest.category)) {
    errors.push(`Manifest "category" must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
  }

  // 2. Controlled Capabilities Check
  if (manifest.capabilities) {
    if (!Array.isArray(manifest.capabilities)) {
      errors.push('Manifest "capabilities" must be an array of strings.');
    } else {
      for (const cap of manifest.capabilities) {
        if (!ALLOWED_CAPABILITIES.includes(cap)) {
          errors.push(`Unrecognized or unpermitted capability requested: "${cap}".`);
        }
      }
    }
  }

  // 3. Strict Security Prohibitions (No raw JS strings, eval, or unsafe DOM handlers)
  const serialized = JSON.stringify(manifest);
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /data:text\/html/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(serialized)) {
      errors.push(`Security violation: Manifest contains prohibited dangerous code pattern (${pattern}).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
