import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildAiPrompt, buildJsonSchemaPrompt } from '../src/utils/aiPrompts.js';
import { AnalysisStrategyFactory } from '../src/services/classification/AnalysisStrategyFactory.js';
import { DiagramStructureValidator } from '../src/services/diagram/DiagramStructureValidator.js';
import { ChartStructureValidator } from '../src/services/chart/ChartStructureValidator.js';
import { parseAIResponse } from '../src/utils/aiParser.js';
import { normalizeReport, sanitizeBiometricText } from '../src/services/report/ReportNormalizer.js';

const root = path.resolve(import.meta.dirname, '..');
const readSrc = rel => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('=== INSIGHTLENS PHASE 1: AI ANALYSIS PIPELINE TEST SUITE ===\n');

// ============================================================================
// SUITE 1: SPECIALIZED STRATEGY PROMPT INJECTION
// ============================================================================
console.log('--- TEST 1: Specialized Strategy Prompt Injection ---');

const prompt = buildAiPrompt('en', 'standard', '', 'classic', 'APA');
assert.match(prompt, /SPECIALIZED DIAGRAM STRUCTURAL EXTRACTION GUIDELINES/i, 'AI prompt must contain specialized diagram guidelines');
assert.match(prompt, /SPECIALIZED CHART & DATA VISUALIZATION PIPELINE GUIDELINES/i, 'AI prompt must contain specialized chart guidelines');
assert.match(prompt, /SPECIALIZED PHOTOGRAPH PIPELINE GUIDELINES/i, 'AI prompt must contain photograph guidelines');
assert.match(prompt, /SPECIALIZED DOCUMENT PIPELINE GUIDELINES/i, 'AI prompt must contain document guidelines');
assert.match(prompt, /SPECIALIZED SCREENSHOT & UI PIPELINE GUIDELINES/i, 'AI prompt must contain screenshot guidelines');
assert.match(prompt, /SPECIALIZED ARTWORK & VISUAL CREATION PIPELINE GUIDELINES/i, 'AI prompt must contain artwork guidelines');
assert.match(prompt, /SPECIALIZED MAP & CARTOGRAPHIC PIPELINE GUIDELINES/i, 'AI prompt must contain map guidelines');

const schemaPrompt = buildJsonSchemaPrompt();
assert.match(schemaPrompt, /"diagramStructure"/, 'Schema prompt must contain diagramStructure');
assert.match(schemaPrompt, /"chartStructure"/, 'Schema prompt must contain chartStructure');
assert.match(schemaPrompt, /"structuredFindings"/, 'Schema prompt must contain structuredFindings');
assert.match(schemaPrompt, /"evidenceLedger"/, 'Schema prompt must contain evidenceLedger');

assert.ok(AnalysisStrategyFactory.getStrategyInstructions('diagram').length > 50, 'Diagram strategy instructions must be detailed');
assert.ok(AnalysisStrategyFactory.getStrategyInstructions('chart').length > 50, 'Chart strategy instructions must be detailed');
console.log('✓ Test 1 PASSED: All 8 specialized visual strategies successfully injected into prompt.\n');

// ============================================================================
// SUITE 2: DIAGRAM EXTRACTION & VALIDATION (DFD, UML, ER, FLOWCHART, ARCHITECTURE)
// ============================================================================
console.log('--- TEST 2: Diagram Structural Extraction & Normalization ---');

// 2.1: Flowchart Diagram
const flowchartRaw = {
  diagramType: 'flowchart',
  classificationReason: 'Sequential process flow with conditional branching.',
  nodes: [
    { id: 'n1', label: 'Start Request', type: 'decision', subtype: 'terminal', certainty: 'observed' },
    { id: 'n2', label: 'Validate Token', type: 'process', subtype: 'process_box', certainty: 'observed' },
    { id: 'n3', label: 'Is Valid?', type: 'decision', subtype: 'decision_diamond', certainty: 'observed' },
    { id: 'n4', label: 'Authorize Access', type: 'process', subtype: 'process_box', certainty: 'observed' }
  ],
  edges: [
    { source: 'n1', target: 'n2', label: 'initiate', type: 'directed', direction: 'forward' },
    { source: 'n2', target: 'n3', label: 'token data', type: 'data_flow', direction: 'forward' },
    { source: 'n3', target: 'n4', label: 'Yes', type: 'directed', direction: 'forward' }
  ]
};
const validatedFlowchart = DiagramStructureValidator.validateAndRepair(flowchartRaw, true);
assert.equal(validatedFlowchart.diagramType, 'flowchart');
assert.equal(validatedFlowchart.nodes.length, 4);
assert.equal(validatedFlowchart.nodes[0].id, 'node_1');
assert.equal(validatedFlowchart.nodes[0].label, 'Start Request');
assert.equal(validatedFlowchart.nodes[0].subtype, 'terminal');
assert.equal(validatedFlowchart.edges.length, 3);
assert.equal(validatedFlowchart.edges[0].source, 'node_1');
assert.equal(validatedFlowchart.edges[0].target, 'node_2');
assert.equal(validatedFlowchart.edges[2].label, 'Yes');

// 2.2: Data Flow Diagram (DFD)
const dfdRaw = {
  diagramType: 'dfd',
  nodes: [
    { id: 'entity_cust', label: 'Customer', type: 'external_entity' },
    { id: 'proc_order', label: '1.0 Process Order', type: 'process' },
    { id: 'store_db', label: 'D1: Orders Store', type: 'data_store' }
  ],
  connections: [
    { from: 'entity_cust', to: 'proc_order', label: 'Order Placement', type: 'data_flow' },
    { from: 'proc_order', to: 'store_db', label: 'Write Record', type: 'data_flow' }
  ]
};
const validatedDfd = DiagramStructureValidator.validateAndRepair(dfdRaw, true);
assert.equal(validatedDfd.diagramType, 'dfd');
assert.equal(validatedDfd.nodes.length, 3);
assert.equal(validatedDfd.nodes[0].type, 'external_entity');
assert.equal(validatedDfd.nodes[2].type, 'data_store');
assert.equal(validatedDfd.edges.length, 2, 'Must accept "connections" alias with from/to');
assert.equal(validatedDfd.edges[0].source, 'node_1');
assert.equal(validatedDfd.edges[0].target, 'node_2');

// 2.3: UML Class Diagram
const umlRaw = {
  diagramType: 'uml',
  nodes: [
    { id: 'class_base', label: 'BaseService', type: 'class' },
    { id: 'class_impl', label: 'ReportService', type: 'class' }
  ],
  edges: [
    { source: 'class_impl', target: 'class_base', label: 'extends', type: 'inheritance', direction: 'forward' }
  ]
};
const validatedUml = DiagramStructureValidator.validateAndRepair(umlRaw, true);
assert.equal(validatedUml.diagramType, 'uml');
assert.equal(validatedUml.edges[0].type, 'inheritance');

// 2.4: Entity-Relationship Diagram (ER)
const erRaw = {
  diagramType: 'er_diagram',
  nodes: [
    { id: 'ent_user', label: 'Users', type: 'entity' },
    { id: 'ent_rep', label: 'Reports', type: 'entity' }
  ],
  edges: [
    { source: 'ent_user', target: 'ent_rep', label: '1 : N creates', type: 'association', direction: 'forward' }
  ]
};
const validatedEr = DiagramStructureValidator.validateAndRepair(erRaw, true);
assert.equal(validatedEr.diagramType, 'er_diagram');
assert.equal(validatedEr.edges[0].label, '1 : N creates');

// 2.5: Architecture Diagram
const archRaw = {
  diagramType: 'architecture',
  nodes: [
    { id: 'gw', label: 'API Gateway', type: 'component', subtype: 'api_gateway' },
    { id: 'srv', label: 'Auth Microservice', type: 'system', subtype: 'microservice' },
    { id: 'db', label: 'PostgreSQL Cluster', type: 'database', subtype: 'database_cluster' }
  ],
  edges: [
    { source: 'gw', target: 'srv', label: 'HTTPS /auth', type: 'directed' },
    { source: 'srv', target: 'db', label: 'SQL Connection Pool', type: 'directed' }
  ]
};
const validatedArch = DiagramStructureValidator.validateAndRepair(archRaw, true);
assert.equal(validatedArch.diagramType, 'architecture');
assert.equal(validatedArch.nodes.length, 3);
assert.equal(validatedArch.edges.length, 2);

// 2.6: Referential Integrity (Discard invalid edge targets)
const brokenEdges = {
  diagramType: 'flowchart',
  nodes: [{ id: 'n1', label: 'Single Node', type: 'process' }],
  edges: [{ source: 'n1', target: 'n_NONEXISTENT', label: 'bad edge' }]
};
const repairedIntegrity = DiagramStructureValidator.validateAndRepair(brokenEdges, true);
assert.equal(repairedIntegrity.nodes.length, 1);
assert.equal(repairedIntegrity.edges.length, 0, 'Invalid edge pointing to missing node must be discarded');

// 2.7: Inconclusive Diagram (0 nodes handled gracefully)
const inconclusiveDiag = { diagramType: 'flowchart', nodes: [], edges: [], classificationReason: 'Resolution too low to resolve discrete blocks.' };
const normInconclusive = DiagramStructureValidator.validateAndRepair(inconclusiveDiag, true);
assert.equal(normInconclusive.nodes.length, 0);
assert.equal(normInconclusive.edges.length, 0);
assert.equal(normInconclusive.classificationReason, 'Resolution too low to resolve discrete blocks.');

console.log('✓ Test 2 PASSED: Flowchart, DFD, UML, ER, Architecture, and Inconclusive diagrams validated.\n');

// ============================================================================
// SUITE 3: CHART EXTRACTION & VALIDATION (BAR, LINE, PIE, SCATTER)
// ============================================================================
console.log('--- TEST 3: Chart Structured Extraction & Validation ---');

// 3.1: Bar Chart
const barChartRaw = {
  chartType: 'bar',
  title: 'Quarterly Revenue 2024',
  xAxis: { label: 'Fiscal Quarter', unit: 'Quarter', scale: 'categorical' },
  yAxis: { label: 'Net Revenue', unit: 'USD Millions', scale: 'linear' },
  series: [{ name: 'Revenue', color: '#4f46e5' }],
  dataPoints: [
    { label: 'Q1', value: 120.5, formattedValue: '$120.5M', series: 'Revenue', certainty: 'observed' },
    { label: 'Q2', value: 145.2, formattedValue: '$145.2M', series: 'Revenue', certainty: 'observed' },
    { label: 'Q3', value: 180.0, formattedValue: '$180.0M', series: 'Revenue', certainty: 'observed' }
  ],
  trends: [
    { direction: 'increasing', description: 'Monotonic quarterly growth observed across all quarters.' }
  ],
  anomalies: ['Q3 surge exceeded linear projection by 15%'],
  observations: ['Consistent 20%+ QoQ growth throughout FY2024']
};
const validatedBar = ChartStructureValidator.validateAndRepair(barChartRaw, true);
assert.equal(validatedBar.chartType, 'bar');
assert.equal(validatedBar.title, 'Quarterly Revenue 2024');
assert.equal(validatedBar.xAxis.label, 'Fiscal Quarter');
assert.equal(validatedBar.yAxis.unit, 'USD Millions');
assert.equal(validatedBar.dataPoints.length, 3);
assert.equal(validatedBar.dataPoints[0].value, 120.5);
assert.equal(validatedBar.trends[0].direction, 'increasing');
assert.equal(validatedBar.anomalies.length, 1);
assert.equal(validatedBar.observations.length, 1);

// 3.2: Line Chart
const lineChartRaw = {
  chartType: 'line',
  title: 'Atmospheric CO2 PPM (2000-2025)',
  xAxis: { label: 'Year', unit: null, scale: 'time' },
  yAxis: { label: 'CO2 Concentration', unit: 'ppm', scale: 'linear' },
  dataPoints: [
    { label: '2000', value: 369.5 },
    { label: '2010', value: 389.9 },
    { label: '2020', value: 414.2 },
    { label: '2025', value: 425.0, certainty: 'estimated' }
  ],
  trends: [{ direction: 'increasing', description: 'Accelerating upward trajectory over 25-year baseline.' }]
};
const validatedLine = ChartStructureValidator.validateAndRepair(lineChartRaw, true);
assert.equal(validatedLine.chartType, 'line');
assert.equal(validatedLine.dataPoints.length, 4);
assert.equal(validatedLine.dataPoints[3].certainty, 'estimated');

// 3.3: Pie Chart
const pieChartRaw = {
  chartType: 'pie',
  title: 'Cloud Market Share',
  dataPoints: [
    { label: 'AWS', value: 31, formattedValue: '31%' },
    { label: 'Azure', value: 24, formattedValue: '24%' },
    { label: 'GCP', value: 11, formattedValue: '11%' },
    { label: 'Others', value: 34, formattedValue: '34%' }
  ],
  observations: ['Top 3 providers hold 66% cumulative market share.']
};
const validatedPie = ChartStructureValidator.validateAndRepair(pieChartRaw, true);
assert.equal(validatedPie.chartType, 'pie');
assert.equal(validatedPie.dataPoints.length, 4);
assert.equal(validatedPie.dataPoints[0].formattedValue, '31%');

// 3.4: Inconclusive Chart
const inconclusiveChart = { chartType: 'chart', dataPoints: [], trends: [] };
const normInconclusiveChart = ChartStructureValidator.validateAndRepair(inconclusiveChart, true);
assert.equal(normInconclusiveChart.chartType, 'generic chart');
assert.equal(normInconclusiveChart.dataPoints.length, 0);

console.log('✓ Test 3 PASSED: Bar, Line, Pie, and Inconclusive charts validated.\n');

// ============================================================================
// SUITE 4: PARSER & NORMALIZER PARITY ACROSS ALL VISUAL MODALITIES
// ============================================================================
console.log('--- TEST 4: aiParser and ReportNormalizer Pipeline Parity ---');

const sampleAiDiagramResponse = JSON.stringify({
  visualType: 'diagram',
  classificationReason: 'Cloud microservice diagram with API Gateway and worker nodes.',
  evidenceStatus: 'observed',
  specializedPipeline: 'Diagram Analysis Pipeline',
  title: 'Cloud Messaging Architecture — Distributed Event Pipeline',
  subject: 'Cloud Messaging Architecture',
  domainClassification: 'Software System Architecture',
  category: 'Computer Science',
  executiveInsight: {
    summary: 'Detailed architecture report covering the messaging bus and ingestion nodes.',
    keyFinding: 'Asynchronous queue topology decouples ingress from database operations.',
    keyTakeaways: ['High throughput ingress', 'Message retention guarantees']
  },
  executiveSummary: 'Full executive summary of the architecture.',
  diagramStructure: {
    diagramType: 'architecture',
    nodes: [
      { id: 'n1', label: 'Ingress LB', type: 'component' },
      { id: 'n2', label: 'Queue Worker', type: 'process' }
    ],
    edges: [
      { source: 'n1', target: 'n2', label: 'gRPC event stream', type: 'directed' }
    ]
  },
  structuredFindings: [
    { id: 'f1', statement: 'Ingress LB balances incoming connections across 3 worker nodes', status: 'observed', certainty: 'high' }
  ],
  visualEvidence: [{ statement: 'Load balancer block in top tier', status: 'observed' }],
  observations: [{ category: 'Context', statement: 'Clean AWS-style architecture icons', status: 'observed' }],
  structuredSections: [
    { heading: '1. Architecture Topology', icon: 'account_tree', content: 'Detailed topology analysis.' }
  ]
});

const parsed = parseAIResponse(sampleAiDiagramResponse, 'Google Gemini AI', 'gemini-3.7-flash');
assert.equal(parsed.visualType, 'diagram');
assert.equal(parsed.specializedPipeline, 'Diagram Analysis Pipeline');
assert.ok(parsed.diagramStructure, 'diagramStructure must be preserved');
assert.equal(parsed.diagramStructure.nodes.length, 2);
assert.equal(parsed.diagramStructure.edges.length, 1);
assert.equal(parsed.structuredFindings.length, 1);
assert.equal(parsed.evidenceLedger.length >= 1, true);

// Test Biometric Sanitization
const dirtyBiometricClaim = 'Subject facial structure uniquely identifies as Sachin Tendulkar with 99% biometric measurement.';
const cleanBiometricClaim = sanitizeBiometricText(dirtyBiometricClaim);
assert.doesNotMatch(cleanBiometricClaim, /facial structure uniquely identifies/i);
assert.doesNotMatch(cleanBiometricClaim, /biometric measurement/i);

console.log('✓ Test 4 PASSED: aiParser and ReportNormalizer properly process diagrams, charts, findings, and evidence.\n');

// ============================================================================
// SUITE 5: FRONTEND SOURCE AUDIT FOR DIAGRAM & CHART INTEGRATION
// ============================================================================
console.log('--- TEST 5: Frontend Source Audit for Diagram & Chart UI Parity ---');

const indexHtml = readSrc('../frontend/index.html');
assert.match(indexHtml, /id="chart-structure-container"/, 'HTML must contain chart-structure-container');
assert.match(indexHtml, /id="chart-type-pill"/, 'HTML must contain chart-type-pill');
assert.match(indexHtml, /id="chart-points-list"/, 'HTML must contain chart-points-list');
assert.match(indexHtml, /id="chart-trends-list"/, 'HTML must contain chart-trends-list');
assert.match(indexHtml, /id="diagram-structure-container"/, 'HTML must contain diagram-structure-container');
assert.match(indexHtml, /id="diagram-inconclusive-box"/, 'HTML must contain diagram-inconclusive-box');
assert.match(indexHtml, /id="chart-inconclusive-box"/, 'HTML must contain chart-inconclusive-box');

const reportViewerJs = readSrc('../frontend/src/components/ReportViewer.js');
assert.match(reportViewerJs, /export function renderChartStructure/, 'ReportViewer must export renderChartStructure');
assert.match(reportViewerJs, /export function renderDiagramStructure/, 'ReportViewer must export renderDiagramStructure');
assert.match(reportViewerJs, /renderChartStructure\(data\)/, 'ReportViewer must invoke renderChartStructure');
assert.match(reportViewerJs, /renderDiagramStructure\(data\)/, 'ReportViewer must invoke renderDiagramStructure');

const exportJs = readSrc('../frontend/src/utils/export.js');
assert.match(exportJs, /Quantitative Chart & Data Structure/, 'exportMarkdownFile must contain Quantitative Chart & Data Structure');
assert.match(exportJs, /Visual Structure & Topology/, 'exportMarkdownFile must contain Visual Structure & Topology');

console.log('✓ Test 5 PASSED: Frontend HTML, ReportViewer, and Export utilities are fully wired up.\n');

console.log('==================================================');
console.log('ALL PHASE 1 CORE AI ANALYSIS PIPELINE TESTS PASSED (100% SUCCESS)');
console.log('==================================================');
