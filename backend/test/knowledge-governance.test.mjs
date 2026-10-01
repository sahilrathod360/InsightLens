import test from 'node:test';
import assert from 'node:assert/strict';
import KnowledgeService from '../src/services/knowledge/KnowledgeService.js';
import ExtensionService from '../src/services/extensions/ExtensionService.js';

test('Knowledge Governance & Full Workspace Suite', async (t) => {
  const userEmail = `test-user-${Date.now()}@insightlens.edu`;

  await t.test('Overview Stats should return valid zero/empty structure when no data exists', async () => {
    const stats = await KnowledgeService.getOverviewStats(userEmail);
    assert.strictEqual(typeof stats.totalClaims, 'number');
    assert.strictEqual(typeof stats.totalAssumptions, 'number');
    assert.strictEqual(typeof stats.totalDecisions, 'number');
    assert.strictEqual(typeof stats.totalKnowledgeGaps, 'number');
    assert.strictEqual(typeof stats.unresolvedItems, 'number');
  });

  await t.test('Knowledge Gaps: analyze, list, create, and update status', async () => {
    const textSample = `
      Our proposed architecture is scalable and seamless without bottleneck.
      Training was allegedly performed on private data.
      System assumes database latency is below 5ms.
      Payment processor integration is TODO pending vendor review.
    `;

    const gaps = await KnowledgeService.analyzeKnowledgeGaps({ text: textSample, userEmail });
    assert.ok(Array.isArray(gaps), 'Should return array of detected gaps');
    assert.ok(gaps.length >= 3, 'Should detect multiple gap types');
    assert.ok(gaps.some(g => g.gap_type === 'Ambiguous Requirement'), 'Should catch "scalable/seamless" requirement');
    assert.ok(gaps.some(g => g.gap_type === 'Missing Evidence'), 'Should catch "allegedly"');
    assert.ok(gaps.some(g => g.gap_type === 'Undefined Outcome'), 'Should catch "TODO"');

    // Create manual gap
    const manualGap = await KnowledgeService.createGap(userEmail, {
      title: 'Missing Optical Calibration Scale',
      gap_type: 'Missing Information',
      description: 'Physical dimension ruler is omitted in micrograph.',
      impact_level: 'high',
      status: 'OPEN'
    });
    assert.ok(manualGap.id);

    // Update status to RESOLVED
    const updated = await KnowledgeService.updateGap(manualGap.id, userEmail, {
      status: 'RESOLVED',
      resolution_notes: 'Verified via auxiliary sensor telemetry.'
    });
    assert.strictEqual(updated.status, 'RESOLVED');
  });

  await t.test('Decision Memory: create decision, check validity, update status', async () => {
    const dec = await KnowledgeService.createDecision(userEmail, {
      decision: 'Migrate to Asynchronous Message Queue',
      reason: 'Prevent synchronous timeout on 4K image tensor ingestion.',
      alternatives: ['HTTP Long Polling', 'WebSockets directly to worker'],
      related_assumptions: ['Database latency is below 5ms', 'Worker pool scales elastically'],
      evidence: 'Observed 14s timeout on HTTP synchronous route.',
      status: 'ACTIVE'
    });
    assert.ok(dec.id);
    assert.strictEqual(dec.status, 'ACTIVE');

    // Validate decision
    const validity = await KnowledgeService.checkDecisionValidity(dec.id, userEmail);
    assert.ok(validity.verdict);
    assert.strictEqual(typeof validity.reasoning, 'string');
  });

  await t.test('Claim Domino & What-If Simulation: non-destructive sandbox evaluation', async () => {
    // Save nodes and edges
    await KnowledgeService.saveGraphNode(userEmail, { id: `node-test-1-${Date.now()}`, node_type: 'ASSUMPTION', label: 'Single DB Instance', detail: 'Assumes database latency < 5ms' });
    const targetNode = await KnowledgeService.saveGraphNode(userEmail, { id: `node-test-2-${Date.now()}`, node_type: 'DECISION', label: 'Synchronous Processing', detail: 'Executes within request loop' });
    const compNode = await KnowledgeService.saveGraphNode(userEmail, { id: `node-test-3-${Date.now()}`, node_type: 'COMPONENT', label: 'HTTP Gateway', detail: 'Direct endpoint' });
    
    await KnowledgeService.saveGraphEdge(userEmail, { source_node_id: targetNode.id, target_node_id: compNode.id, relation_type: 'AFFECTS' });

    // Simulate What-If
    const sim = await KnowledgeService.simulateWhatIf(userEmail, {
      targetNodeId: targetNode.id,
      hypotheticalAction: 'reverse_decision',
      simulatedChange: 'Simulate reversing synchronous processing to async queue'
    });

    assert.strictEqual(sim.isHypothetical, true);
    assert.strictEqual(sim.originalStatePreserved, true);
    assert.ok(sim.affectedNodeIds.includes(compNode.id), 'Downstream component must be marked in hypothetical ripple chain');
  });

  await t.test('Project Autopsy: chronological plan vs final state reconstruction', async () => {
    const autopsy = await KnowledgeService.generateAutopsy(userEmail, {
      title: 'High-Throughput Vision Redesign Post-Mortem',
      proposal: 'Build high-scale visual understanding platform with 100ms latency target.',
      requirements: 'Support 100 concurrent requests\nSupport 1000 concurrent requests\nLegacy XML Export (deprecated)',
      revisions: 'Migrated to WebSockets\nRemoved legacy XML export format',
      decisions: 'Adopt PostgreSQL as single source of truth\nReverse synchronous pipeline in favor of worker queue',
      finalState: 'Production system validated with 100% test coverage and persistent database storage.'
    });

    assert.ok(autopsy.id);
    assert.strictEqual(autopsy.title, 'High-Throughput Vision Redesign Post-Mortem');
    assert.ok(Array.isArray(autopsy.requirements_timeline));
    assert.ok(Array.isArray(autopsy.decisions_timeline));
    assert.strictEqual(autopsy.final_state.status, 'CONCLUDED');
  });
});
