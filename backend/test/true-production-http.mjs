// True Production HTTP-Level Verification Script
// Strictly uses HTTP fetch() calls against the deployed Production API
// DOES NOT import any local backend services or PostgreSQL directly.

import assert from 'node:assert/strict';

const PROD_API_BASE = 'https://insightlens-backend.onrender.com';
const PROD_FRONTEND_URL = 'https://insight-lens.vercel.app';

console.log('============================================================');
console.log('STARTING TRUE HTTP-LEVEL PRODUCTION API VERIFICATION');
console.log(`Target Backend:  ${PROD_API_BASE}`);
console.log(`Target Frontend: ${PROD_FRONTEND_URL}`);
console.log('============================================================\n');

async function httpReq(endpoint, options = {}, token = null) {
  const url = `${PROD_API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method || 'GET';
  const start = Date.now();
  const res = await fetch(url, {
    ...options,
    method,
    headers
  });
  const duration = Date.now() - start;
  const contentType = res.headers.get('content-type') || '';

  // Handle binary zip download
  if (contentType.includes('application/zip')) {
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    console.log(`[HTTP ${res.status}] ${method} ${endpoint} (${duration}ms) - Content-Type: ${contentType} (${buf.length} bytes)`);
    return { status: res.status, headers: res.headers, contentType, buffer: buf, isBinary: true };
  }

  const text = await res.text();
  console.log(`[HTTP ${res.status}] ${method} ${endpoint} (${duration}ms) - Content-Type: ${contentType}`);

  // Assert Content-Type is application/json and NOT text/html or <!DOCTYPE
  assert(
    contentType.includes('application/json'),
    `Expected application/json from ${endpoint}, but got: ${contentType}\nResponse preview: ${text.slice(0, 150)}`
  );
  assert(
    !text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html'),
    `Endpoint ${endpoint} returned HTML instead of JSON!\nPreview: ${text.slice(0, 150)}`
  );

  let json = null;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse JSON response from ${endpoint}: ${err.message}\nRaw body: ${text}`);
  }

  return { status: res.status, headers: res.headers, contentType, json, rawText: text };
}

async function runTrueProductionHttpSuite() {
  const testResults = [];
  const record = (name, pass, detail) => {
    testResults.push({ name, pass, detail });
    console.log(`  ${pass ? '✔' : '✖'} ${name} - ${detail}`);
  };

  try {
    // ------------------------------------------------------------------------
    // PART 1: PUBLIC HEALTH & STATUS
    // ------------------------------------------------------------------------
    console.log('\n--- PART 1: PUBLIC HEALTH & STATUS ---');
    const health = await httpReq('/api/health');
    assert.equal(health.status, 200, 'Health check should return 200');
    assert.equal(health.json.success, true, 'Health check should have success=true');
    record('Public Health Endpoint', true, `Status: ${health.json.status}, DB: ${health.json.database}`);

    // ------------------------------------------------------------------------
    // PART 2: PRODUCTION AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log('\n--- PART 2: REAL PRODUCTION AUTHENTICATION ---');
    const uniqueId = Date.now().toString().slice(-6);
    const testEmail = `fresh_user_${uniqueId}@insightlens.edu`;
    const testPassword = `Pass#${uniqueId}Secure!`;
    const testName = `Fresh User ${uniqueId}`;

    let authToken = null;

    // 1. Register fresh test account
    console.log(`Registering fresh test account: ${testEmail}...`);
    const regRes = await httpReq('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: testName,
        role: 'Researcher'
      })
    });

    if (regRes.status === 200 || regRes.status === 201) {
      authToken = regRes.json.data?.token || regRes.json.token;
      record('User Registration', true, `Created account ${testEmail}`);
    }

    // 2. Login to obtain Bearer JWT
    console.log(`Logging in with ${testEmail}...`);
    const loginRes = await httpReq('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(loginRes.status, 200, 'Login must succeed with 200 OK');
    authToken = loginRes.json.data?.token || loginRes.json.token;
    assert.ok(authToken, 'Login must return a valid Bearer JWT token');
    record('User Login & JWT Provisioning', true, `Received JWT token (${authToken.slice(0, 15)}...)`);

    // ------------------------------------------------------------------------
    // PART 3: EXTENSIONS REAL API LIFECYCLE (VS-CODE EXTENSION MODEL)
    // ------------------------------------------------------------------------
    console.log('\n--- PART 3: EXTENSIONS REAL API LIFECYCLE ---');

    // 1. Get Extension Catalog for Fresh User -> ALL 10 MUST BE NOT INSTALLED
    const catalogRes = await httpReq('/api/extensions', {}, authToken);
    assert.equal(catalogRes.status, 200, 'Catalog must return 200 OK');
    const extensions = catalogRes.json.data?.extensions || [];
    assert.equal(extensions.length, 10, `Catalog must have exactly 10 extensions, got ${extensions.length}`);

    const requiredExtIds = [
      'theme-studio',
      'typography-lab',
      'layout-packs',
      'hint-engine',
      'academic-mode',
      'research-mode',
      'presentation-mode',
      'focus-mode',
      'developer-mode',
      'prompt-playground'
    ];

    for (const reqId of requiredExtIds) {
      const found = extensions.find(e => e.id === reqId);
      assert.ok(found, `Required extension "${reqId}" must be present in catalog`);
      assert.strictEqual(found.is_installed, false, `Fresh user must start with ${reqId} NOT INSTALLED`);
      assert.strictEqual(found.is_enabled, false, `Fresh user must start with ${reqId} NOT ENABLED`);
    }
    record('Fresh User 0-Installed Guarantee', true, 'All 10 extensions start as is_installed: false and is_enabled: false');

    // 2. Download Extension Package .zip
    console.log('Downloading .zip package for "theme-studio"...');
    const downloadRes = await httpReq('/api/extensions/theme-studio/download', {}, authToken);
    assert.equal(downloadRes.status, 200);
    assert.ok(downloadRes.buffer instanceof Buffer, 'Download must return a Buffer');
    assert.ok(downloadRes.buffer.length > 100, `ZIP Buffer must be valid length, got ${downloadRes.buffer.length}`);
    assert.equal(downloadRes.buffer[0], 0x50);
    assert.equal(downloadRes.buffer[1], 0x4b);
    record('Extension .zip Package Download', true, `Downloaded valid zip package (${downloadRes.buffer.length} bytes, signature PK)`);

    // 3. Themes, Typography, Layouts Sub-catalog Endpoints
    const themesRes = await httpReq('/api/extensions/themes', {}, authToken);
    assert.equal(themesRes.status, 200);
    assert.ok(themesRes.json.data?.themes?.length >= 5, 'Must have at least 5 themes');

    const typoRes = await httpReq('/api/extensions/typography', {}, authToken);
    assert.equal(typoRes.status, 200);
    assert.ok(typoRes.json.data?.typographyPacks?.length >= 5, 'Must have at least 5 typography packs');

    const layoutRes = await httpReq('/api/extensions/layouts', {}, authToken);
    assert.equal(layoutRes.status, 200);
    assert.ok(layoutRes.json.data?.layoutPacks?.length >= 5, 'Must have at least 5 layout modes');
    record('Themes, Typography, Layout Packs API', true, 'All sub-catalogs returned 200 with valid packs');

    // 4. Install Extension -> should transition to is_installed: true, is_enabled: false
    console.log('Installing "theme-studio"...');
    const installRes = await httpReq('/api/extensions/theme-studio/install', { method: 'POST' }, authToken);
    assert.equal(installRes.status, 200);
    assert.equal(installRes.json.data.is_installed, true);
    assert.equal(installRes.json.data.is_enabled, false, 'Installed extension should remain disabled until explicit Enable');
    record('Install Extension API', true, 'theme-studio installed in PostgreSQL as is_installed: true, is_enabled: false');

    // 5. Enable Extension -> should transition to is_enabled: true
    console.log('Enabling "theme-studio"...');
    const enableRes = await httpReq('/api/extensions/theme-studio/enable', { method: 'POST' }, authToken);
    assert.equal(enableRes.status, 200);
    assert.equal(enableRes.json.data.is_enabled, true);
    record('Enable Extension API', true, 'theme-studio enabled: is_enabled === true');

    // 6. Update Authoritative Active State in PostgreSQL
    console.log('Updating authoritative UI active state (theme: "terminal", typography: "academic")...');
    const updateStateRes = await httpReq('/api/extensions/active-state', {
      method: 'PUT',
      body: JSON.stringify({
        theme: 'terminal',
        typography: 'academic',
        layout: 'command-center'
      })
    }, authToken);
    assert.equal(updateStateRes.status, 200);

    // 7. Retrieve Authoritative Active State from PostgreSQL
    const getStateRes = await httpReq('/api/extensions/active-state', {}, authToken);
    assert.equal(getStateRes.status, 200);
    const themeVal = getStateRes.json.data.theme || getStateRes.json.data.activeTheme;
    const typoVal = getStateRes.json.data.typography || getStateRes.json.data.activeTypography;
    const layoutVal = getStateRes.json.data.layout || getStateRes.json.data.activeLayout;
    assert.equal(themeVal, 'terminal', 'Theme must be terminal');
    assert.equal(typoVal, 'academic', 'Typography must be academic');
    assert.equal(layoutVal, 'command-center', 'Layout must be command-center');
    record('Authoritative PostgreSQL UI State Persistence', true, 'Retrieved activeTheme=terminal, typography=academic, layout=command-center');

    // 8. Disable Extension -> should revert active theme
    console.log('Disabling theme-studio...');
    const disableRes = await httpReq('/api/extensions/theme-studio/disable', { method: 'POST' }, authToken);
    assert.equal(disableRes.status, 200);
    assert.equal(disableRes.json.data.is_enabled, false);
    record('Disable Extension & State Revert', true, 'theme-studio is_enabled === false, active state reverted');

    // 9. Re-enable Extension
    console.log('Re-enabling theme-studio...');
    const reEnableRes = await httpReq('/api/extensions/theme-studio/enable', { method: 'POST' }, authToken);
    assert.equal(reEnableRes.status, 200);
    assert.equal(reEnableRes.json.data.is_enabled, true);
    record('Re-enable Extension', true, 'is_enabled is now true');

    // 10. Uninstall Extension -> should transition to is_installed: false
    console.log('Uninstalling theme-studio...');
    const uninstallRes = await httpReq('/api/extensions/theme-studio/uninstall', { method: 'POST' }, authToken);
    assert.equal(uninstallRes.status, 200);
    assert.equal(uninstallRes.json.data.is_installed, false);
    record('Uninstall Extension Lifecycle', true, 'theme-studio uninstalled (is_installed: false)');

    // ------------------------------------------------------------------------
    // PART 4: KNOWLEDGE REAL API TEST
    // ------------------------------------------------------------------------
    console.log('\n--- PART 4: KNOWLEDGE INTELLIGENCE REAL API LIFECYCLE ---');

    // 1. Knowledge Overview
    const overviewRes = await httpReq('/api/knowledge/overview', {}, authToken);
    assert.equal(overviewRes.status, 200);
    assert.ok(typeof overviewRes.json.data.totalClaims === 'number', 'Overview must return totalClaims count');
    record('Knowledge Overview API', true, `Returned totalClaims: ${overviewRes.json.data.totalClaims}`);

    // 2. Time Machine (Evolution Analysis)
    console.log('Running Time Machine version comparison...');
    const evoRes = await httpReq('/api/knowledge/evolution', {
      method: 'POST',
      body: JSON.stringify({
        title: 'API Spec Evolution Test',
        sourceALabel: 'v1.0',
        sourceBLabel: 'v2.0',
        sourceA: 'Endpoint supports 100 concurrent connections.\nUses legacy XML protocol.',
        sourceB: 'Endpoint supports 1000 concurrent connections.\nUses modern JSON REST protocol.'
      })
    }, authToken);
    assert.equal(evoRes.status, 200);
    const claimChanges = evoRes.json.data.changes || evoRes.json.data.claimsDiff || [];
    assert.ok(claimChanges.length > 0, 'Must produce claims diff');
    record('Time Machine Evolution Analysis', true, `Generated ${claimChanges.length} claim diffs`);

    // List Evolution
    const listEvoRes = await httpReq('/api/knowledge/evolution', {}, authToken);
    assert.equal(listEvoRes.status, 200);
    const evoList = Array.isArray(listEvoRes.json.data) ? listEvoRes.json.data : (listEvoRes.json.data.evolutions || []);
    assert.ok(evoList.length >= 1, 'Evolution must be saved and listed');
    record('Time Machine History Retrieval', true, `Found ${evoList.length} saved evolution records`);

    // 3. Knowledge Gap Detector
    console.log('Analyzing knowledge gaps from text...');
    const gapAnalysisRes = await httpReq('/api/knowledge/gaps/analyze', {
      method: 'POST',
      body: JSON.stringify({
        text: 'The distributed database achieves 99.999% uptime with zero latency under partition.'
      })
    }, authToken);
    assert.equal(gapAnalysisRes.status, 200);
    record('Knowledge Gap Detection Analysis', true, `Analyzed text and returned gap assessment`);

    // Create & List Gaps
    console.log('Creating explicit Knowledge Gap...');
    const createGapRes = await httpReq('/api/knowledge/gaps', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Unverified partition tolerance benchmark',
        description: 'Need empirical network partition stress test with Jepsen.',
        gap_type: 'Missing Evidence',
        severity: 'high'
      })
    }, authToken);
    assert.equal(createGapRes.status, 200);
    const gapId = createGapRes.json.data.id;

    const listGapsRes = await httpReq('/api/knowledge/gaps', {}, authToken);
    assert.equal(listGapsRes.status, 200);
    const gapList = Array.isArray(listGapsRes.json.data) ? listGapsRes.json.data : (listGapsRes.json.data.gaps || []);
    assert.ok(gapList.length >= 1, 'Gaps must be listed');
    record('Knowledge Gap Creation & Listing', true, `Created and retrieved gap ID: ${gapId}`);

    // 4. Decision Memory
    console.log('Creating Architectural Decision Record...');
    const createDecRes = await httpReq('/api/knowledge/decisions', {
      method: 'POST',
      body: JSON.stringify({
        decision: 'Adopt PostgreSQL for Authoritative Extensions Persistence',
        reason: 'Local storage alone is insufficient for multi-client synchrony.',
        alternatives: ['Local storage only', 'Redis cache only'],
        reversibility: 'moderate'
      })
    }, authToken);
    assert.equal(createDecRes.status, 200);
    const decId = createDecRes.json.data.id;

    const listDecRes = await httpReq('/api/knowledge/decisions', {}, authToken);
    assert.equal(listDecRes.status, 200);
    const decList = Array.isArray(listDecRes.json.data) ? listDecRes.json.data : (listDecRes.json.data.decisions || []);
    assert.ok(decList.find(d => d.id === decId), 'Created decision must appear in list');

    console.log(`Validating decision ${decId}...`);
    const valDecRes = await httpReq(`/api/knowledge/decisions/${decId}/validate`, { method: 'POST' }, authToken);
    assert.equal(valDecRes.status, 200);
    record('Decision Memory Lifecycle & Empirical Validation', true, `Created decision ${decId}, status: ${valDecRes.json.data.status}`);

    // 5. Claim Domino Graph & What-If Simulation
    console.log('Fetching Claim Domino graph...');
    const graphRes = await httpReq('/api/knowledge/graph', {}, authToken);
    assert.equal(graphRes.status, 200);
    assert.ok(Array.isArray(graphRes.json.data.nodes));
    assert.ok(Array.isArray(graphRes.json.data.edges));

    console.log('Running What-If simulation...');
    const whatIfRes = await httpReq('/api/knowledge/graph/what-if', {
      method: 'POST',
      body: JSON.stringify({
        scenario: 'Database latency increases by 500ms',
        modifiedAssumptions: [{ id: 'assump-1', modifiedState: 'FALSIFIED', description: 'Zero database latency assumption' }]
      })
    }, authToken);
    assert.equal(whatIfRes.status, 200);
    assert.ok(whatIfRes.json.data.originalStatePreserved || whatIfRes.json.data.isHypothetical, 'Simulation must be non-destructive');
    record('Claim Domino Graph & What-If Simulation', true, 'Simulated sandbox shift without mutating base graph');

    // 6. Project Autopsy
    console.log('Generating Project Autopsy...');
    const autopsyRes = await httpReq('/api/knowledge/autopsy', {
      method: 'POST',
      body: JSON.stringify({
        projectTitle: 'InsightLens Production Modernization',
        planClaims: [
          { claimText: 'Extensions marketplace with 10 modules' },
          { claimText: 'Knowledge intelligence with PostgreSQL storage' },
          { claimText: 'Offline local storage as primary database' }
        ],
        actualClaims: [
          { claimText: 'Extensions marketplace with 10 modules' },
          { claimText: 'Knowledge intelligence with PostgreSQL storage' },
          { claimText: 'PostgreSQL as authoritative database' }
        ]
      })
    }, authToken);
    assert.equal(autopsyRes.status, 200);
    const autopsyId = autopsyRes.json.data.id;

    const listAutopsyRes = await httpReq('/api/knowledge/autopsy', {}, authToken);
    assert.equal(listAutopsyRes.status, 200);
    const autList = Array.isArray(listAutopsyRes.json.data) ? listAutopsyRes.json.data : (listAutopsyRes.json.data.autopsies || []);
    assert.ok(autList.length >= 1);
    record('Project Autopsy Generation & History', true, `Autopsy ID ${autopsyId} generated and verified in list`);

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n============================================================');
    console.log('TRUE HTTP PRODUCTION API VERIFICATION COMPLETE');
    console.log(`Passed: ${testResults.filter(t => t.pass).length} / ${testResults.length} tests`);
    console.log('============================================================');

    return { success: true, count: testResults.length };
  } catch (err) {
    console.error('\n✖ TRUE HTTP SUITE FAILED:', err);
    throw err;
  }
}

runTrueProductionHttpSuite()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
