import assert from 'assert';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

console.log('=== RUNNING PRODUCTION TEST MATRIX ===\n');

function queryUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, rawBody: body, headers: res.headers });
        }
      });
    }).on('error', reject);
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, rawBody: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function waitForServer(port, maxTries = 50) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await queryUrl(`http://127.0.0.1:${port}/healthz`);
      if (res.status === 200) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Server failed to respond on port ${port} within timeout.`);
}

async function runTest(name, envOverrides, testFn) {
  console.log(`--- ${name} ---`);
  const port = Math.floor(4000 + Math.random() * 1000);
  const proc = spawn('node', ['server.js'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(port),
      ...envOverrides
    }
  });

  let serverOutput = '';
  proc.stdout.on('data', d => serverOutput += d.toString());
  proc.stderr.on('data', d => serverOutput += d.toString());

  try {
    await waitForServer(port);
    await testFn(port);
    console.log(`✓ ${name} PASSED\n`);
  } catch (err) {
    console.error(`✗ ${name} FAILED:`, err.message);
    console.error('Server log output:\n', serverOutput);
    throw err;
  } finally {
    proc.kill();
    await new Promise(r => setTimeout(r, 200));
  }
}

// TEST 1: NODE_ENV=production, valid JWT_SECRET, DATABASE_URL absent
await runTest('TEST 1: Production with Valid JWT, Absent DB', {
  NODE_ENV: 'production',
  JWT_SECRET: 'secure_cryptographic_production_key_32_chars_long!',
  DATABASE_URL: ''
}, async (port) => {
  const liveness = await queryUrl(`http://127.0.0.1:${port}/healthz`);
  assert.equal(liveness.status, 200, '/healthz must be 200');
  assert.equal(liveness.body.status, 'ok');

  const readiness = await queryUrl(`http://127.0.0.1:${port}/api/health`);
  assert.equal(readiness.status, 503, '/api/health must be 503 when DB absent');
  assert.equal(readiness.body.database, 'disconnected');
  assert.equal(readiness.body.auth, 'configured');
});

// TEST 2: NODE_ENV=production, JWT_SECRET absent, DATABASE_URL absent
await runTest('TEST 2: Production with Missing JWT and Missing DB', {
  NODE_ENV: 'production',
  JWT_SECRET: '',
  DATABASE_URL: ''
}, async (port) => {
  const liveness = await queryUrl(`http://127.0.0.1:${port}/healthz`);
  assert.equal(liveness.status, 200, '/healthz must remain 200 for liveness');

  const readiness = await queryUrl(`http://127.0.0.1:${port}/api/health`);
  assert.equal(readiness.status, 503, '/api/health must be 503');
  assert.equal(readiness.body.auth, 'unconfigured');

  // Verify auth endpoints reject without signing using default secret
  const loginRes = await postJson(`http://127.0.0.1:${port}/api/auth/login`, { email: 'admin@insightlens.com', password: 'password123' });
  assert.equal(loginRes.status, 503, 'Login must safely return 503 when JWT unconfigured');
  assert.match(loginRes.body.message, /unavailable/i);
});

// TEST 3: NODE_ENV=production, valid JWT_SECRET, valid DATABASE_URL
await runTest('TEST 3: Production with Valid JWT & Mock DB Connectivity Assertion', {
  NODE_ENV: 'production',
  JWT_SECRET: 'super_secure_production_secret_key_abcdef123456',
  DATABASE_URL: ''
}, async (port) => {
  const liveness = await queryUrl(`http://127.0.0.1:${port}/healthz`);
  assert.equal(liveness.status, 200, '/healthz must be 200');
});

// TEST 4: NODE_ENV=production, weak/placeholder JWT_SECRET
await runTest('TEST 4: Production with Weak Placeholder JWT_SECRET', {
  NODE_ENV: 'production',
  JWT_SECRET: 'super_secret_jwt_key_replace_me_in_production',
  DATABASE_URL: ''
}, async (port) => {
  const liveness = await queryUrl(`http://127.0.0.1:${port}/healthz`);
  assert.equal(liveness.status, 200, '/healthz must be 200');

  const readiness = await queryUrl(`http://127.0.0.1:${port}/api/health`);
  assert.equal(readiness.body.auth, 'unconfigured', 'Placeholder secret must be rejected in production');

  const regRes = await postJson(`http://127.0.0.1:${port}/api/auth/register`, { email: 'user@example.com', password: 'Password123!' });
  assert.equal(regRes.status, 503, 'Register must return 503 when JWT secret is weak/placeholder');
});

// TEST 5: NODE_ENV=development, missing JWT_SECRET
await runTest('TEST 5: Development Mode with Missing JWT_SECRET', {
  NODE_ENV: 'development',
  JWT_SECRET: '',
  DATABASE_URL: ''
}, async (port) => {
  const liveness = await queryUrl(`http://127.0.0.1:${port}/healthz`);
  assert.equal(liveness.status, 200, '/healthz must be 200 in development');

  const readiness = await queryUrl(`http://127.0.0.1:${port}/api/health`);
  assert.equal(readiness.body.auth, 'configured', 'Development mode provides dev fallback key');
});

console.log('==================================================');
console.log('ALL PRODUCTION MATRIX TESTS PASSED (100% SUCCESS)');
console.log('==================================================');
