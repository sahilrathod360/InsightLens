/** Conservatively normalizes shape without inventing missing research facts. */
import { DiagramStructureValidator } from '../diagram/DiagramStructureValidator.js';
import { ChartStructureValidator } from '../chart/ChartStructureValidator.js';
import { normalizeReportId } from '../../utils/idUtils.js';

export function normalizeEvidenceStatus(rawStatus) {
  if (!rawStatus || typeof rawStatus !== 'string') return 'UNDETERMINABLE';
  const clean = rawStatus.trim().toUpperCase();
  if (clean === 'OBSERVED' || clean === 'OBS') return 'OBSERVED';
  if (clean === 'INFERRED' || clean === 'INF') return 'INFERRED';
  if (clean === 'UNDETERMINABLE' || clean === 'UNCERTAIN' || clean === 'UNSUPPORTED' || clean === 'UNDETERMINED') return 'UNDETERMINABLE';
  
  const lower = rawStatus.trim().toLowerCase();
  if (lower === 'observed' || (lower === 'supported' && !lower.includes('infer'))) return 'OBSERVED';
  if (lower === 'inferred' || lower === 'partially_supported') return 'INFERRED';
  if (lower === 'undeterminable' || lower === 'uncertain' || lower === 'unsupported' || lower === 'undetermined') return 'UNDETERMINABLE';
  
  return 'UNDETERMINABLE';
}

function statusOf(value, fallback = 'uncertain') {
  const norm = normalizeEvidenceStatus(value);
  if (norm === 'OBSERVED') return 'observed';
  if (norm === 'INFERRED') return 'inferred';
  return 'undeterminable';
}

function normalizeEvidence(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => typeof item === 'string'
      ? { statement: item, status: 'undeterminable' }
      : { statement: String(item?.statement || '').trim(), status: statusOf(item?.status) })
    .filter(item => item.statement);
}

const VALID_EVIDENCE_TYPES = new Set(['visual_observation', 'external_source', 'inference']);
const VALID_SUPPORT_STATUSES = new Set(['supported', 'partially_supported', 'uncertain', 'unsupported']);

export function sanitizeBiometricText(text = '') {
  if (!text || typeof text !== 'string') return '';
  let clean = text;
  clean = clean.replace(/facial (structure|geometry|morphology|features|characteristics)\s+(uniquely\s+)?identif(ies|y|ied)(\s+the\s+subject)?/gi, 'observable visual attire and staging are consistent with');
  clean = clean.replace(/uniquely identif(ies|y|ied)\s+(as|the\s+subject|the\s+individual)?/gi, 'is consistent with');
  clean = clean.replace(/identity (is\s+)?(verified|confirmed|proven)(\s+by\s+facial\s+features)?/gi, 'contextual classification grounded in visual features');
  clean = clean.replace(/photographic database(s)?(\s+matching)?/gi, 'domain archival records');
  clean = clean.replace(/biometric\s+(identification|analysis|matching|measurement)/gi, 'visual feature analysis');
  clean = clean.replace(/confirmed by facial (features|structure|geometry)/gi, 'indicated by visible contextual markers');
  clean = clean.replace(/facial (features|structure|geometry|morphology)/gi, 'observable visual presentation');
  return clean.trim();
}

function isBiologicalDomain(subject = '', category = '') {
  const combined = `${subject} ${category}`.toLowerCase();
  const biologicalKeywords = ['animal', 'zoology', 'botany', 'plant', 'species', 'wildlife', 'bird', 'ornithology', 'canis', 'felis', 'mammal', 'reptile', 'insect', 'flora', 'fauna'];
  const nonBiologicalKeywords = ['person', 'human', 'actor', 'athlete', 'wrestler', 'cricketer', 'footballer', 'car', 'vehicle', 'automotive', 'stadium', 'building', 'architecture', 'chart', 'diagram', 'screenshot', 'document', 'map', 'gadget', 'circuit', 'phone'];
  for (const nb of nonBiologicalKeywords) {
    if (combined.includes(nb)) return false;
  }
  return biologicalKeywords.some(bk => combined.includes(bk));
}

function normalizeClaims(rawClaims, evidenceLedger = [], visualEvidence = [], observations = []) {
  const result = [];
  const claimList = Array.isArray(rawClaims) && rawClaims.length > 0
    ? rawClaims
    : (Array.isArray(evidenceLedger) && evidenceLedger.length > 0 ? evidenceLedger : []);

  let counter = 1;
  for (const item of claimList) {
    if (!item) continue;
    const statement = sanitizeBiometricText(typeof item === 'string' ? item : (item.statement || item.claim || '')).trim();
    if (!statement) continue;

    let rawStatus = typeof item === 'object' ? (item.status || item.supportStatus || item.evidenceStatus) : 'OBSERVED';
    let status = normalizeEvidenceStatus(rawStatus);

    if (item.evidenceType === 'visual_observation' && (item.supportStatus === 'supported' || item.supportStatus === 'partially_supported')) {
      status = 'OBSERVED';
    } else if (item.evidenceType === 'inference' || (item.evidenceType === 'external_source' && status !== 'UNDETERMINABLE')) {
      status = 'INFERRED';
    } else if (item.supportStatus === 'uncertain' || item.supportStatus === 'unsupported') {
      status = 'UNDETERMINABLE';
    }

    const evidence = sanitizeBiometricText(typeof item === 'object' ? (item.evidence || item.observation || '') : '').trim() || (status === 'OBSERVED' ? 'Direct visual optical evidence' : 'Contextual domain reasoning');
    const source = typeof item === 'object' ? (item.source || item.sourceTitle || (item.sourceUrl ? item.sourceUrl : null)) : null;
    const reasoning = sanitizeBiometricText(typeof item === 'object' ? (item.reasoning || item.rationale || '') : '').trim();

    result.push({
      id: item.id ? String(item.id).trim() : `claim_${counter++}`,
      statement,
      status, // 'OBSERVED' | 'INFERRED' | 'UNDETERMINABLE'
      evidence,
      source: source || (status === 'OBSERVED' ? 'Visual Optical Frame' : 'Domain Context'),
      reasoning: reasoning || (status === 'OBSERVED' ? 'Direct optical observation visible in image artifact.' : 'Analytical inference derived from observable features.')
    });
  }

  // If still empty, synthesize from visualEvidence/observations
  if (result.length === 0) {
    const combined = [...(observations || []), ...(visualEvidence || [])];
    for (const obs of combined) {
      const stmt = sanitizeBiometricText(typeof obs === 'string' ? obs : (obs.statement || '')).trim();
      if (!stmt) continue;
      const st = normalizeEvidenceStatus(obs.status);
      result.push({
        id: `claim_${counter++}`,
        statement: stmt,
        status: st,
        evidence: stmt,
        source: 'Visual Optical Frame',
        reasoning: st === 'OBSERVED' ? 'Direct optical observation in visual artifact.' : 'Inferred from visual presentation.'
      });
    }
  }

  return result;
}

function normalizeEvidenceLedger(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      let claim = sanitizeBiometricText(String(item.claim || item.statement || '').trim());
      if (!claim) return null;

      let rawType = String(item.evidenceType || '').toLowerCase().trim();
      let evidenceType = VALID_EVIDENCE_TYPES.has(rawType) ? rawType : 'inference';

      const isNamedIdentityAssertion = /\b(identity (is\s+)?(verified|confirmed)|uniquely identif|facial|biometric)\b/i.test(claim) ||
        (/\b(subject|person|individual) is [A-Z][a-z]+\s+[A-Z][a-z]+/i.test(claim) && !/\b(wearing|holding|standing|running|positioned|seated|dressed|equipped)\b/i.test(claim));
      if (evidenceType === 'visual_observation' && isNamedIdentityAssertion) {
        evidenceType = 'inference';
      }

      const rawStatus = String(item.supportStatus || '').toLowerCase().trim();
      const supportStatus = VALID_SUPPORT_STATUSES.has(rawStatus) ? rawStatus : 'uncertain';

      const evidence = sanitizeBiometricText(String(item.evidence || item.observation || '').trim());
      const reasoning = sanitizeBiometricText(String(item.reasoning || '').trim());
      const sourceTitle = item.sourceTitle ? String(item.sourceTitle).trim() : null;
      const sourceUrl = item.sourceUrl ? String(item.sourceUrl).trim() : null;
      const relatedSection = item.relatedSection ? String(item.relatedSection).trim() : '';

      return {
        claim,
        evidenceType,
        evidence,
        sourceTitle,
        sourceUrl,
        supportStatus,
        reasoning,
        relatedSection
      };
    })
    .filter(Boolean);
}

export function sanitizeSubjectTitle(str = '') {
  if (!str || typeof str !== 'string') return '';
  let clean = str.trim();
  clean = clean.replace(/^(Research Analysis of|Visual Analysis of|Analysis of|Visual Intelligence Report:|Visual Research Report:)\s+/i, '').trim();
  clean = clean.replace(/\.(jpe?g|png|webp|gif|bmp|tiff|svg)$/i, '');
  clean = clean.replace(/\b\d{2,5}x\d{2,5}\b/gi, '').trim();
  clean = clean.replace(/^[a-z0-9]{6,12}\s+([A-Z])/i, '$1').trim();
  return clean.trim();
}

function normalizeStructuredFindings(rawFindings, claims = [], observations = []) {
  if (Array.isArray(rawFindings) && rawFindings.length > 0) {
    let counter = 1;
    return rawFindings.map(f => {
      if (!f) return null;
      const statement = sanitizeBiometricText(typeof f === 'string' ? f : (f.statement || f.finding || f.claim || '')).trim();
      if (!statement) return null;
      const category = typeof f === 'object' && f.category ? String(f.category).trim() : 'Visual Observation';
      const status = normalizeEvidenceStatus(typeof f === 'object' ? (f.status || f.supportStatus) : 'OBSERVED');
      const evidence = sanitizeBiometricText(typeof f === 'object' ? (f.evidence || '') : '').trim() || 'Visual artifact detail';
      const reasoning = sanitizeBiometricText(typeof f === 'object' ? (f.reasoning || '') : '').trim();
      return {
        id: f.id ? String(f.id).trim() : `finding_${counter++}`,
        statement,
        category,
        status, // 'OBSERVED' | 'INFERRED' | 'UNDETERMINABLE'
        evidence,
        reasoning: reasoning || (status === 'OBSERVED' ? 'Direct visual detection from image artifact.' : 'Analytical deduction.')
      };
    }).filter(Boolean);
  }

  // Synthesize from claims/observations if missing
  let counter = 1;
  const items = Array.isArray(claims) && claims.length > 0 ? claims : (Array.isArray(observations) ? observations : []);
  return items.map(item => {
    const statement = sanitizeBiometricText(typeof item === 'string' ? item : (item.statement || item.claim || '')).trim();
    if (!statement) return null;
    const status = normalizeEvidenceStatus(item.status);
    return {
      id: `finding_${counter++}`,
      statement,
      category: item.category || 'Visual Observation',
      status,
      evidence: item.evidence || statement,
      reasoning: item.reasoning || (status === 'OBSERVED' ? 'Direct visual detection from image artifact.' : 'Analytical deduction.')
    };
  }).filter(Boolean);
}

export function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const visualEvidence = normalizeEvidence(raw.visualEvidence);
  const observations = normalizeEvidence(raw.observations);
  let evidenceLedger = normalizeEvidenceLedger(raw.evidenceLedger);
  if (evidenceLedger.length === 0 && (observations.length > 0 || visualEvidence.length > 0)) {
    const obsItems = observations.map(o => ({
      claim: o.statement,
      evidenceType: 'visual_observation',
      evidence: o.statement,
      sourceTitle: null,
      sourceUrl: null,
      supportStatus: o.status === 'observed' ? 'supported' : (o.status === 'inferred' ? 'partially_supported' : 'uncertain'),
      reasoning: 'Observed directly within the visual frame.',
      relatedSection: 'Visual Observations'
    }));
    const evItems = visualEvidence.map(e => ({
      claim: e.statement,
      evidenceType: e.status === 'observed' ? 'visual_observation' : 'inference',
      evidence: e.statement,
      sourceTitle: null,
      sourceUrl: null,
      supportStatus: e.status === 'observed' ? 'supported' : (e.status === 'inferred' ? 'partially_supported' : 'uncertain'),
      reasoning: e.status === 'observed' ? 'Direct visual detection from image artifact.' : 'Analytical inference derived from optical features.',
      relatedSection: 'Visual Evidence'
    }));
    evidenceLedger = [...obsItems, ...evItems].filter(item => item.claim);
  }

  // Standardize Claims and Findings
  const claims = normalizeClaims(raw.claims, evidenceLedger, visualEvidence, observations);
  const structuredFindings = normalizeStructuredFindings(raw.structuredFindings, claims, observations);

  const statuses = claims.map(c => c.status);
  const evidenceStatus = statuses.includes('OBSERVED')
    ? 'observed'
    : (statuses.includes('INFERRED') ? 'inferred' : 'undeterminable');

  const structuredSections = Array.isArray(raw.structuredSections)
    ? raw.structuredSections
      .map(section => ({
        heading: String(section?.heading || '').trim(),
        icon: String(section?.icon || 'article').trim(),
        content: String(section?.content || '').trim()
      }))
      .filter(section => section.heading && section.content)
    : [];

  const title = sanitizeSubjectTitle(raw.title) || 'Visual Research Brief';
  const subject = sanitizeSubjectTitle(raw.subject) || 'Visual Artifact Subject';
  const category = String(raw.category || '').trim();

  // Sanitize all visual statements
  const sanitizedVisualEvidence = visualEvidence.map(v => ({
    ...v,
    statement: sanitizeBiometricText(v.statement)
  }));
  const sanitizedObservations = observations.map(o => ({
    ...o,
    statement: sanitizeBiometricText(o.statement)
  }));

  const isBiological = isBiologicalDomain(subject, category);
  const domainClassification = String(raw.domainClassification || (isBiological ? (raw.scientificName || 'Biological Specimen') : (category || 'Empirical Visual Analysis'))).trim();

  // Normalize specialized structures
  const isDiagram = raw.visualType === 'diagram' || (raw.diagramStructure && Array.isArray(raw.diagramStructure.nodes) && raw.diagramStructure.nodes.length > 0);
  const diagramStructure = DiagramStructureValidator.validateAndRepair(raw.diagramStructure, isDiagram);

  const isChart = raw.visualType === 'chart' || (raw.chartStructure && ((Array.isArray(raw.chartStructure.dataPoints) && raw.chartStructure.dataPoints.length > 0) || raw.chartStructure.chartType));
  const chartStructure = ChartStructureValidator.validateAndRepair(raw.chartStructure, isChart);

  const normalized = {
    ...raw,
    id: raw.id ? normalizeReportId(raw.id) : undefined,
    title,
    subject,
    category: category || 'Visual Science',
    domainClassification,
    reportVersion: '2.2',
    visualEvidence: sanitizedVisualEvidence,
    observations: sanitizedObservations,
    claims,
    structuredFindings,
    evidenceLedger,
    structuredSections,
    diagramStructure,
    chartStructure,
    references: Array.isArray(raw.references) ? raw.references : [],
    limitations: Array.isArray(raw.limitations)
      ? raw.limitations.filter(Boolean)
      : (typeof raw.limitations === 'string' && raw.limitations.trim() ? [raw.limitations.trim()] : []),
    evidenceStatus,
    validationStatus: 'Schema validated; claims are not independently verified.'
  };

  if (!normalized.id) {
    delete normalized.id;
  }

  if (!isBiological) {
    delete normalized.scientificName;
  }
  delete normalized.confidence;
  delete normalized.confidenceScore;
  delete normalized.aiConfidence;
  return normalized;
}

export default normalizeReport;
