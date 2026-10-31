import fs from 'node:fs';

const PROD_URL = 'https://insightlens-backend.onrender.com';

async function runLiveProductionSmoke() {
  console.log('=================================================================');
  console.log('--- InsightLens: Live Production User Journey & Smoke Test ---');
  console.log(`    Target: ${PROD_URL}`);
  console.log('=================================================================\n');

  const results = [];

  // 1. Health & Database Table Count
  console.log('>>> [Step 1] Probing Live Health & Schema Metrics...');
  const healthRes = await fetch(`${PROD_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('    Response Status:', healthRes.status);
  console.log('    Database Status:', healthData.database);
  console.log('    Deployed Commit:', healthData.commit);
  console.log('    Active Production Table Count:', healthData.tableCount);

  if (healthRes.status !== 200 || healthData.tableCount !== 15 || healthData.database !== 'connected') {
    throw new Error(`Production health check failed: status ${healthRes.status}, tables: ${healthData.tableCount}`);
  }
  results.push({ test: 'Health & Database Connected (15 Tables)', status: 'PASS' });

  // 2. Disabled Backup Security Check
  console.log('\n>>> [Step 2] Probing Disabled Database Backup Endpoint...');
  const backupPostRes = await fetch(`${PROD_URL}/api/audit/db-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetTables: ['users'] })
  });
  const backupPostData = await backupPostRes.json();
  console.log('    POST /api/audit/db-backup Status:', backupPostRes.status, backupPostData.error);

  const backupGetRes = await fetch(`${PROD_URL}/api/audit/db-backup`);
  const backupGetData = await backupGetRes.json();
  console.log('    GET /api/audit/db-backup Status:', backupGetRes.status, backupGetData.error);

  if (backupPostRes.status !== 403 || backupGetRes.status !== 403) {
    throw new Error('Security vulnerability: Backup endpoint is not returning 403!');
  }
  results.push({ test: 'Security: Backup Endpoint Disabled (403 on GET/POST)', status: 'PASS' });

  // 3. Extensions Catalog (Public / Optional Auth)
  console.log('\n>>> [Step 3] Fetching Extensions Platform Catalog...');
  const extRes = await fetch(`${PROD_URL}/api/extensions`);
  const extData = await extRes.json();
  const extensionsList = extData.data?.extensions || extData.extensions || [];
  console.log('    Extensions Status:', extRes.status);
  console.log('    Catalog Count:', extensionsList.length);

  if (extRes.status !== 200 || !Array.isArray(extensionsList) || extensionsList.length === 0) {
    throw new Error('Extensions catalog retrieval failed.');
  }
  results.push({ test: 'Extensions Catalog Available', status: 'PASS', count: extensionsList.length });

  // 4. Auth Protection on Sensitive Endpoints
  console.log('\n>>> [Step 4] Verifying Route Guards for Unauthenticated Requests...');
  const protectedRoutes = [
    { method: 'POST', path: '/api/analyze' },
    { method: 'GET', path: '/api/report/latest' },
    { method: 'GET', path: '/api/archive' },
    { method: 'GET', path: '/api/dashboard' },
    { method: 'GET', path: '/api/settings/profile' }
  ];

  for (const route of protectedRoutes) {
    const res = await fetch(`${PROD_URL}${route.path}`, { method: route.method });
    console.log(`    ${route.method} ${route.path} -> ${res.status}`);
    if (res.status !== 401) {
      throw new Error(`Route guard failed on ${route.path}: expected 401, got ${res.status}`);
    }
  }
  results.push({ test: 'Auth Guards: Protected Routes Return 401 for Unauthenticated Requests', status: 'PASS' });

  // 5. Test Live User Registration, Login & Session
  console.log('\n>>> [Step 5] Testing Real User Registration & Login Flow...');
  const testEmail = `e2e_live_audit_${Date.now()}@insightlens.edu`;
  const testPassword = 'TestPassword123!@#Secure';
  const testName = 'Live Audit Researcher';

  const regRes = await fetch(`${PROD_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: testName
    })
  });
  const regData = await regRes.json();
  console.log('    Register Status:', regRes.status, regData.success ? 'SUCCESS' : regData.message);

  let authToken = regData.token || regData.data?.token;

  if (!authToken) {
    // Attempt login if registration already exists
    const loginRes = await fetch(`${PROD_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    authToken = loginData.token || loginData.data?.token;
    console.log('    Login Status:', loginRes.status, loginData.success ? 'SUCCESS' : loginData.message);
  }

  if (!authToken) {
    throw new Error('Failed to obtain authentication token from live backend.');
  }
  console.log('    ✓ Live Authentication Token obtained successfully.');
  results.push({ test: 'User Registration & Login Flow', status: 'PASS' });

  // 6. Test Authenticated Dashboard & Archive
  console.log('\n>>> [Step 6] Testing Authenticated Archive & Dashboard Access...');
  const authHeaders = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const dashRes = await fetch(`${PROD_URL}/api/dashboard`, { headers: authHeaders });
  const dashData = await dashRes.json();
  console.log('    Dashboard Stats Status:', dashRes.status);
  console.log('    Dashboard Data:', dashData.success ? 'SUCCESS' : dashData);

  const archRes = await fetch(`${PROD_URL}/api/archive`, { headers: authHeaders });
  const archData = await archRes.json();
  console.log('    Archive Retrieval Status:', archRes.status);
  console.log('    User Reports Count:', archData.reports?.length || 0);

  if (dashRes.status !== 200 || archRes.status !== 200) {
    throw new Error('Failed to access authenticated dashboard or archive.');
  }
  results.push({ test: 'Authenticated Dashboard & Archive Access', status: 'PASS' });

  // 7. Test User Settings Retrieval and Update
  console.log('\n>>> [Step 7] Testing User Settings Retrieval & Persistence...');
  const settingsRes = await fetch(`${PROD_URL}/api/settings`, { headers: authHeaders });
  const settingsData = await settingsRes.json();
  console.log('    Settings Status:', settingsRes.status);

  const updateRes = await fetch(`${PROD_URL}/api/settings`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      preferences: {
        theme: 'dark',
        citationStyle: 'APA',
        researchLength: 'long'
      }
    })
  });
  console.log('    Settings Update Status:', updateRes.status);

  if (settingsRes.status !== 200 || updateRes.status !== 200) {
    throw new Error('Settings persistence failed.');
  }
  results.push({ test: 'User Settings Retrieval & Update', status: 'PASS' });

  console.log('\n=================================================================');
  console.log('--- Live Production User Journey Verification Complete ---');
  console.table(results);
  console.log('=================================================================\n');

  return results;
}

runLiveProductionSmoke()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Smoke test failure:', err.message);
    process.exit(1);
  });
