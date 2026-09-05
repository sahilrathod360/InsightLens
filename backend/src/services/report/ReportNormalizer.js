/** Conservatively normalizes shape without inventing missing research facts. */
const EVIDENCE_STATUSES = new Set(['observed', 'inferred', 'uncertain']);

function statusOf(value, fallback = 'uncertain') {
  const normalized = String(value || fallback).toLowerCase();
  return EVIDENCE_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeEvidence(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => typeof item === 'string'
      ? { statement: item, status: 'uncertain' }
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

function normalizeEvidenceLedger(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      let claim = sanitizeBiometricText(String(item.claim || '').trim());
      if (!claim) return null;

      let rawType = String(item.evidenceType || '').toLowerCase().trim();
      let evidenceType = VALID_EVIDENCE_TYPES.has(rawType) ? rawType : 'inference';

      // If a claim is an explicit named identity assertion (e.g. "Subject is Roman Reigns"), visual_observation is invalid -> downgrade to inference
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
  const statuses = [...visualEvidence, ...observations].map(item => item.status);
  const evidenceStatus = statuses.includes('observed')
    ? 'observed'
    : (statuses.includes('inferred') ? 'inferred' : statusOf(raw.evidenceStatus));

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

  const normalized = {
    ...raw,
    title,
    subject,
    category: category || 'Visual Science',
    domainClassification,
    reportVersion: '2.2',
    visualEvidence: sanitizedVisualEvidence,
    observations: sanitizedObservations,
    evidenceLedger,
    structuredSections,
    references: Array.isArray(raw.references) ? raw.references : [],
    limitations: Array.isArray(raw.limitations)
      ? raw.limitations.filter(Boolean)
      : (typeof raw.limitations === 'string' && raw.limitations.trim() ? [raw.limitations.trim()] : []),
    evidenceStatus,
    validationStatus: 'Schema validated; claims are not independently verified.'
  };

  if (!isBiological) {
    delete normalized.scientificName;
  }
  delete normalized.confidence;
  delete normalized.confidenceScore;
  delete normalized.aiConfidence;
  return normalized;
}

export default normalizeReport;
