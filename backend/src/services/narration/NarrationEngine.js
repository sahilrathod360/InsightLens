import { generateCustomId } from '../../utils/idUtils.js';

export class NarrationEngine {
  /**
   * Transforms structured findings, claims, and evidence into an ordered sequence of narration steps.
   * Each step carries the exact spoken observation and the linked evidence region ID for synchronized UI highlighting.
   * @param {Object} reportData { title, visualType, claims, findings, evidence }
   */
  generateNarrationSequence(reportData = {}) {
    const { title = 'Visual Analysis', visualType = 'DIAGRAM', claims = [], findings = [], evidence = [] } = reportData;

    const steps = [];
    let order = 1;

    // Introduction Step
    steps.push({
      stepId: `NAR-${order}`,
      order: order++,
      text: `Beginning evidence-grounded walkthrough for ${title}. Visual classified as ${visualType}.`,
      status: 'OBSERVED',
      claimId: null,
      evidenceId: null,
      region: 'HEADER_AREA',
      coordinates: { x: 0.05, y: 0.05, width: 0.9, height: 0.15, normalized: true }
    });

    // Evidence & Claims Steps
    const itemsToNarrate = evidence.length > 0 ? evidence : (claims.length > 0 ? claims : findings);

    itemsToNarrate.forEach((item, idx) => {
      const isEvidence = Boolean(item.coordinates && item.label);
      const label = item.label || item.region || `Finding ${idx + 1}`;
      const status = item.status || 'OBSERVED';
      const explanation = item.explanation || item.claimText || item.claim || item.text || item.description || `Observed ${label}`;
      const coords = item.coordinates || { x: 0.1 + (idx % 3) * 0.25, y: 0.2 + Math.floor(idx / 3) * 0.2, width: 0.2, height: 0.15, normalized: true };

      let spokenText = '';
      if (status === 'OBSERVED') {
        spokenText = `Region ${idx + 1}: Observed ${label}. ${explanation}`;
      } else if (status === 'INFERRED') {
        spokenText = `Region ${idx + 1}: Inferred connection for ${label}. ${explanation}`;
      } else {
        spokenText = `Region ${idx + 1}: For ${label}, visual evidence is undeterminable. ${explanation}`;
      }

      steps.push({
        stepId: `NAR-${order}`,
        order: order++,
        text: spokenText,
        status,
        claimId: item.claimId || `CLM-${idx + 1}`,
        evidenceId: item.id || `EVI-${idx + 1}`,
        region: label,
        coordinates: coords
      });
    });

    // Conclusion Step
    steps.push({
      stepId: `NAR-${order}`,
      order: order++,
      text: `Narration complete. All ${itemsToNarrate.length} analytical observations have been reviewed.`,
      status: 'OBSERVED',
      claimId: null,
      evidenceId: null,
      region: 'FOOTER_AREA',
      coordinates: { x: 0.05, y: 0.8, width: 0.9, height: 0.15, normalized: true }
    });

    return {
      narrationId: generateCustomId('NAR'),
      totalSteps: steps.length,
      estimatedDurationSec: Math.round(steps.length * 3.5),
      steps,
      timestamp: new Date().toISOString()
    };
  }
}

export default new NarrationEngine();
