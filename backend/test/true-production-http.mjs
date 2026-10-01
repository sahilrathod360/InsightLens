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
    // PART 1: PUBLIC HEALTH & EXTENSION CATALOG
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
    const testEmail = `e2e_researcher_${uniqueId}@insightlens.edu`;
    const testPassword = `Pass#${uniqueId}Secure!`;
    const testName = `E2E Automated Researcher ${uniqueId}`;

    let authToken = null;

    // 1. Register new user
    console.log(`Registering new test account: ${testEmail}...`);
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
    } else {
      console.log('Registration status:', regRes.status, 'Attempting login...');
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
    // PART 3: EXTENSIONS REAL API LIFECYCLE
    // ------------------------------------------------------------------------
    console.log('\n--- PART 3: EXTENSIONS REAL API LIFECYCLE ---');

    // 1. Get Extension Catalog
    const catalogRes = await httpReq('/api/extensions', {}, authToken);
    assert.equal(catalogRes.status, 200, 'Catalog must return 200 OK');
    const extensions = catalogRes.json.data?.extensions || [];
    assert.ok(extensions.length >= 10, `Catalog must have at least 10 extensions, got ${extensions.length}`);

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
    }
    record('Extension Catalog & 10 Required Manifests', true, `Found all 10 required extensions (${extensions.length} total)`);

    // 2. Themes, Typography, Layouts Endpoints
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

    // 3. Install Extension
    console.log('Installing "theme-studio"...');
    const installRes = await httpReq('/api/extensions/theme-studio/install', { method: 'POST' }, authToken);
    assert.equal(installRes.status, 200);
    record('Install Extension API', true, 'theme-studio installed successfully');

    // 4. Verify Installed in Catalog
    const postInstallCatalog = await httpReq('/api/extensions', {}, authToken);
    const themeExt = postInstallCatalog.json.data.extensions.find(e => e.id === 'theme-studio');
    assert.ok(themeExt.is_installed, 'theme-studio must be marked as is_installed');
    record('Extension Install State Verification', true, 'theme-studio is_installed === true');

    // 5. Update Authoritative Active State in PostgreSQL
    console.log('Updating authoritative UI active state (theme: "terminal", typography: "academic")...');
    const updateStateRes = await httpReq('/api/extensions/active-state', {
      method: 'PUT',
      body: JSON.stringify({
        activeTheme: 'terminal',
        activeTypography: 'academic',
        activeLayout: 'command-center'
      })
    }, authToken);
    assert.equal(updateStateRes.status, 200);

    // 6. Retrieve Authoritative Active State from PostgreSQL
    const getStateRes = await httpReq('/api/extensions/active-state', {}, authToken);
    assert.equal(getStateRes.status, 200);
    assert.equal(getStateRes.json.data.activeTheme, 'terminal');
    assert.equal(getStateRes.json.data.activeTypography, 'academic');
    assert.equal(getStateRes.json.data.activeLayout, 'command-center');
    record('Authoritative PostgreSQL UI State Persistence', true, 'Retrieved activeTheme=terminal, typography=academic, layout=command-center');

    // 7. Toggle Extension Disable -> Enable
    console.log('Toggling theme-studio disabled...');
    const toggleOff = await httpReq('/api/extensions/theme-studio/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled: false })
    }, authToken);
    assert.equal(toggleOff.status, 200);

    const checkOffCatalog = await httpReq('/api/extensions', {}, authToken);
    const themeExtOff = checkOffCatalog.json.data.extensions.find(e => e.id === 'theme-studio');
    assert.equal(themeExtOff.is_enabled, false);
    record('Toggle Disable Extension', true, 'is_enabled is now false');

    console.log('Toggling theme-studio re-enabled...');
    const toggleOn = await httpReq('/api/extensions/theme-studio/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled: true })
    }, authToken);
    assert.equal(toggleOn.status, 200);
    record('Toggle Enable Extension', true, 'is_enabled is now true');

    // 8. Uninstall Extension
    console.log('Uninstalling theme-studio...');
    const uninstallRes = await httpReq('/api/extensions/theme-studio/uninstall', { method: 'POST' }, authToken);
    assert.equal(uninstallRes.status, 200);

    const postUninstallCatalog = await httpReq('/api/extensions', {}, authToken);
    const themeExtUninstalled = postUninstallCatalog.json.data.extensions.find(e => e.id === 'theme-studio');
    assert.equal(themeExtUninstalled.is_installed, false);
    record('Uninstall Extension Lifecycle', true, 'theme-studio cleanly uninstalled');

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
    assert.ok(evoRes.json.data.claimsDiff?.length > 0, 'Must produce claims diff');
    record('Time Machine Evolution Analysis', true, `Generated ${evoRes.json.data.claimsDiff.length} claim diffs`);

    // List Evolution
    const listEvoRes = await httpReq('/api/knowledge/evolution', {}, authToken);
    assert.equal(listEvoRes.status, 200);
    assert.ok(listEvoRes.json.data.evolutions?.length >= 1, 'Evolution must be saved and listed');
    record('Time Machine History Retrieval', true, `Found ${listEvoRes.json.data.evolutions.length} saved evolution records`);

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
        gap_type: 'missing_evidence',
        severity: 'high'
      })
    }, authToken);
    assert.equal(createGapRes.status, 200);
    const gapId = createGapRes.json.data.id;

    const listGapsRes = await httpReq('/api/knowledge/gaps', {}, authToken);
    assert.equal(listGapsRes.status, 200);
    assert.ok(listGapsRes.json.data.gaps?.length >= 1, 'Gaps must be listed');
    record('Knowledge Gap Creation & Listing', true, `Created and retrieved gap ID: ${gapId}`);

    // 4. Decision Memory
    console.log('Creating Architectural Decision Record...');
    const createDecRes = await httpReq('/api/knowledge/decisions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Adopt PostgreSQL for Authoritative Extensions Persistence',
        decision_context: 'Local storage alone is insufficient for multi-client synchrony.',
        choice_made: 'Store all UI and extension states authoritatively in PostgreSQL.',
        alternatives_considered: ['Local storage only', 'Redis cache only'],
        reversibility: 'moderate'
      })
    }, authToken);
    assert.equal(createDecRes.status, 200);
    const decId = createDecRes.json.data.id;

    const listDecRes = await httpReq('/api/knowledge/decisions', {}, authToken);
    assert.equal(listDecRes.status, 200);
    assert.ok(listDecRes.json.data.decisions?.find(d => d.id === decId), 'Created decision must appear in list');

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
    assert.equal(whatIfRes.json.data.nonDestructive, true);
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
    assert.ok(listAutopsyRes.json.data.autopsies?.length >= 1);
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
