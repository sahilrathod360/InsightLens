import http from 'node:http';
import app from '../app.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';

async function testAllEndpoints() {
  console.log('======================================================');
  console.log('--- Testing All API Endpoints & Auth Guards ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Generate a valid test JWT
  const testEmail = 'researcher_test@insightlens.edu';
  const testToken = jwt.sign(
    { id: '11111111-2222-3333-4444-555555555555', email: testEmail, role: 'Researcher' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  // 1. Health Endpoints
  console.log('[Test 1] Healthz and API Health...');
  const resHealthz = await fetch(`${baseUrl}/healthz`);
  assert(resHealthz.status === 200, 'GET /healthz returned 200');

  const resApiHealth = await fetch(`${baseUrl}/api/health`);
  assert(resApiHealth.status === 200 || resApiHealth.status === 503, 'GET /api/health returned valid status');
  const healthBody = await resApiHealth.json();
  assert(healthBody.status !== undefined, 'Health check returns status field');

  // 2. Auth Guard Verification on Sensitive Routes (Unauthenticated Rejections)
  console.log('\n[Test 2] Auth Guards: Rejecting Unauthenticated Requests...');
  const protectedRoutes = [
    { method: 'POST', path: '/api/analyze' },
    { method: 'GET', path: '/api/report/latest' },
    { method: 'GET', path: '/api/archive' },
    { method: 'GET', path: '/api/dashboard/stats' },
    { method: 'GET', path: '/api/history' },
    { method: 'GET', path: '/api/settings/profile' },
    { method: 'POST', path: '/api/comparison' },
    { method: 'POST', path: '/api/consistency' },
    { method: 'POST', path: '/api/visual-qa' },
    { method: 'GET', path: '/api/workspace' },
    { method: 'POST', path: '/api/live-vision' },
    { method: 'POST', path: '/api/regions' },
    { method: 'POST', path: '/api/guess' },
    { method: 'POST', path: '/api/narration' }
  ];

  for (const route of protectedRoutes) {
    const res = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: { 'Content-Type': 'application/json' },
      body: route.method === 'POST' ? JSON.stringify({}) : undefined
    });
    assert(res.status === 401, `${route.method} ${route.path} rejected with 401 Unauthorized`);
  }

  // 3. Extensions Catalog (optionalAuth allows catalog discovery)
  console.log('\n[Test 3] Extensions Catalog API...');
  const resExt = await fetch(`${baseUrl}/api/extensions`);
  assert(resExt.status === 200, 'GET /api/extensions returned 200');
  const extBody = await resExt.json();
  assert(extBody.success === true, 'Catalog response has success: true');
  assert(Array.isArray(extBody.data?.extensions), 'Catalog extensions is an array');

  // 4. Rate Limiting Check on Auth Routes
  console.log('\n[Test 4] Hardened Auth Rate Limiting Verification...');
  const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@user.com', password: 'wrongpassword' })
  });
  const rateLimitHeader = resLogin.headers.get('ratelimit-limit') || resLogin.headers.get('x-ratelimit-limit');
  assert(rateLimitHeader !== null, 'RateLimit header present');
  assert(rateLimitHeader === '15', `Rate limit confirmed hardened to 15 (got: ${rateLimitHeader})`);

  // 5. SSRF Defense Checks
  console.log('\n[Test 5] SSRF Defense Verification...');
  const { safeFetchCitation } = await import('../src/utils/ssrfValidator.js');
  const privateIpResult = await safeFetchCitation('http://127.0.0.1:8080/admin');
  assert(privateIpResult.reachable === false, 'Blocked loopback IP (127.0.0.1)');

  const awsMetadataResult = await safeFetchCitation('http://169.254.169.254/latest/meta-data/');
  assert(awsMetadataResult.reachable === false, 'Blocked cloud metadata IP (169.254.169.254)');

  const lanResult = await safeFetchCitation('http://192.168.1.1/');
  assert(lanResult.reachable === false, 'Blocked RFC 1918 private IP (192.168.1.1)');

  server.close();

  console.log('\n======================================================');
  console.log(`--- Test Suite Results: ${passed} / ${passed + failed} Passed (${failed} Failed) ---`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

testAllEndpoints().catch(err => {
  console.error('[FATAL ENDPOINT TEST ERROR]', err);
  process.exit(1);
});
