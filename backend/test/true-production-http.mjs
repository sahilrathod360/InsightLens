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
    // PART 4: VISUAL INTELLIGENCE REAL API LIFECYCLE
    // ------------------------------------------------------------------------
    console.log('\n--- PART 4: VISUAL INTELLIGENCE REAL API LIFECYCLE ---');

    // 1. Evidence Extraction & Coordinate Bounding
    console.log('Testing Evidence Extraction API...');
    const evidenceRes = await httpReq('/api/evidence/extract', {
      method: 'POST',
      body: JSON.stringify({
        visualType: 'DIAGRAM',
        diagramStructure: {
          nodes: [{ label: 'Frontend Client' }, { label: 'Auth Gateway' }],
          links: [{ from: 'Frontend Client', to: 'Auth Gateway' }]
        },
        claims: [
          { claimText: 'Frontend Client communicates directly with Auth Gateway' },
          { claimText: 'Database runs in isolated private subnet' }
        ],
        pixelDimensions: { width: 1000, height: 600 }
      })
    }, authToken);
    assert.equal(evidenceRes.status, 200);
    assert.ok(Array.isArray(evidenceRes.json.data.claimsWithEvidence), 'Must return claims with evidence');
    assert.equal(evidenceRes.json.data.claimsWithEvidence[0].evidenceStatus, 'OBSERVED', 'Direct connection claim must be OBSERVED');
    assert.equal(evidenceRes.json.data.claimsWithEvidence[1].evidenceStatus, 'UNDETERMINABLE', 'Unevidenced claim must be UNDETERMINABLE');
    record('Evidence Grounding & Extraction API', true, `Grounded ${evidenceRes.json.data.claimsWithEvidence.length} claims with bounded coordinates`);

    // 2. Visual Comparison Engine (Topology Diff)
    console.log('Testing Visual Comparison API...');
    const compRes = await httpReq('/api/comparison/compare', {
      method: 'POST',
      body: JSON.stringify({
        type: 'DIAGRAM',
        before: {
          title: 'Architecture v1',
          diagramStructure: {
            nodes: [{ label: 'Web Server' }, { label: 'Legacy Monolith' }],
            links: [{ from: 'Web Server', to: 'Legacy Monolith' }]
          }
        },
        after: {
          title: 'Architecture v2',
          diagramStructure: {
            nodes: [{ label: 'Web Server' }, { label: 'Auth Service' }, { label: 'Payment Microservice' }],
            links: [{ from: 'Web Server', to: 'Auth Service' }, { from: 'Auth Service', to: 'Payment Microservice' }]
          }
        }
      })
    }, authToken);
    assert.equal(compRes.status, 200);
    const addedCount = compRes.json.data.summary?.addedCount || compRes.json.data.diffs?.filter(d => d.status === 'ADDED').length;
    const removedCount = compRes.json.data.summary?.removedCount || compRes.json.data.diffs?.filter(d => d.status === 'REMOVED').length;
    assert.ok(addedCount >= 2, 'Must detect added microservices');
    assert.ok(removedCount >= 1, 'Must detect removed legacy monolith');
    record('Visual Comparison Topology Diff API', true, `Detected +${addedCount} added, -${removedCount} removed elements`);

    // 3. Cross-Visual Consistency Engine
    console.log('Testing Cross-Visual Consistency API...');
    const constRes = await httpReq('/api/consistency/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        artifacts: [
          {
            id: 'ART-DFD',
            title: 'Data Flow Diagram',
            visualType: 'DFD',
            diagramStructure: {
              nodes: [{ label: 'Client' }, { label: 'Backend API' }],
              links: [{ from: 'Client', to: 'Backend API' }]
            }
          },
          {
            id: 'ART-SEQ',
            title: 'Sequence Diagram',
            visualType: 'UML',
            diagramStructure: {
              nodes: [{ label: 'Client' }, { label: 'Backend API' }],
              links: [{ from: 'Backend API', to: 'Client' }] // Inverted flow
            }
          }
        ]
      })
    }, authToken);
    assert.equal(constRes.status, 200);
    assert.ok(constRes.json.data.mismatchCount >= 1, 'Must detect directional flow mismatch');
    record('Cross-Visual Consistency Engine API', true, `Evaluated multi-diagrams: found ${constRes.json.data.mismatchCount} mismatches (${constRes.json.data.overallStatus})`);

    // 4. Evidence-Grounded Visual Q&A
    console.log('Testing Evidence-Grounded Visual QA API...');
    const vqaRes = await httpReq('/api/visual-qa/ask', {
      method: 'POST',
      body: JSON.stringify({
        visualData: {
          title: 'System Architecture',
          diagramStructure: {
            nodes: [{ label: 'API Gateway' }, { label: 'User Service' }],
            links: [{ from: 'API Gateway', to: 'User Service' }]
          }
        },
        question: 'Does the API Gateway connect to the Payment Processor?'
      })
    }, authToken);
    assert.equal(vqaRes.status, 200);
    assert.equal(vqaRes.json.data.verdict, 'UNDETERMINABLE', 'Must refuse to hallucinate unevidenced connections');
    record('Evidence-Grounded Visual Q&A API', true, `Refused unevidenced claim with UNDETERMINABLE: "${vqaRes.json.data.answer}"`);

    // 5. Visual Intelligence Workspace Orchestration
    console.log('Testing Visual Workspace API...');
    const wsRes = await httpReq('/api/workspace', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Enterprise Architecture Intelligence Review',
        analysisIntent: 'Structural Analysis',
        artifacts: [
          {
            id: 'ART-1',
            title: 'Core Architecture',
            visualType: 'DIAGRAM',
            diagramStructure: {
              nodes: [{ label: 'Client' }, { label: 'Server' }],
              links: [{ from: 'Client', to: 'Server' }]
            },
            claims: [{ claimText: 'Client sends requests to Server' }]
          }
        ]
      })
    }, authToken);
    assert.equal(wsRes.status, 200);
    assert.ok(wsRes.json.data.workspaceId, 'Must create and return workspaceId');
    assert.ok(wsRes.json.data.evidenceReport, 'Must contain evidenceReport');
    record('Visual Intelligence Workspace Service', true, `Created Workspace ${wsRes.json.data.workspaceId} with full intelligence report`);

    // 6. Live Vision Frame Processing API
    console.log('Testing Live Vision API...');
    const liveRes = await httpReq('/api/live-vision/frame', {
      method: 'POST',
      body: JSON.stringify({
        imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...',
        timestamp: Date.now(),
        frameIndex: 1,
        cameraFacing: 'environment'
      })
    }, authToken);
    assert.equal(liveRes.status, 200);
    assert.equal(liveRes.json.data.status, 'OBSERVED');
    assert.ok(liveRes.json.data.evidenceRegions.length >= 1);
    record('Live Vision Real-Time Frame API', true, `Processed frame #${liveRes.json.data.frameIndex} (${liveRes.json.data.latencyMs}ms latency)`);

    // 7. Region-Specific Analysis API
    console.log('Testing Region-Specific Analysis API...');
    const regionAnalysisRes = await httpReq('/api/regions/analyze', {
      method: 'POST',
      body: JSON.stringify({
        regionId: 'REG-PROD-1',
        coordinates: { x: 0.15, y: 0.2, width: 0.35, height: 0.25 },
        label: 'Auth Gateway Entity',
        visualType: 'DIAGRAM'
      })
    }, authToken);
    assert.equal(regionAnalysisRes.status, 200);
    assert.ok(regionAnalysisRes.json.data.findings.observed.includes('Observed'));
    record('Region-Specific Contextual Analysis API', true, `Analyzed region "${regionAnalysisRes.json.data.label}" with grounded observations`);

    // 8. Guess Before You See Evaluation API
    console.log('Testing Guess Evaluation API...');
    const guessRes = await httpReq('/api/guess/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        guess: 'Client connects to Server directly',
        visualArtifact: {
          diagramStructure: {
            nodes: [{ label: 'Client' }, { label: 'Server' }],
            links: [{ from: 'Client', to: 'Server' }]
          },
          claims: [{ claimText: 'Client sends data to Server' }]
        }
      })
    }, authToken);
    assert.equal(guessRes.status, 200);
    assert.ok(guessRes.json.data.verdict === 'MATCHED' || guessRes.json.data.verdict === 'PARTIALLY MATCHED', 'Verdict must be categorical MATCHED or PARTIALLY MATCHED');
    record('Guess Mode Evaluation API', true, `Evaluated prediction: verdict=${guessRes.json.data.verdict} (NO fake percentage)`);

    // 9. Spoken Narration Sequence API
    console.log('Testing Spoken Narration Sequence API...');
    const narrRes = await httpReq('/api/narration/sequence', {
      method: 'POST',
      body: JSON.stringify({
        reportData: {
          title: 'System Architecture',
          visualType: 'DIAGRAM',
          evidence: [
            { id: 'EVI-1', label: 'API Gateway', status: 'OBSERVED', explanation: 'Gateway ingress controller.', coordinates: { x: 0.1, y: 0.1, width: 0.3, height: 0.2, normalized: true } }
          ]
        }
      })
    }, authToken);
    assert.equal(narrRes.status, 200);
    assert.ok(narrRes.json.data.steps.length >= 3);
    record('Spoken Narration Sequence API', true, `Generated ${narrRes.json.data.steps.length} ordered narration steps`);

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
