import assert from 'node:assert/strict';
import { normalizeReport, normalizeEvidenceStatus } from '../src/services/report/ReportNormalizer.js';
import { normalizeReportId } from '../src/utils/idUtils.js';
import { DiagramStructureValidator } from '../src/services/diagram/DiagramStructureValidator.js';
import { ChartStructureValidator } from '../src/services/chart/ChartStructureValidator.js';
import { SAMPLE_DEMO_REPORT } from '../../frontend/src/services/demoReport.js';

console.log('=== RUNNING PHASE 2 NON-GENERIC TEST SUITE ===');

// 1. REPORT ID NORMALIZATION TEST
console.log('\n--- 1. Report ID Normalization Tests ---');
assert.equal(normalizeReportId('12345'), 'RPT-12345');
assert.equal(normalizeReportId('RPT-12345'), 'RPT-12345');
assert.equal(normalizeReportId('RPT-RPT-12345'), 'RPT-12345');
assert.equal(normalizeReportId('RPT-RPT-RPT-89420'), 'RPT-89420');
assert.equal(normalizeReportId('RPT_9988'), 'RPT-9988');
assert.equal(normalizeReportId('DEMO-89420'), 'DEMO-89420');
assert.match(normalizeReportId(null), /^RPT-\d+/);
assert.match(normalizeReportId(''), /^RPT-\d+/);
console.log('✔ Report ID normalization passed: duplicate RPT- prefixes completely prevented');

// 2. EVIDENCE STATUS NORMALIZATION TEST
console.log('\n--- 2. Evidence Status Normalization Tests ---');
assert.equal(normalizeEvidenceStatus('OBSERVED'), 'OBSERVED');
assert.equal(normalizeEvidenceStatus('observed'), 'OBSERVED');
assert.equal(normalizeEvidenceStatus('supported'), 'OBSERVED');
assert.equal(normalizeEvidenceStatus('INFERRED'), 'INFERRED');
assert.equal(normalizeEvidenceStatus('inferred'), 'INFERRED');
assert.equal(normalizeEvidenceStatus('partially_supported'), 'INFERRED');
assert.equal(normalizeEvidenceStatus('UNDETERMINABLE'), 'UNDETERMINABLE');
assert.equal(normalizeEvidenceStatus('undeterminable'), 'UNDETERMINABLE');
assert.equal(normalizeEvidenceStatus('uncertain'), 'UNDETERMINABLE');
assert.equal(normalizeEvidenceStatus('unsupported'), 'UNDETERMINABLE');
assert.equal(normalizeEvidenceStatus(null), 'UNDETERMINABLE');
console.log('✔ Evidence status normalization passed: standard OBSERVED, INFERRED, UNDETERMINABLE returned');

// 3. CLAIM LAYER & STRUCTURED FINDINGS TEST
console.log('\n--- 3. Claims & Structured Findings Normalization Tests ---');
const rawAiOutput = {
  id: 'RPT-RPT-5566',
  visualType: 'photograph',
  title: 'AB de Villiers — Career, Records & Legacy',
  subject: 'AB de Villiers',
  category: 'Sports & Cricket',
  claims: [
    {
      id: 'claim_1',
      statement: 'Subject is wearing South African national cricket jersey.',
      status: 'OBSERVED',
      evidence: 'Green and gold athletic jersey with Protea national emblem.',
      source: 'Visual Optical Frame',
      reasoning: 'Direct optical detection in visual frame.'
    },
    {
      id: 'claim_2',
      statement: 'Subject holds the record for the fastest ODI century (31 balls).',
      status: 'INFERRED',
      evidence: 'ICC Official International Records.',
      source: 'International Cricket Council',
      reasoning: 'Corroborated by external archival sports records.'
    },
    {
      id: 'claim_3',
      statement: 'Match venue atmospheric humidity cannot be determined from photograph.',
      status: 'UNDETERMINABLE',
      evidence: 'Absence of meteorological instrumentation in frame.',
      source: 'Visual Optical Frame',
      reasoning: 'Environmental telemetry is not measurable from 2D optical frame.'
    }
  ],
  structuredFindings: [
    {
      id: 'finding_1',
      statement: 'Protea emblem clearly visible on left chest.',
      category: 'Visual Observation',
      status: 'OBSERVED',
      evidence: 'Emblem embroidery in optical frame.'
    }
  ],
  confidenceScore: '99.5%',
  aiConfidence: 'high'
};

const normalized = normalizeReport(rawAiOutput);
assert.equal(normalized.id, 'RPT-5566', 'ID must be cleaned to single RPT- prefix');
assert.equal(normalized.claims.length, 3, 'Must retain 3 claims');
assert.equal(normalized.claims[0].status, 'OBSERVED');
assert.equal(normalized.claims[1].status, 'INFERRED');
assert.equal(normalized.claims[2].status, 'UNDETERMINABLE');
assert.equal(normalized.structuredFindings.length, 1);
assert.equal(normalized.structuredFindings[0].status, 'OBSERVED');
assert.equal(normalized.confidenceScore, undefined, 'Must strip fake confidenceScore');
assert.equal(normalized.aiConfidence, undefined, 'Must strip fake aiConfidence');
assert.equal(normalized.scientificName, undefined, 'Non-biological subject must not have scientificName');
console.log('✔ Claims & structured findings normalization passed');

// 4. DIAGRAM STRUCTURE & STRUCTURAL ISSUE VALIDATION TEST
console.log('\n--- 4. Diagram Structural Graph & Issue Detection Tests ---');
const rawDiagram = {
  diagramType: 'flowchart',
  classificationReason: 'Standard process flowchart with decision diamonds and terminal boxes.',
  nodes: [
    { id: 'start_node', label: 'Start Process', type: 'system', subtype: 'terminal' },
    { id: 'step_1', label: 'Validate User Credentials', type: 'process' },
    { id: 'step_2', label: 'Isolated Orphan Process', type: 'process' }, // Orphan node
    { id: 'step_3', label: 'Dead End Process', type: 'process' } // Dead end node
  ],
  edges: [
    { source: 'start_node', target: 'step_1', label: 'Initiate', type: 'directed' },
    { source: 'step_1', target: 'step_3', label: 'On Success', type: 'directed' },
    { source: 'step_1', target: 'non_existent_node', label: 'Invalid Edge' } // Invalid edge (must be dropped)
  ]
};

const validatedDiagram = DiagramStructureValidator.validateAndRepair(rawDiagram, true);
assert.equal(validatedDiagram.diagramType, 'flowchart');
assert.equal(validatedDiagram.nodes.length, 4, 'Should keep 4 valid nodes with re-indexed IDs');
assert.equal(validatedDiagram.edges.length, 2, 'Should drop invalid edge to non_existent_node');
assert.ok(Array.isArray(validatedDiagram.structuralIssues), 'Must return structuralIssues array');
assert.ok(validatedDiagram.structuralIssues.length >= 2, 'Should detect orphan node and dead end process');

const hasOrphanIssue = validatedDiagram.structuralIssues.some(i => i.includes('Isolated Orphan Process') && i.includes('isolated with no visible connections'));
const hasDeadEndIssue = validatedDiagram.structuralIssues.some(i => i.includes('Dead End Process') && i.includes('has incoming flows but no visible outgoing connector'));
assert.ok(hasOrphanIssue, 'Must detect orphan node with cautious phrasing');
assert.ok(hasDeadEndIssue, 'Must detect dead end node with cautious phrasing');
console.log('✔ Diagram structural graph & issue validation passed:', validatedDiagram.structuralIssues);

// 5. CHART STRUCTURE VALIDATION TEST
console.log('\n--- 5. Chart Structure Validation Tests ---');
const rawChart = {
  chartType: 'bar',
  title: 'Quarterly Revenue Growth',
  xAxis: { label: 'Quarter', scale: 'categorical' },
  yAxis: { label: 'Revenue', unit: 'USD Millions', scale: 'linear' },
  series: [{ name: '2025 Revenue', color: '#818cf8' }],
  dataPoints: [
    { label: 'Q1', value: '45.2', formattedValue: '$45.2M', series: '2025 Revenue', certainty: 'observed' },
    { label: 'Q2', value: 58.7, formattedValue: '$58.7M', series: '2025 Revenue', certainty: 'observed' }
  ],
  trends: [
    { direction: 'increasing', description: 'Consistent quarter-over-quarter revenue growth.' }
  ],
  observations: ['Q2 demonstrates 29.8% expansion over Q1.']
};

const validatedChart = ChartStructureValidator.validateAndRepair(rawChart, true);
assert.equal(validatedChart.chartType, 'bar');
assert.equal(validatedChart.dataPoints.length, 2);
assert.equal(validatedChart.dataPoints[0].value, 45.2, 'Should parse string numbers to numeric value');
assert.equal(validatedChart.trends.length, 1);
assert.equal(validatedChart.observations.length, 1);
console.log('✔ Chart structure validation passed');

// 6. DEMO REPORT TRUTHFULNESS & BADGE TEST
console.log('\n--- 6. Demo Report Integrity Tests ---');
assert.equal(SAMPLE_DEMO_REPORT.id, 'DEMO-89420');
assert.equal(SAMPLE_DEMO_REPORT.isDemo, true, 'Demo report must have isDemo: true');
assert.equal(SAMPLE_DEMO_REPORT.isSample, true, 'Demo report must have isSample: true');
assert.equal(SAMPLE_DEMO_REPORT.demoNotice, 'SAMPLE DEMONSTRATION — NOT A LIVE AI ANALYSIS');
assert.equal(SAMPLE_DEMO_REPORT.confidenceScore, undefined, 'Demo report must not have confidenceScore');
assert.ok(Array.isArray(SAMPLE_DEMO_REPORT.claims) && SAMPLE_DEMO_REPORT.claims.length >= 3, 'Demo report must have standard claims');
assert.ok(SAMPLE_DEMO_REPORT.claims.some(c => c.status === 'OBSERVED'));
assert.ok(SAMPLE_DEMO_REPORT.claims.some(c => c.status === 'INFERRED'));
assert.ok(SAMPLE_DEMO_REPORT.claims.some(c => c.status === 'UNDETERMINABLE'));
console.log('✔ Demo report truthfulness & standard claims passed');

// 7. MULTI-VISUAL STRATEGY NORMALIZATION TEST (UML, ER, DFD, PHOTO)
console.log('\n--- 7. Multi-Visual Strategy Normalization Tests ---');
const umlVisual = normalizeReport({
  id: '7788',
  visualType: 'diagram',
  title: 'Order Management Class Diagram',
  subject: 'Order Management System',
  diagramStructure: {
    diagramType: 'uml',
    nodes: [
      { id: 'c1', label: 'Order', type: 'class' },
      { id: 'c2', label: 'Customer', type: 'class' }
    ],
    edges: [
      { source: 'c2', target: 'c1', type: 'association', label: 'places 1..*' }
    ]
  }
});
assert.equal(umlVisual.id, 'RPT-7788');
assert.equal(umlVisual.diagramStructure.diagramType, 'uml');
assert.equal(umlVisual.diagramStructure.nodes.length, 2);

console.log('✔ All Multi-Visual Strategy normalization tests passed');

console.log('\n========================================');
console.log('ALL PHASE 2 NON-GENERIC TESTS PASSED! 🎉');
console.log('========================================\n');
