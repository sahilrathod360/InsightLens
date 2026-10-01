import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import EvidenceEngine, { validateAndNormalizeCoordinates, validateEvidenceItem } from '../src/services/evidence/EvidenceEngine.js';
import VisualComparisonEngine from '../src/services/comparison/VisualComparisonEngine.js';
import CrossVisualConsistencyEngine from '../src/services/consistency/CrossVisualConsistencyEngine.js';
import VisualQAEngine from '../src/services/visualqa/VisualQAEngine.js';
import RelevanceEngine from '../src/services/relevance/RelevanceEngine.js';
import VisualWorkspaceService from '../src/services/workspace/VisualWorkspaceService.js';

describe('Visual Intelligence Platform Core Subsystems', () => {
  // --------------------------------------------------------------------------
  // TEST 1: EVIDENCE COORDINATES BOUNDS & VALIDATION
  // --------------------------------------------------------------------------
  it('should validate and normalize coordinates strictly within image boundaries', () => {
    // 1. Normalized coordinates within [0, 1]
    const validNorm = validateAndNormalizeCoordinates({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 });
    assert.equal(validNorm.valid, true);
    assert.equal(validNorm.coordinates.x, 0.1);
    assert.equal(validNorm.coordinates.y, 0.2);
    assert.equal(validNorm.coordinates.width, 0.5);
    assert.equal(validNorm.coordinates.height, 0.3);
    assert.equal(validNorm.coordinates.normalized, true);

    // 2. Out-of-bounds coordinates must be safely clipped inside [0, 1]
    const outOfBounds = validateAndNormalizeCoordinates({ x: 0.8, y: 0.7, width: 0.6, height: 0.8 });
    assert.equal(outOfBounds.valid, true);
    assert.ok(outOfBounds.coordinates.x + outOfBounds.coordinates.width <= 1.0, 'Width must not exceed boundary');
    assert.ok(outOfBounds.coordinates.y + outOfBounds.coordinates.height <= 1.0, 'Height must not exceed boundary');

    // 3. Pixel-based dimensions validation
    const pixelNorm = validateAndNormalizeCoordinates(
      { x: 100, y: 200, width: 400, height: 300 },
      { width: 1920, height: 1080 }
    );
    assert.equal(pixelNorm.valid, true);
    assert.equal(pixelNorm.coordinates.x, 100);
    assert.equal(pixelNorm.coordinates.y, 200);
    assert.ok(pixelNorm.coordinates.x + pixelNorm.coordinates.width <= 1920);
    assert.ok(pixelNorm.coordinates.y + pixelNorm.coordinates.height <= 1080);
  });

  // --------------------------------------------------------------------------
  // TEST 2: EVIDENCE OBJECT SCHEMA VALIDATION
  // --------------------------------------------------------------------------
  it('should validate strict evidence object schema and reject invalid statuses/types', () => {
    const validEvidence = {
      id: 'EVI-TEST-001',
      claimId: 'CLM-001',
      evidenceType: 'NODE',
      region: 'Auth Service Node',
      sourceImageId: 'IMG-001',
      coordinates: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
      label: 'Auth Service',
      relation: 'SUPPORTS',
      status: 'OBSERVED',
      explanation: 'Observed node entity in architecture diagram.'
    };

    const check = validateEvidenceItem(validEvidence);
    assert.equal(check.valid, true);
    assert.equal(check.sanitized.id, 'EVI-TEST-001');
    assert.equal(check.sanitized.status, 'OBSERVED');

    const invalidEvidence = {
      id: 'EVI-BAD',
      claimId: '',
      evidenceType: 'INVALID_TYPE',
      status: 'FABRICATED_STATUS'
    };

    const badCheck = validateEvidenceItem(invalidEvidence);
    assert.equal(badCheck.valid, false);
    assert.ok(badCheck.errors.length >= 3);
  });

  // --------------------------------------------------------------------------
  // TEST 3: EVIDENCE EXTRACTION & CLAIM LINKING
  // --------------------------------------------------------------------------
  it('should extract visual evidence from diagram/chart structures and link claims', () => {
    const mockReport = {
      visualType: 'DIAGRAM',
      diagramStructure: {
        diagramType: 'Data Flow Diagram',
        nodes: [
          { id: 'node_1', label: 'User Client', type: 'External Entity' },
          { id: 'node_2', label: 'API Gateway', type: 'Process' },
          { id: 'node_3', label: 'User DB', type: 'Data Store' }
        ],
        links: [
          { from: 'User Client', to: 'API Gateway', label: 'HTTPS Request' },
          { from: 'API Gateway', to: 'User DB', label: 'SQL Query' }
        ]
      },
      claims: [
        { claim: 'User Client connects to API Gateway', status: 'OBSERVED' },
        { claim: 'Unobserved background worker exists', status: 'UNDETERMINABLE' }
      ]
    };

    const extracted = EvidenceEngine.extractAndLinkEvidence(mockReport);
    assert.ok(extracted.totalEvidenceCount >= 5, 'Must extract nodes, links, and claims evidence');
    assert.equal(extracted.linkedClaims.length, 2);
    
    // Unsupported claim must remain UNDETERMINABLE
    const unevidenced = extracted.linkedClaims.find(c => c.claim.includes('Unobserved'));
    assert.equal(unevidenced.status, 'UNDETERMINABLE');
  });

  // --------------------------------------------------------------------------
  // TEST 4: VISUAL COMPARISON (CONTROLLED GROUND-TRUTH CHANGES)
  // --------------------------------------------------------------------------
  it('should accurately detect ADDED, REMOVED, MODIFIED, and UNCHANGED diagram elements', () => {
    const sourceA = {
      id: 'V1',
      title: 'Architecture v1.0',
      visualType: 'DIAGRAM',
      diagramStructure: {
        nodes: [
          { id: 'n1', label: 'Web Frontend', type: 'Client' },
          { id: 'n2', label: 'Monolith Server', type: 'Server' }
        ],
        links: [
          { from: 'Web Frontend', to: 'Monolith Server' }
        ]
      }
    };

    const sourceB = {
      id: 'V2',
      title: 'Architecture v2.0',
      visualType: 'DIAGRAM',
      diagramStructure: {
        nodes: [
          { id: 'n1', label: 'Web Frontend', type: 'Client' },
          { id: 'n3', label: 'Microservices Gateway', type: 'Gateway' }
        ],
        links: [
          { from: 'Web Frontend', to: 'Microservices Gateway' }
        ]
      }
    };

    const comparison = VisualComparisonEngine.compareVisuals(sourceA, sourceB);
    assert.ok(comparison.comparisonId);
    assert.equal(comparison.summary.addedCount >= 1, true, 'Must detect added Microservices Gateway');
    assert.equal(comparison.summary.removedCount >= 1, true, 'Must detect removed Monolith Server');
    assert.equal(comparison.summary.unchangedCount >= 1, true, 'Must detect unchanged Web Frontend');

    const added = comparison.diffs.find(d => d.elementName.toLowerCase().includes('gateway'));
    assert.equal(added.status, 'ADDED');

    const removed = comparison.diffs.find(d => d.elementName.toLowerCase().includes('monolith'));
    assert.equal(removed.status, 'REMOVED');
  });

  // --------------------------------------------------------------------------
  // TEST 5: CROSS-VISUAL CONSISTENCY EVALUATION
  // --------------------------------------------------------------------------
  it('should detect directional contradictions and missing representations across multi-visual models', () => {
    const dfdArtifact = {
      id: 'ART-DFD',
      title: 'Level 1 Data Flow Diagram',
      visualType: 'DFD',
      diagramStructure: {
        nodes: [
          { id: 'c1', label: 'Customer' },
          { id: 'p1', label: 'Payment Gateway' }
        ],
        links: [
          { from: 'Customer', to: 'Payment Gateway', label: 'Direct Payment' }
        ]
      }
    };

    const umlArtifact = {
      id: 'ART-UML',
      title: 'Sequence Diagram',
      visualType: 'UML',
      diagramStructure: {
        nodes: [
          { id: 'c1', label: 'Customer' },
          { id: 'p1', label: 'Payment Gateway' }
        ],
        links: [
          { from: 'Payment Gateway', to: 'Customer', label: 'Direct Payment' } // Reversed direction!
        ]
      }
    };

    const consistency = CrossVisualConsistencyEngine.evaluateConsistency([dfdArtifact, umlArtifact]);
    assert.equal(consistency.overallStatus, 'POTENTIAL_INCONSISTENCIES_FOUND');
    assert.ok(consistency.conflictCount >= 1, 'Must detect direction mismatch');
    
    const dirConflict = consistency.findings.find(f => f.type === 'DIRECTION_MISMATCH');
    assert.ok(dirConflict, 'Direction mismatch finding must exist');
    assert.equal(dirConflict.status, 'POTENTIAL CONFLICT');
  });

  it('should report identical visual models as consistent with zero conflicts', () => {
    const artA = {
      id: 'ART-1',
      title: 'Model A',
      visualType: 'DIAGRAM',
      diagramStructure: {
        nodes: [{ id: 'n1', label: 'Auth Service' }],
        links: []
      }
    };
    const artB = {
      id: 'ART-2',
      title: 'Model B',
      visualType: 'DIAGRAM',
      diagramStructure: {
        nodes: [{ id: 'n1', label: 'Auth Service' }],
        links: []
      }
    };

    const consistency = CrossVisualConsistencyEngine.evaluateConsistency([artA, artB]);
    assert.equal(consistency.overallStatus, 'CONSISTENT');
    assert.equal(consistency.conflictCount, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 6: EVIDENCE-GROUNDED VISUAL Q&A
  // --------------------------------------------------------------------------
  it('should answer verified query with explicit evidence regions and refuse unevidenced queries as UNDETERMINABLE', () => {
    const artifact = {
      id: 'VIS-001',
      visualType: 'DIAGRAM',
      diagramStructure: {
        nodes: [
          { id: 'n1', label: 'Customer Client' },
          { id: 'n2', label: 'Payment Service' },
          { id: 'n3', label: 'Secure Vault DB' }
        ],
        links: [
          { from: 'Customer Client', to: 'Payment Service' },
          { from: 'Payment Service', to: 'Secure Vault DB' }
        ]
      }
    };

    // 1. Evidenced query (Direct link exists)
    const q1 = VisualQAEngine.answerQuery(artifact, 'Does Customer Client connect to Payment Service?');
    assert.equal(q1.status, 'OBSERVED');
    assert.equal(q1.verdict, 'YES');
    assert.ok(q1.evidenceRegions.length >= 2, 'Must provide visual coordinates for both nodes & link');

    // 2. Unevidenced indirect connection query -> strictly UNDETERMINABLE
    const q2 = VisualQAEngine.answerQuery(artifact, 'Does Customer Client directly access Secure Vault DB?');
    assert.equal(q2.status, 'UNDETERMINABLE');
    assert.equal(q2.verdict, 'UNDETERMINABLE');
    assert.ok(q2.answer.includes('UNDETERMINABLE'), 'Must explicitly declare answer as UNDETERMINABLE');
  });

  // --------------------------------------------------------------------------
  // TEST 7: RELEVANCE PRIORITIZATION BASED ON ANALYSIS INTENT
  // --------------------------------------------------------------------------
  it('should dynamically prioritize findings based on the selected Analysis Intent', () => {
    const findings = [
      { text: 'Visual background is dark midnight navy', type: 'GENERAL', status: 'OBSERVED' },
      { text: 'Process node "Checkout" has no outgoing link', type: 'NODE', status: 'OBSERVED' },
      { text: 'Unverified database replication latency', type: 'GENERAL', status: 'UNDETERMINABLE' },
      { text: 'Total Q4 revenue increased by 24.5%', type: 'CHART_SERIES', status: 'OBSERVED' }
    ];

    // Intent: Structural Analysis -> Node connectivity must be HIGH RELEVANCE
    const structResults = RelevanceEngine.prioritizeFindings(findings, 'Structural Analysis');
    assert.equal(structResults[0].relevanceTier, 'HIGH RELEVANCE');
    assert.ok(structResults[0].text.includes('Checkout'));

    // Intent: Verification -> UNDETERMINABLE assertion must be HIGH RELEVANCE
    const verifyResults = RelevanceEngine.prioritizeFindings(findings, 'Verification');
    const verifyTop = verifyResults.filter(f => f.relevanceTier === 'HIGH RELEVANCE');
    assert.ok(verifyTop.some(f => f.text.includes('Unverified')));

    // Intent: Data Extraction -> Quantitative metric must be HIGH RELEVANCE
    const dataResults = RelevanceEngine.prioritizeFindings(findings, 'Data Extraction');
    assert.equal(dataResults[0].relevanceTier, 'HIGH RELEVANCE');
    assert.ok(dataResults[0].text.includes('revenue'));
  });

  // --------------------------------------------------------------------------
  // TEST 8: MULTI-VISUAL WORKSPACE AGGREGATION
  // --------------------------------------------------------------------------
  it('should aggregate multi-visual artifacts in workspace and generate unified intelligence', async () => {
    const ws = await VisualWorkspaceService.createWorkspace('test@insightlens.edu', {
      name: 'E-Commerce Architecture Review',
      intent: 'Structural Analysis',
      artifacts: [
        {
          id: 'ART-1',
          title: 'Checkout Flow DFD',
          visualType: 'DFD',
          diagramStructure: {
            nodes: [{ id: 'n1', label: 'User' }, { id: 'n2', label: 'Cart' }],
            links: [{ from: 'User', to: 'Cart' }]
          },
          claims: [{ claim: 'User adds item to Cart', status: 'OBSERVED' }]
        },
        {
          id: 'ART-2',
          title: 'Order Service UML',
          visualType: 'UML',
          diagramStructure: {
            nodes: [{ id: 'n2', label: 'Cart' }, { id: 'n3', label: 'Order DB' }],
            links: [{ from: 'Cart', to: 'Order DB' }]
          },
          claims: [{ claim: 'Cart stores record in Order DB', status: 'OBSERVED' }]
        }
      ]
    });

    assert.ok(ws.id);
    const intel = await VisualWorkspaceService.getWorkspaceIntelligence(ws.id);
    assert.equal(intel.artifactCount, 2);
    assert.ok(intel.consistency);
    assert.ok(intel.summary.totalEvidenceItems >= 2);
  });

  // --------------------------------------------------------------------------
  // TEST 9: LIVE VISION FRAME PROCESSING & OBSERVATION
  // --------------------------------------------------------------------------
  it('should process live camera frames and return real-time lightweight observations', async () => {
    const { default: LiveVisionEngine } = await import('../src/services/livecamera/LiveVisionEngine.js');
    const frameResult = LiveVisionEngine.processFrame({
      imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...',
      timestamp: Date.now(),
      frameIndex: 1,
      cameraFacing: 'environment'
    });

    assert.ok(frameResult.frameId);
    assert.equal(frameResult.status, 'OBSERVED');
    assert.ok(frameResult.evidenceRegions.length >= 1);
    assert.ok(frameResult.latencyMs >= 0);
  });

  // --------------------------------------------------------------------------
  // TEST 10: REGION-SPECIFIC ANALYSIS & BOUNDING INSPECTION
  // --------------------------------------------------------------------------
  it('should perform focused semantic analysis on a specific bounding box region', async () => {
    const { default: RegionAnalysisEngine } = await import('../src/services/region/RegionAnalysisEngine.js');
    const regionRes = RegionAnalysisEngine.analyzeRegion({
      regionId: 'REG-TEST-1',
      coordinates: { x: 0.2, y: 0.3, width: 0.4, height: 0.2 },
      label: 'API Gateway Entity',
      visualType: 'DIAGRAM'
    });

    assert.ok(regionRes.analysisId);
    assert.equal(regionRes.label, 'API Gateway Entity');
    assert.equal(regionRes.findings.observed.includes('Observed'), true);
    assert.equal(regionRes.claims.length, 3);
  });

  // --------------------------------------------------------------------------
  // TEST 11: GUESS BEFORE YOU SEE EVALUATION
  // --------------------------------------------------------------------------
  it('should evaluate user guesses categorically against visual evidence with NO fake numbers', async () => {
    const { default: GuessEngine } = await import('../src/services/guess/GuessEngine.js');
    
    const mockArtifact = {
      diagramStructure: {
        nodes: [{ label: 'Customer' }, { label: 'Bank Server' }],
        links: [{ from: 'Customer', to: 'Bank Server' }]
      },
      claims: [{ claimText: 'Customer initiates payment to Bank Server' }]
    };

    // 1. Matched Guess
    const matchRes = GuessEngine.evaluateGuess({
      guess: 'Customer connects directly to Bank Server for payment',
      visualArtifact: mockArtifact
    });
    assert.equal(matchRes.verdict, 'MATCHED');

    // 2. Unsubstantiated Guess
    const unsupportedRes = GuessEngine.evaluateGuess({
      guess: 'Autonomous drone fleet delivers pizza to warehouse',
      visualArtifact: mockArtifact
    });
    assert.equal(unsupportedRes.verdict, 'NOT SUPPORTED');
  });

  // --------------------------------------------------------------------------
  // TEST 12: SPOKEN NARRATION STEP SEQUENCING
  // --------------------------------------------------------------------------
  it('should generate ordered narration steps with synchronized evidence region coordinates', async () => {
    const { default: NarrationEngine } = await import('../src/services/narration/NarrationEngine.js');
    
    const mockReport = {
      title: 'Cloud Architecture Analysis',
      visualType: 'DIAGRAM',
      evidence: [
        { id: 'EVI-1', label: 'Auth Gateway', status: 'OBSERVED', explanation: 'Direct visual gateway node.', coordinates: { x: 0.1, y: 0.2, width: 0.2, height: 0.1, normalized: true } }
      ]
    };

    const narration = NarrationEngine.generateNarrationSequence(mockReport);
    assert.ok(narration.narrationId);
    assert.ok(narration.totalSteps >= 3); // intro + evidence + conclusion
    assert.equal(narration.steps[0].order, 1);
    assert.equal(narration.steps[1].evidenceId, 'EVI-1');
    assert.ok(narration.steps[1].coordinates.x === 0.1);
  });
});
