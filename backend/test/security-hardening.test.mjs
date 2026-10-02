import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimizeImage } from '../src/utils/imageOptimizer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const appSource = source('app.js');
const authSource = source('src/middleware/auth.js');
const corsSource = source('src/config/cors.js');
const extensionSource = source('src/services/extensions/ExtensionService.js');
const sanitizerSource = fs.readFileSync(path.resolve(root, '../frontend/src/utils/sanitize.js'), 'utf8');

assert.match(appSource, /app\.use\('\/api\/comparison', requireAuth, comparisonRoutes\)/);
assert.match(appSource, /app\.use\('\/api\/workspace', requireAuth, workspaceRoutes\)/);
assert.match(appSource, /app\.use\('\/api\/live-vision', requireAuth, liveVisionRoutes\)/);
assert.doesNotMatch(authSource, /email:\s*['"]guest@insightlens\.edu['"]/);
assert.match(corsSource, /process\.env\.NODE_ENV !== 'production'/);
assert.match(extensionSource, /createHash\('sha256'\)/);
assert.match(extensionSource, /_getUserInstallFolder/);
assert.match(sanitizerSource, /data:image.*jpeg\|jpg\|png\|webp.*base64/);

await assert.rejects(
  optimizeImage('data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+'),
  /Malformed dataUrl|Unsupported file format/
);
await assert.rejects(
  optimizeImage(`data:image/png;base64,${'A'.repeat(1024 * 1024 * 40)}`),
  /file size|Malformed dataUrl|corrupted|valid image/i
);

console.log('Security hardening regression checks passed.');
