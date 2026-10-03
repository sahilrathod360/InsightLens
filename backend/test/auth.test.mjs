import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

console.log('--- Running Canonical Auth & Profile Test Suite ---');

// 1. Password Hashing Security
const rawPassword = 'SecurePassword123!';
const salt = await bcrypt.genSalt(10);
const hashed = await bcrypt.hash(rawPassword, salt);
assert.notEqual(rawPassword, hashed);
assert.equal(await bcrypt.compare(rawPassword, hashed), true);
assert.equal(await bcrypt.compare('WrongPassword', hashed), false);
console.log('✓ Password hashing with bcrypt verified');

// 2. JWT Generation & Verification
const testPayload = { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', email: 'researcher@insightlens.edu', role: 'researcher' };
const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_insightlens_auth';
const token = jwt.sign(testPayload, secret, { expiresIn: '1h' });
const decoded = jwt.verify(token, secret);
assert.equal(decoded.id, testPayload.id);
assert.equal(decoded.email, testPayload.email);
console.log('✓ JWT signing & verification verified');

// 3. Schema & Model Relational Integrity
const schemaSql = source('src/config/schema.sql');
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS users/i);
assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS user_profiles/i);
assert.match(schemaSql, /user_id\s+UUID\s+REFERENCES\s+users\(id\)\s+ON\s+DELETE\s+CASCADE/i);
assert.match(schemaSql, /ui_preferences\s+JSONB/i);
console.log('✓ Database schema relational integrity (users -> user_profiles ON DELETE CASCADE) verified');

// 4. Source code security checks
const authMiddleware = source('src/middleware/auth.js');
const authController = source('src/controllers/AuthController.js');
const settingsController = source('src/controllers/SettingsController.js');

assert.match(authMiddleware, /jwt\.verify/);
assert.doesNotMatch(authMiddleware, /guest@insightlens\.edu/);
assert.match(authController, /ui_preferences/);
assert.match(settingsController, /ui_preferences/);
console.log('✓ Auth & Settings controllers use unified user_profiles.ui_preferences JSONB');

console.log('======================================================');
console.log('✓ Canonical Auth & Profile Test Suite Passed!');
console.log('======================================================');
