import assert from 'node:assert/strict';
import { buildAiPrompt, buildJsonSchemaPrompt } from '../src/utils/aiPrompts.js';
import { AnalysisStrategyFactory } from '../src/services/classification/AnalysisStrategyFactory.js';
import { DiagramStructureValidator } from '../src/services/diagram/DiagramStructureValidator.js';
import { ChartStructureValidator } from '../src/services/chart/ChartStructureValidator.js';
import { parseAIResponse } from '../src/utils/aiParser.js';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

console.log('--- Running Canonical Analysis & AI Pipeline Test Suite ---');

// 1. Specialized Strategy Prompt Injection
const prompt = buildAiPrompt('en', 'standard', '', 'classic', 'APA');
assert.match(prompt, /SPECIALIZED DIAGRAM STRUCTURAL EXTRACTION GUIDELINES/i);
assert.match(prompt, /SPECIALIZED CHART & DATA VISUALIZATION PIPELINE GUIDELINES/i);
assert.match(prompt, /SPECIALIZED PHOTOGRAPH PIPELINE GUIDELINES/i);
assert.match(prompt, /SPECIALIZED DOCUMENT PIPELINE GUIDELINES/i);

const schemaPrompt = buildJsonSchemaPrompt();
assert.match(schemaPrompt, /"diagramStructure"/);
assert.match(schemaPrompt, /"chartStructure"/);
assert.match(schemaPrompt, /"evidenceLedger"/);
console.log('✓ AI Prompts & Specialized Visual Strategies verified');

// 2. Diagram & Chart Structure Validation
const flowchartRaw = {
  diagramType: 'flowchart',
  classificationReason: 'Sequential process flow with conditional branching.',
  nodes: [
    { id: 'n1', label: 'Start', type: 'decision', subtype: 'terminal', certainty: 'observed' },
    { id: 'n2', label: 'Process Data', type: 'process', subtype: 'process_box', certainty: 'observed' }
  ],
  edges: [
    { source: 'n1', target: 'n2', label: 'initiate', type: 'directed', direction: 'forward' }
  ]
};
const validatedDiagram = DiagramStructureValidator.validateAndRepair(flowchartRaw);
assert.ok(validatedDiagram);
assert.equal(validatedDiagram.nodes.length, 2);
console.log('✓ Diagram Structure validation verified');

// 3. AI Parser & Normalizer
const mockApiResponse = JSON.stringify({
  title: 'Architecture Analysis',
  subject: 'System Flow',
  category: 'Software Architecture',
  executiveSummary: 'Microservice architecture with auth and data services configured cleanly.',
  detectionSummary: 'Verified microservice boundaries and authentication flow.',
  detailedAnalysis: 'The architecture incorporates an API gateway communicating with services.',
  structuredFindings: [
    { category: 'Architecture', observation: 'Authentication service gatekeeps API', severity: 'info' }
  ],
  evidenceLedger: [
    { id: 'ev-1', label: 'Auth Gateway', coordinates: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, relation: 'SUPPORTS', status: 'OBSERVED' }
  ]
});

const parsed = parseAIResponse(mockApiResponse, 'TEST_PROVIDER', 'gemini-1.5-flash');
assert.ok(parsed.title);
const normalized = normalizeReport(parsed, { imageWidth: 800, imageHeight: 600 });
assert.ok(normalized.title);
assert.ok(normalized.domainClassification);
console.log('✓ AI Parser & Report Normalizer verified');

console.log('======================================================');
console.log('✓ Canonical Analysis & AI Pipeline Test Suite Passed!');
console.log('======================================================');
