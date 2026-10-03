import assert from 'node:assert/strict';
import VisualComparisonEngine from '../src/services/comparison/VisualComparisonEngine.js';
import CrossVisualConsistencyEngine from '../src/services/consistency/CrossVisualConsistencyEngine.js';

console.log('--- Running Canonical Comparison & Consistency Test Suite ---');

// 1. Comparison Engine
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

const compResult = VisualComparisonEngine.compareVisuals(sourceA, sourceB);
assert.ok(compResult.comparisonId);
assert.ok(compResult.summary.addedCount >= 1);
assert.ok(compResult.summary.removedCount >= 1);
console.log('✓ Visual Comparison Engine report diffing verified');

// 2. Consistency Engine
const consistencyResult = CrossVisualConsistencyEngine.evaluateConsistency([sourceA, sourceB]);
assert.ok(consistencyResult.overallStatus);
console.log('✓ Cross-Visual Consistency Engine evaluation verified');

console.log('======================================================');
console.log('✓ Canonical Comparison & Consistency Test Suite Passed!');
console.log('======================================================');
