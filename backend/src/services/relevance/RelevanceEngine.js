export const VALID_INTENTS = [
  'General Understanding',
  'Structural Analysis',
  'Verification',
  'Inconsistency Detection',
  'Data Extraction',
  'Research / Evidence Analysis',
  'Comparison'
];

export const RELEVANCE_TIERS = ['HIGH RELEVANCE', 'SUPPORTING', 'LOW RELEVANCE'];

export class RelevanceEngine {
  /**
   * Prioritizes findings and evidence based on the specified Analysis Intent.
   * @param {Array<Object>} findings List of finding items or claims
   * @param {string} intent Selected Analysis Intent
   */
  prioritizeFindings(findings = [], intent = 'General Understanding') {
    const activeIntent = VALID_INTENTS.includes(intent) ? intent : 'General Understanding';

    return findings.map((finding, idx) => {
      const text = typeof finding === 'string' ? finding : (finding.claim || finding.text || finding.title || '');
      const type = (finding.type || finding.evidenceType || '').toUpperCase();
      const status = (finding.status || finding.evidenceStatus || 'OBSERVED').toUpperCase();
      const lower = text.toLowerCase();

      let tier = 'SUPPORTING';
      let rationale = 'Supporting finding for overall context.';

      switch (activeIntent) {
        case 'Structural Analysis':
          if (type.includes('NODE') || type.includes('EDGE') || lower.includes('connection') || lower.includes('flow') || lower.includes('process') || lower.includes('entity')) {
            tier = 'HIGH RELEVANCE';
            rationale = 'Directly impacts topological hierarchy, entity interactions, and connectivity.';
          } else if (status === 'OBSERVED') {
            tier = 'SUPPORTING';
            rationale = 'Ground-truth observation of diagram layout.';
          } else {
            tier = 'LOW RELEVANCE';
            rationale = 'Non-structural ancillary detail.';
          }
          break;

        case 'Verification':
          if (status === 'UNDETERMINABLE' || status === 'CONTRADICTED' || lower.includes('unverified') || lower.includes('missing') || lower.includes('partial')) {
            tier = 'HIGH RELEVANCE';
            rationale = 'Highlights evidentiary uncertainty, unverified assumptions, or potential contradictions.';
          } else if (status === 'OBSERVED') {
            tier = 'HIGH RELEVANCE';
            rationale = 'Confirmed visual ground truth verifying claim.';
          } else {
            tier = 'SUPPORTING';
            rationale = 'Secondary inference requiring further validation.';
          }
          break;

        case 'Inconsistency Detection':
          if (status === 'POTENTIAL CONFLICT' || lower.includes('mismatch') || lower.includes('inconsistent') || lower.includes('contradict') || lower.includes('conflict')) {
            tier = 'HIGH RELEVANCE';
            rationale = 'Identifies representation divergence or conflicting definitions between artifacts.';
          } else if (lower.includes('link') || lower.includes('direction')) {
            tier = 'SUPPORTING';
            rationale = 'Directional dependency relevant to consistency checking.';
          } else {
            tier = 'LOW RELEVANCE';
            rationale = 'Isolated visual element with no cross-artifact conflict.';
          }
          break;

        case 'Data Extraction':
          if (type.includes('CHART') || lower.includes('value') || lower.includes('percent') || lower.includes('metric') || lower.includes('table') || lower.includes('series')) {
            tier = 'HIGH RELEVANCE';
            rationale = 'Quantitative metric or structured key-value data point.';
          } else if (status === 'OBSERVED') {
            tier = 'SUPPORTING';
            rationale = 'Observed qualitative label.';
          } else {
            tier = 'LOW RELEVANCE';
            rationale = 'Abstract high-level narrative.';
          }
          break;

        case 'Research / Evidence Analysis':
          if (finding.evidenceRegion || finding.coordinates || status === 'OBSERVED') {
            tier = 'HIGH RELEVANCE';
            rationale = 'Strong visual provenance and explicit bounding coordinates in source artifact.';
          } else {
            tier = 'SUPPORTING';
            rationale = 'General contextual evidence.';
          }
          break;

        case 'Comparison':
          if (lower.includes('add') || lower.includes('remove') || lower.includes('modif') || lower.includes('diff') || lower.includes('delta')) {
            tier = 'HIGH RELEVANCE';
            rationale = 'Direct differential delta between visual versions.';
          } else {
            tier = 'SUPPORTING';
            rationale = 'Baseline element for comparative context.';
          }
          break;

        case 'General Understanding':
        default:
          if (idx < 3 || status === 'OBSERVED') {
            tier = 'HIGH RELEVANCE';
            rationale = 'Core visual takeaway defining the primary artifact subject.';
          } else {
            tier = 'SUPPORTING';
            rationale = 'Supplementary contextual detail.';
          }
          break;
      }

      return {
        ...(typeof finding === 'object' ? finding : { claim: text }),
        relevanceTier: tier,
        relevanceRationale: rationale,
        intentApplied: activeIntent
      };
    }).sort((a, b) => {
      const order = { 'HIGH RELEVANCE': 1, 'SUPPORTING': 2, 'LOW RELEVANCE': 3 };
      return (order[a.relevanceTier] || 2) - (order[b.relevanceTier] || 2);
    });
  }
}

export default new RelevanceEngine();
