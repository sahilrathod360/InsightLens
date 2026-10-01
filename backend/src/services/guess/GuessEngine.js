import { generateCustomId } from '../../utils/idUtils.js';

export class GuessEngine {
  /**
   * Compares a user's pre-analysis guess/hypothesis against actual extracted visual findings.
   * Categorizes alignment strictly as MATCHED, PARTIALLY MATCHED, NOT SUPPORTED, or NOT ENOUGH EVIDENCE.
   * NO fake numbers or percentage scores.
   * @param {Object} payload { guess: string, visualArtifact: Object }
   */
  evaluateGuess(payload = {}) {
    const { guess = '', visualArtifact = {} } = payload;
    const g = guess.trim().toLowerCase();

    if (!g) {
      return {
        guessId: generateCustomId('GSS'),
        guess: '',
        verdict: 'NOT ENOUGH EVIDENCE',
        summary: 'No user guess was submitted for evaluation.',
        comparisonPoints: []
      };
    }

    const claims = visualArtifact.claims || visualArtifact.findings || [];
    const struct = visualArtifact.diagramStructure || visualArtifact.chartStructure || {};
    const nodes = struct.nodes || [];
    const links = struct.links || struct.edges || [];

    // Extract all observable entity names & relation labels
    const observedTerms = [
      ...nodes.map(n => (n.label || n.id || '').toLowerCase()),
      ...links.map(l => `${(l.from || '').toLowerCase()} -> ${(l.to || '').toLowerCase()}`),
      ...claims.map(c => (typeof c === 'string' ? c : (c.claimText || c.claim || c.text || '')).toLowerCase())
    ].filter(Boolean);

    const words = g.split(/\s+/).filter(w => w.length >= 4);
    const matchedTerms = words.filter(w => observedTerms.some(t => t.includes(w)));

    let verdict = 'NOT SUPPORTED';
    let rationale = 'The visual analysis does not confirm the hypothesis stated in the guess.';

    if (matchedTerms.length >= 3 || (words.length > 0 && matchedTerms.length === words.length)) {
      verdict = 'MATCHED';
      rationale = 'The key entities and relationships in your guess are directly observed in the visual.';
    } else if (matchedTerms.length >= 1) {
      verdict = 'PARTIALLY MATCHED';
      rationale = 'Some components mentioned in your guess appear in the visual, but key connections remain unverified.';
    } else if (observedTerms.length === 0) {
      verdict = 'NOT ENOUGH EVIDENCE';
      rationale = 'Insufficient visual evidence extracted to substantiate or refute the guess.';
    }

    return {
      guessId: generateCustomId('GSS'),
      guess,
      verdict,
      rationale,
      matchedElements: matchedTerms,
      actualFindingsCount: claims.length || nodes.length,
      timestamp: new Date().toISOString()
    };
  }
}

export default new GuessEngine();
