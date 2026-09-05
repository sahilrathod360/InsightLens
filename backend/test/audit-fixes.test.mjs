import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';
import { optimizeImage } from '../src/utils/imageOptimizer.js';
import { admitAnalysis, getCompletedAnalysis, storeCompletedAnalysis } from '../src/middleware/analysisAdmission.js';
import { buildAiPrompt } from '../src/utils/aiPrompts.js';
import ModelRegistry from '../src/services/ai/ModelRegistry.js';
import { isPrivateOrReservedIP } from '../src/utils/ssrfValidator.js';

const root = path.resolve(import.meta.dirname, '..');
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8');

// ============================================================================
// ITEM 1: Archived reports always display their OWN saved image
// ============================================================================
const archiveSrc = source('../frontend/src/components/Archive/ArchiveComponent.js');
assert.match(archiveSrc, /sanitizeUrl\(rpt\.thumbnailDataUrl\) \|\| sanitizeUrl\(rpt\.imageDataUrl\) \|\| sanitizeUrl\(rpt\.fullImage\)/, 'Archive cards must fallback through thumbnail -> imageDataUrl -> fullImage');
assert.match(archiveSrc, /imageDataUrl: target\.imageDataUrl \|\| target\.fullImage \|\| target\.thumbnailDataUrl/, 'Opening report must resolve own image');

const dashSrc = source('../frontend/src/components/Dashboard/DashboardComponent.js');
assert.match(dashSrc, /sanitizeUrl\(rpt\.thumbnailDataUrl\) \|\| sanitizeUrl\(rpt\.imageDataUrl\) \|\| sanitizeUrl\(rpt\.fullImage\)/, 'Dashboard recent cards must resolve report image');
assert.match(dashSrc, /imageDataUrl: selected\.imageDataUrl \|\| selected\.fullImage \|\| selected\.thumbnailDataUrl/, 'Reopening report from dashboard must resolve own image');

// ============================================================================
// ITEM 2: Real Frontend/Backend Pagination for history/archive
// ============================================================================
const historySrc = source('../frontend/src/services/history.js');
assert.match(historySrc, /getArchivePage\(filters = \{\}, page = 1, limit = 20\)/, 'getArchivePage must support pagination');
assert.match(historySrc, /totalPages: Math\.max\(1, Number\(json\.totalPages \|\| 1\)\)/, 'Pagination must extract totalPages');

const reportCtrlSrc = source('src/controllers/ReportController.js');
assert.match(reportCtrlSrc, /LIMIT \$[\s\S]*?OFFSET \$/, 'listReports must apply server-side LIMIT and OFFSET');
assert.match(reportCtrlSrc, /totalPages: Math\.max\(1, Math\.ceil\(Number\(totalResult\.rows\[0\]\?\.count \|\| 0\) \/ limit\)\)/, 'Backend must return totalPages');

// ============================================================================
// ITEM 3: Strictly User-Scoped Dashboard, Export & Model Metrics
// ============================================================================
const dashCtrlSrc = source('src/controllers/DashboardController.js');
assert.match(dashCtrlSrc, /WHERE user_email = \$1/, 'Dashboard counts must be scoped to user_email');
assert.match(dashCtrlSrc, /metric_key = \$1 AND user_email = \$2/, 'Dashboard metrics must be scoped to user metric_key and user_email');

assert.match(reportCtrlSrc, /INSERT INTO app_metrics[\s\S]*?pdf_exports_count = app_metrics\.pdf_exports_count \+ 1/, 'PDF export metrics must increment per user');
assert.match(reportCtrlSrc, /INSERT INTO app_metrics[\s\S]*?markdown_exports_count = app_metrics\.markdown_exports_count \+ 1/, 'Markdown export metrics must increment per user');

// ============================================================================
// ITEM 4: Settings are Truthful & Actually Affect Analysis Prompt & Selection
// ============================================================================
const promptEnLong = buildAiPrompt('en', 'long', 'Sample Subject', 'academic', 'IEEE');
assert.match(promptEnLong, /Sample Subject/, 'Prompt must include subjectContext');
assert.match(promptEnLong, /academic style/, 'Prompt must include writingStyle');
assert.match(promptEnLong, /IEEE formatting/, 'Prompt must include citationStyle');
assert.match(promptEnLong, /Synthesize in en \(long depth\)/, 'Prompt must include language and depth');

const candidatesAuto = ModelRegistry.getVisionCandidates({ maxCandidates: 2, hasGeminiKey: true, hasOpenRouterKey: true });
assert.ok(candidatesAuto.length > 0, 'Model registry must return candidates in auto mode');

const candidatesPreferred = ModelRegistry.getVisionCandidates({ maxCandidates: 2, preferredModel: 'gemini-3.7-flash', hasGeminiKey: true });
assert.equal(candidatesPreferred[0]?.id, 'gemini-3.7-flash', 'Preferred model must be prioritized');

const candidatesProvider = ModelRegistry.getVisionCandidates({ maxCandidates: 2, preferredProvider: 'gemini', hasGeminiKey: true });
assert.ok(candidatesProvider.every(c => c.provider === 'gemini'), 'Provider filter must strictly enforce provider');

// ============================================================================
// ITEM 5: /api/health Accurately Reports Degraded When DB Is Disconnected
// ============================================================================
const appSrc = source('app.js');
assert.match(appSrc, /app\.get\('\/api\/health'/, '/api/health route must be defined');
assert.match(appSrc, /let dbStatus = 'disconnected'/, 'Default DB status must be disconnected');
assert.match(appSrc, /const isHealthy = dbStatus === 'connected'/, 'Health depends strictly on connected DB');
assert.match(appSrc, /const httpStatus = isHealthy \? 200 : 503/, 'Unhealthy DB must return HTTP 503');
assert.match(appSrc, /status: isHealthy \? 'healthy' : 'degraded'/, 'Status must report degraded when DB disconnected');

// ============================================================================
// ITEM 6: Old Reports Compatibility
// ============================================================================
const legacyReport = {
  id: 'RPT-OLD-123',
  title: 'Old Legacy Report',
  subject: 'Vintage Aircraft',
  category: 'Aviation',
  summaryLead: 'Legacy summary lead',
  detailedAnalysis: 'Legacy detailed visual analysis',
  sections: [
    { heading: 'Old Section 1', body: 'Old content' }
  ],
  confidenceScore: '92.5%',
  visualEvidence: [
    'Slotted wings visible',
    { statement: 'Twin engine layout', status: 'observed' }
  ]
};

const normalizedLegacy = normalizeReport(legacyReport);
assert.equal(normalizedLegacy.confidenceScore, undefined, 'Legacy confidenceScore must be stripped');
assert.equal(normalizedLegacy.evidenceStatus, 'observed', 'Evidence status must be correctly resolved');
assert.equal(normalizedLegacy.summaryLead, 'Legacy summary lead', 'Legacy fields must be preserved');
assert.equal(normalizedLegacy.sections[0].heading, 'Old Section 1', 'Legacy sections array must be preserved');

// ============================================================================
// ITEM 7: Remove Misleading Confidence & Unsupported Claims
// ============================================================================
const demoReportSrc = source('../frontend/src/services/demoReport.js');
assert.doesNotMatch(demoReportSrc, /confidenceScore:\s*['"]99/, 'Demo report must not fabricate 99% confidence');
assert.doesNotMatch(demoReportSrc, /Sample Report Verified/, 'Demo report must not claim fake verification');

const canvasSrc = source('../frontend/src/utils/canvas.js');
assert.doesNotMatch(canvasSrc, /High \(Model Certainty\)/, 'Canvas stats must not claim fake AI model certainty');

// ============================================================================
// Image Handling & Decompression Bomb Limit
// ============================================================================
const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#f00' } }).png().toBuffer();
const optimized = await optimizeImage(`data:image/png;base64,${tiny.toString('base64')}`);
assert.match(optimized.dataUrl, /^data:image\/jpeg;base64,/);
assert.match(optimized.thumbnailDataUrl, /^data:image\/jpeg;base64,/);
assert.equal(optimized.width, 10);
const huge = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#000' } }).png().toBuffer();
await assert.rejects(() => optimizeImage(`data:image/png;base64,${huge.toString('base64')}`), error => error.statusCode === 413);

// ============================================================================
// Admission: Concurrency & Idempotency Replay Scoping
// ============================================================================
function response() { const res = new EventEmitter(); res.statusCode = 200; res.status = code => { res.statusCode = code; return res; }; res.json = body => { res.body = body; return res; }; return res; }
const email = 'admission-test@example.test';
const req1 = { user: { email }, get: () => '' }; const res1 = response(); let next1 = false;
admitAnalysis(req1, res1, () => { next1 = true; }); assert.equal(next1, true);
const req2 = { user: { email }, get: () => '' }; const res2 = response(); admitAnalysis(req2, res2, () => {});
const req3 = { user: { email }, get: () => '' }; const res3 = response(); admitAnalysis(req3, res3, () => {});
assert.equal(res3.statusCode, 429); res1.emit('finish'); res2.emit('finish');
storeCompletedAnalysis(email, 'retry-1', { reportId: 'RPT-1' });
assert.equal(getCompletedAnalysis(email, 'retry-1').reportId, 'RPT-1');
assert.equal(getCompletedAnalysis('other@example.test', 'retry-1'), null);

// ============================================================================
// SSRF Defense
// ============================================================================
assert.equal(isPrivateOrReservedIP('169.254.169.254'), true, 'AWS metadata IP must be private/reserved');
assert.equal(isPrivateOrReservedIP('127.0.0.1'), true, 'Loopback IPv4 must be private/reserved');
assert.equal(isPrivateOrReservedIP('::1'), true, 'Loopback IPv6 must be private/reserved');
assert.equal(isPrivateOrReservedIP('10.0.0.1'), true, '10.0.0.0/8 must be private/reserved');
assert.equal(isPrivateOrReservedIP('192.168.1.1'), true, '192.168.0.0/16 must be private/reserved');
assert.equal(isPrivateOrReservedIP('8.8.8.8'), false, 'Public DNS 8.8.8.8 must not be reserved');

// ============================================================================
// ITEM 8: Phase 9 Evidence Intelligence Workbench Assertions
// ============================================================================

// 8.1: aiPrompts directive and JSON schema prompt include evidenceLedger
const promptWorkbench = buildAiPrompt('en', 'standard', 'Technical Architecture', 'academic', 'APA');
assert.match(promptWorkbench, /EVIDENCE INTELLIGENCE WORKBENCH/i, 'Prompt must direct model to build an evidence ledger');
assert.match(promptWorkbench, /visual_observation/i, 'Prompt must include visual_observation type');
assert.match(promptWorkbench, /inference/i, 'Prompt must include inference type');
assert.match(promptWorkbench, /external_source/i, 'Prompt must include external_source type');
assert.match(promptWorkbench, /evidenceLedger/i, 'Schema prompt must include evidenceLedger array');

// 8.2: Person / Athlete Visual Report Normalization
const athleteReport = {
  title: 'Elite Marathon Athlete Analysis',
  subject: 'Marathon Runner in Blue Kit',
  category: 'Sports Science',
  visualType: 'photograph',
  evidenceLedger: [
    {
      claim: 'Subject is wearing blue kit with bib #402',
      evidenceType: 'visual_observation',
      supportStatus: 'supported',
      evidence: 'High contrast blue fabric with printed number 402 clearly visible on chest',
      reasoning: 'Direct optical detection in foreground pixels',
      sourceTitle: 'Optical Inspection',
      sourceUrl: null
    },
    {
      claim: 'Runner possesses sub-2:05 marathon pacing capability',
      evidenceType: 'inference',
      supportStatus: 'partially_supported',
      evidence: 'Elite footwear technology (carbon plate) and lead vehicle visible',
      reasoning: 'Visual cues suggest elite tier, but exact pacing requires official chip timing',
      sourceTitle: 'Visual Inference',
      sourceUrl: null
    },
    {
      claim: 'Won Berlin Marathon in 2024',
      evidenceType: 'external_source',
      supportStatus: 'supported',
      evidence: 'Race results database confirms bib #402 victory',
      reasoning: 'Corroborated by verified athletic record',
      sourceTitle: 'World Athletics Profile',
      sourceUrl: 'https://worldathletics.org/athletes/marathon-402'
    }
  ]
};

const normAthlete = normalizeReport(athleteReport);
assert.equal(normAthlete.reportVersion, '2.2', 'Report version must be 2.2');
assert.equal(normAthlete.evidenceLedger.length, 3, 'Evidence ledger must have 3 claims');
assert.equal(normAthlete.evidenceLedger[0].evidenceType, 'visual_observation');
assert.equal(normAthlete.evidenceLedger[0].supportStatus, 'supported');
assert.equal(normAthlete.evidenceLedger[1].evidenceType, 'inference');
assert.equal(normAthlete.evidenceLedger[1].supportStatus, 'partially_supported');
assert.equal(normAthlete.evidenceLedger[2].evidenceType, 'external_source');
assert.equal(normAthlete.evidenceLedger[2].sourceUrl, 'https://worldathletics.org/athletes/marathon-402');

// 8.3: Chart / Graph Report Normalization
const chartReport = {
  title: 'Global Renewable Energy Growth 2020-2025',
  subject: 'Renewable Capacity Bar Chart',
  visualType: 'chart',
  evidenceLedger: [
    {
      claim: 'Solar capacity grew consecutively from 2020 to 2025',
      evidenceType: 'visual_observation',
      supportStatus: 'supported',
      evidence: 'Yellow bar series shows monotonically increasing heights from year 2020 to 2025',
      reasoning: 'Direct geometric measurement of bar heights',
      sourceTitle: 'Visual Chart Inspection'
    },
    {
      claim: 'Growth rate will exceed 30% through 2030',
      evidenceType: 'inference',
      supportStatus: 'uncertain',
      evidence: 'Extrapolation beyond charted 2025 boundary',
      reasoning: 'Future trend continuation is speculative without external policy data'
    }
  ]
};

const normChart = normalizeReport(chartReport);
assert.equal(normChart.evidenceLedger.length, 2);
assert.equal(normChart.evidenceLedger[0].evidenceType, 'visual_observation');
assert.equal(normChart.evidenceLedger[1].supportStatus, 'uncertain');

// 8.4: Diagram / Architecture Report Normalization
const diagramReport = {
  title: 'Microservices Payment Gateway Topology',
  subject: 'Distributed Architecture Diagram',
  visualType: 'diagram',
  evidenceLedger: [
    {
      claim: 'Order Service connects directly to Payment Gateway via REST',
      evidenceType: 'visual_observation',
      supportStatus: 'supported',
      evidence: 'Directed arrow from Order Service block to Payment Gateway labeled /v1/charge',
      reasoning: 'Explicit edge label and arrow direction in diagram'
    },
    {
      claim: 'System achieves 99.999% uptime',
      evidenceType: 'inference',
      supportStatus: 'unsupported',
      evidence: 'No SLA figures or redundancy clusters depicted in diagram',
      reasoning: 'Uptime claim cannot be grounded in topological diagram alone'
    }
  ]
};

const normDiagram = normalizeReport(diagramReport);
assert.equal(normDiagram.evidenceLedger.length, 2);
assert.equal(normDiagram.evidenceLedger[1].supportStatus, 'unsupported', 'Unsupported claim must have unsupported status');

// 8.5: Object / Product Report Normalization & Sanitization of Invalid Types/Statuses
const productReport = {
  title: 'Industrial Robotic Arm Analysis',
  subject: '6-Axis Articulated Robot',
  visualType: 'photograph',
  evidenceLedger: [
    {
      claim: 'Robot features 6 revolute joints with end effector clamp',
      evidenceType: 'INVALID_TYPE_SHOULD_FALLBACK',
      supportStatus: 'VERIFIED_100_PERCENT',
      evidence: '6 visible motor housings and rotational joints in kinematic chain',
      reasoning: 'Physical component counting'
    },
    {
      claim: 'End effector clamp operates on 24V pneumatic solenoid',
      evidenceType: 'inference',
      supportStatus: 'partially_supported',
      evidence: 'Flexible black air tubing routed along forearm into dual port manifold',
      reasoning: 'Pneumatic line presence indicates fluid power, exact voltage inferred from industry standard'
    }
  ]
};

const normProduct = normalizeReport(productReport);
assert.equal(normProduct.evidenceLedger[0].evidenceType, 'inference', 'Invalid evidence type must default to inference');
assert.equal(normProduct.evidenceLedger[0].supportStatus, 'uncertain', 'Invalid support status must default to uncertain');

// 8.6: Fallback for Legacy Reports Without evidenceLedger
const legacyWithoutLedger = {
  title: '1970 Vintage Watch',
  subject: 'Chronograph Watch',
  visualEvidence: ['Three sub-dials visible', 'Tachymeter bezel']
};
const normLegacy = normalizeReport(legacyWithoutLedger);
assert.ok(Array.isArray(normLegacy.evidenceLedger), 'evidenceLedger must always be an array');
assert.equal(normLegacy.evidenceLedger.length, 2, 'Legacy report without ledger must synthesize evidence ledger from visualEvidence');

const emptyReport = { title: 'Empty Report' };
const normEmpty = normalizeReport(emptyReport);
assert.equal(normEmpty.evidenceLedger.length, 0, 'Report with no evidence must have empty ledger array');

// 8.7: Export Markdown incorporates Evidence Intelligence Workbench
const exportSrc = source('../frontend/src/utils/export.js');
assert.match(exportSrc, /Evidence Intelligence Workbench/, 'Export must include Evidence Intelligence Workbench section');
assert.match(exportSrc, /d\.evidenceLedger/, 'Export must access d.evidenceLedger');

// 8.8: Frontend ReportViewer integrates Workbench with XSS / URL safety
const viewerSrc = source('../frontend/src/components/ReportViewer.js');
assert.match(viewerSrc, /export function renderEvidenceWorkbench/, 'ReportViewer must export renderEvidenceWorkbench');
assert.match(viewerSrc, /renderEvidenceWorkbench\(data\)/, 'renderResultScreen must call renderEvidenceWorkbench');
assert.match(viewerSrc, /sanitizeUrl\(item\.sourceUrl\)/, 'Workbench must sanitize source URLs before rendering');
assert.match(viewerSrc, /escapeHtml/, 'Workbench must escape user/AI strings to prevent XSS');

// 8.9: Frontend HTML includes Workbench Container & Filter Controls and NO legacy confidence UI
const htmlSrc = source('../frontend/index.html');
assert.match(htmlSrc, /id="report-evidence-workbench-container"/, 'HTML must contain evidence workbench container');
assert.match(htmlSrc, /id="workbench-claims-list"/, 'HTML must contain claims list container');
assert.match(htmlSrc, /id="workbench-status-select"/, 'HTML must contain status filter dropdown');
assert.match(htmlSrc, /class="workbench-type-btn/, 'HTML must contain type filter buttons');

// 8.10: Complete removal of legacy fake confidence UI from report and drawer
assert.doesNotMatch(htmlSrc, /Multi-Metric Confidence Breakdown/, 'HTML must not contain Multi-Metric Confidence Breakdown');
assert.doesNotMatch(htmlSrc, /id="bar-conf-overall"/, 'HTML must not contain bar-conf-overall');
assert.doesNotMatch(htmlSrc, /id="label-conf-overall"/, 'HTML must not contain label-conf-overall');
assert.doesNotMatch(htmlSrc, /Confidence Score/, 'HTML must not contain Confidence Score in telemetry');
assert.doesNotMatch(htmlSrc, /Detection Fidelity/, 'HTML must not contain Detection Fidelity in specs');
assert.doesNotMatch(htmlSrc, /id="conf-bar-subject"/, 'HTML Explain drawer must not contain fake confidence bars');
assert.match(htmlSrc, /id="telemetry-evidence-status"/, 'HTML must contain telemetry-evidence-status');
// 8.11: Real-time Timestamps and Honest Analysis Badges (no duplicate IDs, no Verified Analysis)
assert.match(htmlSrc, /id="result-bar-timestamp"/, 'HTML must have result-bar-timestamp');
assert.match(htmlSrc, /id="report-hero-timestamp"/, 'HTML must have report-hero-timestamp');
assert.doesNotMatch(htmlSrc, /Generated Aug 13, 2026/, 'HTML must not have hardcoded Aug 13 2026 timestamp');
assert.doesNotMatch(htmlSrc, /Verified Analysis/, 'HTML must not claim fake Verified Analysis badge');
assert.match(viewerSrc, /result-bar-timestamp/, 'ReportViewer must update result-bar-timestamp');
assert.match(viewerSrc, /report-hero-timestamp/, 'ReportViewer must update report-hero-timestamp');

console.log('All InsightLens audit correctness & regression assertions PASSED (including Phase 9 Workbench and Legacy UI Removal)');

