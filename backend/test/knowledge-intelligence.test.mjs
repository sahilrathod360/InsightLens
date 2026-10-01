import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import KnowledgeEvolutionEngine from '../src/services/knowledge/KnowledgeEvolutionEngine.js';
import ChangeImpactEngine from '../src/services/knowledge/ChangeImpactEngine.js';
import AssumptionStressTester from '../src/services/knowledge/AssumptionStressTester.js';
import DevilsAdvocateEngine from '../src/services/knowledge/DevilsAdvocateEngine.js';

describe('Knowledge Intelligence Engine Suite', () => {
  // 1. Knowledge Evolution & Semantic Change Detection
  it('should detect NEW, REMOVED, MODIFIED, CONTRADICTED, and STABLE claims', () => {
    const sourceA = `
      # System Architecture Specification
      System supports 100 concurrent users.
      PostgreSQL database used for persistent record storage.
      Client authentication requires JWT bearer tokens.
      Real-time notifications are enabled by default.
      Legacy XML export is supported for archival.
    `;

    const sourceB = `
      # System Architecture Specification
      System supports 500 concurrent users.
      PostgreSQL database used for persistent record storage.
      Client authentication requires JWT bearer tokens.
      Real-time notifications are disabled by default.
      New Webhook dispatcher added for third-party alerts.
    `;

    const result = KnowledgeEvolutionEngine.analyze({
      sourceA,
      sourceB,
      title: 'API Spec Evolution',
      sourceALabel: 'v1.0',
      sourceBLabel: 'v2.0'
    });

    assert.ok(result.metrics, 'Metrics object must be returned');
    assert.equal(result.metrics.totalClaimsTracked >= 5, true);

    // Modified claim: 100 -> 500 users
    const modifiedClaim = result.changes.find(c => c.type === 'MODIFIED');
    assert.ok(modifiedClaim, 'Modified claim must be detected');
    assert.equal(modifiedClaim.category, 'Quantitative Claim');
    assert.ok(modifiedClaim.semanticDelta.includes('100') && modifiedClaim.semanticDelta.includes('500'));

    // Stable claim: PostgreSQL
    const stableClaim = result.changes.find(c => c.type === 'STABLE');
    assert.ok(stableClaim, 'Stable claim must be detected');
    assert.ok(stableClaim.previousStatement.includes('PostgreSQL'));

    // Contradicted claim: enabled vs disabled
    const contradictedClaim = result.changes.find(c => c.type === 'CONTRADICTED');
    assert.ok(contradictedClaim, 'Contradiction must be detected');
    assert.ok(contradictedClaim.potentialImpact.includes('Critical') || contradictedClaim.potentialImpact.includes('Contradiction'));

    // Removed claim: Legacy XML
    const removedClaim = result.changes.find(c => c.type === 'REMOVED');
    assert.ok(removedClaim, 'Removed claim must be detected');
    assert.ok(removedClaim.previousStatement.includes('XML'));

    // New claim: Webhook
    const newClaim = result.changes.find(c => c.type === 'NEW');
    assert.ok(newClaim, 'New claim must be detected');
    assert.ok(newClaim.newStatement.includes('Webhook'));
  });

  // 2. Downstream Change Impact Engine
  it('should detect downstream dependencies with cautious phrasing and no fabricated definitive breaks', () => {
    const sampleChanges = [
      {
        id: 'chg-1',
        type: 'MODIFIED',
        category: 'Quantitative Claim',
        previousStatement: 'System supports 100 concurrent users.',
        newStatement: 'System supports 1000 concurrent users.',
        semanticDelta: 'Quantitative metric shifted from 100 to 1000',
        potentialImpact: 'Potentially significant'
      },
      {
        id: 'chg-2',
        type: 'MODIFIED',
        category: 'Architectural Specification',
        previousStatement: 'API request payload accepts user_id string.',
        newStatement: 'API request payload requires user_id UUID format and role parameter.',
        semanticDelta: 'Schema requirements modified',
        potentialImpact: 'Moderate review recommended'
      }
    ];

    const impactResult = ChangeImpactEngine.analyzeImpact({ changes: sampleChanges });

    assert.ok(impactResult.chains.length >= 2, 'Impact chains must be generated');
    assert.ok(impactResult.potentiallyAffectedComponents.length > 0);

    // Verify cautious phrasing
    const allNotes = impactResult.chains.flatMap(c => c.downstreamChain.map(l => l.note));
    for (const note of allNotes) {
      const lower = note.toLowerCase();
      assert.ok(
        lower.includes('may require') || 
        lower.includes('potentially') || 
        lower.includes('dependency detected') ||
        lower.includes('review') ||
        lower.includes('test'),
        `Note must use cautious phrasing: "${note}"`
      );
    }
  });

  // 3. Assumption Stress Tester
  it('should extract assumptions, map dependent claims, identify evidence absence, and generate validation questions', () => {
    const documentText = `
      # High Scale Vision Intelligence Architecture
      The system will support 1000 concurrent users with real-time analysis latency.
      Our proprietary model is more accurate than existing systems on general benchmarks.
      Client sessions use secure zero-trust authentication tokens.
    `;

    const result = AssumptionStressTester.testDocument({
      documentText,
      title: 'Vision Arch Spec'
    });

    assert.ok(result.assumptions.length >= 3, 'Multiple assumptions must be extracted');
    assert.ok(result.metrics.totalAssumptions >= 3);

    // Capacity assumption
    const capacityAsm = result.assumptions.find(a => a.statement.includes('1000 concurrent users'));
    assert.ok(capacityAsm, 'Capacity assumption must be found');
    assert.equal(capacityAsm.evidenceStatus, 'NOT_FOUND_IN_TEXT');
    assert.ok(capacityAsm.dependentClaims.length > 0);
    assert.ok(capacityAsm.potentialFailureModes.length > 0);
    assert.ok(capacityAsm.validationQuestions.length >= 2);
    assert.ok(capacityAsm.validationQuestions[0].includes('load test') || capacityAsm.validationQuestions[0].includes('benchmark'));

    // Accuracy assumption
    const accuracyAsm = result.assumptions.find(a => a.statement.includes('diagnostic or analytical precision'));
    assert.ok(accuracyAsm, 'Accuracy assumption must be identified');
    assert.ok(accuracyAsm.validationQuestions.some(q => q.includes('comparative benchmark')));
  });

  // 4. Devil's Advocate & Claim Survival
  it('should generate adversarial challenges, compute claim survival breakdown without fake truth scores, and build relationship graph', () => {
    const claims = [
      { id: 'c1', statement: 'Our AI system is more accurate than existing systems.', status: 'OBSERVED' },
      { id: 'c2', statement: 'The system can handle 500 concurrent users effortlessly.', status: 'UNVERIFIED' },
      { id: 'c3', statement: 'Visual connectors are 100% flawlessly extracted.', status: 'INFERRED' }
    ];

    const result = DevilsAdvocateEngine.runAnalysis({
      claims,
      documentText: 'Our AI system is more accurate than existing systems with superior accuracy.'
    });

    // 1. Attacks generated
    assert.ok(result.attacks.length >= 2, 'Adversarial attacks must be generated');
    const attack1 = result.attacks[0];
    assert.ok(attack1.id.startsWith('ATTACK-'));
    assert.ok(attack1.challenge.length > 10);
    assert.ok(attack1.whyItMatters.length > 10);
    assert.ok(attack1.evidenceRequired.length > 10);

    // 2. Truthful Claim Survival Tally (NO fake numerical percentage score)
    assert.equal(typeof result.survivalTally, 'object');
    assert.equal(result.survivalTally.totalEvaluated, 3);
    assert.equal(result.survivalTally.survivedSupported, 1);
    assert.equal(result.survivalTally.requiresAdditionalEvidence, 2);
    assert.equal(result.survivalTally.contradictedUnresolved, 0);

    // 3. Assumption -> Impact Relationship Graph
    assert.ok(result.relationshipGraph.nodes.length > 0);
    assert.ok(result.relationshipGraph.edges.length > 0);
    assert.ok(result.relationshipGraph.nodes.some(n => n.type === 'ASSUMPTION'));
    assert.ok(result.relationshipGraph.nodes.some(n => n.type === 'DEPENDENT_CLAIM'));
    assert.ok(result.relationshipGraph.nodes.some(n => n.type === 'POTENTIAL_IMPACT'));
  });
});
