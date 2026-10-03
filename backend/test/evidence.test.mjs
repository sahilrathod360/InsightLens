import assert from 'node:assert/strict';
import EvidenceEngine, { validateAndNormalizeCoordinates, validateEvidenceItem } from '../src/services/evidence/EvidenceEngine.js';

console.log('--- Running Canonical Evidence Engine Test Suite ---');

// 1. Coordinates Bounds & Normalization
const validNorm = validateAndNormalizeCoordinates({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 });
assert.equal(validNorm.valid, true);
assert.equal(validNorm.coordinates.x, 0.1);
assert.equal(validNorm.coordinates.y, 0.2);
assert.equal(validNorm.coordinates.width, 0.5);
assert.equal(validNorm.coordinates.height, 0.3);

const outOfBounds = validateAndNormalizeCoordinates({ x: 0.8, y: 0.7, width: 0.6, height: 0.8 });
assert.equal(outOfBounds.valid, true);
assert.ok(outOfBounds.coordinates.x + outOfBounds.coordinates.width <= 1.0, 'Width must not exceed boundary');
assert.ok(outOfBounds.coordinates.y + outOfBounds.coordinates.height <= 1.0, 'Height must not exceed boundary');
console.log('✓ Coordinates bounds & normalization verified');

// 2. Evidence Item Validation
const validEvidence = {
  id: 'EVI-001',
  claimId: 'CLM-001',
  evidenceType: 'NODE',
  region: 'Auth Node',
  sourceImageId: 'IMG-001',
  coordinates: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
  label: 'Auth Service',
  relation: 'SUPPORTS',
  status: 'OBSERVED',
  explanation: 'Observed node entity in architecture diagram.'
};

const check = validateEvidenceItem(validEvidence);
assert.equal(check.valid, true);
console.log('✓ Evidence item schema & status verified');

console.log('======================================================');
console.log('✓ Canonical Evidence Engine Test Suite Passed!');
console.log('======================================================');
