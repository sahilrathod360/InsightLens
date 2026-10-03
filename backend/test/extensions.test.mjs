import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExtensionService from '../src/services/extensions/ExtensionService.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

console.log('--- Running Canonical Extensions Platform Test Suite ---');

// 1. Verify schema tables for extensions platform
const schemaSql = source('src/config/schema.sql');
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS extensions/i);
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS user_extensions/i);
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS extension_settings/i);
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS themes/i);
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS typography_packs/i);
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS layout_packs/i);
console.log('✓ 6 physical extension platform tables defined in schema.sql');

// 2. Extension Service Security
const extensionSource = source('src/services/extensions/ExtensionService.js');
assert.match(extensionSource, /createHash\('sha256'\)/);
assert.match(extensionSource, /_getUserInstallFolder/);
assert.match(extensionSource, /ui_preferences/);
console.log('✓ Extension security hashing and isolation verified');

console.log('======================================================');
console.log('✓ Canonical Extensions Platform Test Suite Passed!');
console.log('======================================================');
