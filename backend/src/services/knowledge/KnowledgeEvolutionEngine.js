/**
 * Knowledge Evolution Engine
 * Implements semantic change detection across document versions, requirements, and research claims.
 * Identifies: NEW, REMOVED, MODIFIED, CONTRADICTED, STABLE, UNCERTAIN changes.
 */

export class KnowledgeEvolutionEngine {
  /**
   * Analyzes knowledge evolution between Source A (Baseline/V1) and Source B (Current/V2).
   */
  static analyze({ sourceA, sourceB, title = 'Document Evolution Analysis', sourceALabel = 'Version 1', sourceBLabel = 'Version 2' }) {
    const rawTextA = typeof sourceA === 'string' ? sourceA : (Array.isArray(sourceA) ? sourceA.join('\n') : JSON.stringify(sourceA));
    const rawTextB = typeof sourceB === 'string' ? sourceB : (Array.isArray(sourceB) ? sourceB.join('\n') : JSON.stringify(sourceB));

    const claimsA = this.extractStatements(rawTextA, sourceALabel);
    const claimsB = this.extractStatements(rawTextB, sourceBLabel);

    const changes = [];
    const matchedBIndexes = new Set();

    // 1. Process claims from Version A against Version B
    for (const itemA of claimsA) {
      let bestMatch = null;
      let highestSimilarity = 0;
      let matchType = 'REMOVED';

      for (let i = 0; i < claimsB.length; i++) {
        if (matchedBIndexes.has(i)) continue;
        const itemB = claimsB[i];
        
        const sim = this.computeSemanticSimilarity(itemA.text, itemB.text);
        const contradiction = this.detectContradiction(itemA.text, itemB.text);

        if (contradiction) {
          bestMatch = { index: i, item: itemB, sim, type: 'CONTRADICTED' };
          break;
        }

        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          if (sim >= 0.92) {
            matchType = 'STABLE';
          } else if (sim >= 0.35) {
            matchType = 'MODIFIED';
          }
          bestMatch = { index: i, item: itemB, sim, type: matchType };
        }
      }

      if (bestMatch && bestMatch.sim >= 0.35) {
        matchedBIndexes.add(bestMatch.index);
        const itemB = bestMatch.item;
        const type = bestMatch.type;

        const category = this.categorizeClaim(itemA.text + ' ' + itemB.text);
        const delta = this.extractSemanticDelta(itemA.text, itemB.text, type);
        const impact = this.estimateImpact(itemA.text, itemB.text, type, category);

        changes.push({
          id: `chg-${changes.length + 1}`,
          type, // STABLE, MODIFIED, CONTRADICTED
          category,
          previousStatement: itemA.text,
          newStatement: itemB.text,
          semanticDelta: delta,
          affectedSection: itemA.section || itemB.section || 'Core Specification',
          potentialImpact: impact,
          evidenceStatus: type === 'STABLE' ? 'OBSERVED' : (type === 'CONTRADICTED' ? 'CONTRADICTION_DETECTED' : 'INFERRED'),
          confidenceSupport: this.assessSupportability(itemA.text, itemB.text)
        });
      } else {
        // Claim was removed in Version B
        const category = this.categorizeClaim(itemA.text);
        changes.push({
          id: `chg-${changes.length + 1}`,
          type: 'REMOVED',
          category,
          previousStatement: itemA.text,
          newStatement: null,
          semanticDelta: `Requirement or claim eliminated in ${sourceBLabel}`,
          affectedSection: itemA.section || 'Core Specification',
          potentialImpact: 'Potentially significant',
          evidenceStatus: 'OBSERVED',
          confidenceSupport: 'Explicitly removed from document text'
        });
      }
    }

    // 2. Identify NEW claims in Version B
    for (let i = 0; i < claimsB.length; i++) {
      if (!matchedBIndexes.has(i)) {
        const itemB = claimsB[i];
        const category = this.categorizeClaim(itemB.text);
        changes.push({
          id: `chg-${changes.length + 1}`,
          type: 'NEW',
          category,
          previousStatement: null,
          newStatement: itemB.text,
          semanticDelta: `Newly introduced claim or capability in ${sourceBLabel}`,
          affectedSection: itemB.section || 'New Specification',
          potentialImpact: 'Moderate review recommended',
          evidenceStatus: 'OBSERVED',
          confidenceSupport: 'Directly stated in latest version'
        });
      }
    }

    // 3. Compute Metrics for Semantic Change Map
    const metrics = {
      totalClaimsTracked: changes.length,
      unchangedCount: changes.filter(c => c.type === 'STABLE').length,
      modifiedCount: changes.filter(c => c.type === 'MODIFIED').length,
      newCount: changes.filter(c => c.type === 'NEW').length,
      removedCount: changes.filter(c => c.type === 'REMOVED').length,
      contradictionsCount: changes.filter(c => c.type === 'CONTRADICTED').length,
      uncertainCount: changes.filter(c => c.type === 'UNCERTAIN').length
    };

    return {
      title,
      sourceALabel,
      sourceBLabel,
      metrics,
      changes
    };
  }

  /**
   * Splits document text into clean, structured individual assertions or claims.
   */
  static extractStatements(text, sourceLabel = '') {
    if (!text || typeof text !== 'string') return [];
    
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const statements = [];
    let currentSection = 'General';

    for (const line of lines) {
      if (line.startsWith('#') || line.endsWith(':')) {
        currentSection = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
        continue;
      }

      // Split sentences
      const sentences = line.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10);
      for (const sent of sentences) {
        statements.push({
          text: sent.replace(/^[-*•\d.)\s]+/, '').trim(),
          section: currentSection,
          source: sourceLabel
        });
      }
    }

    return statements;
  }

  /**
   * Computes normalized word-level and entity-level semantic similarity.
   */
  static computeSemanticSimilarity(textA, textB) {
    if (!textA || !textB) return 0;
    const cleanA = textA.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const cleanB = textB.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    if (cleanA === cleanB) return 1.0;

    const wordsA = new Set(cleanA.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(cleanB.split(/\s+/).filter(w => w.length > 2));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    // Check shared core subject overlap bonus
    const numsA = textA.match(/\d+(?:\.\d+)?/g) || [];
    const numsB = textB.match(/\d+(?:\.\d+)?/g) || [];
    const hasNumShift = numsA.length > 0 && numsB.length > 0 && numsA.join() !== numsB.join();

    if (hasNumShift && jaccard > 0.25) {
      return Math.max(0.65, jaccard + 0.25);
    }

    return jaccard;
  }

  /**
   * Detects direct polar contradictions between two assertions.
   */
  static detectContradiction(textA, textB) {
    const a = textA.toLowerCase();
    const b = textB.toLowerCase();

    const contradictionPairs = [
      ['supports', 'does not support'],
      ['supports', 'deprecates'],
      ['enabled', 'disabled'],
      ['required', 'optional'],
      ['synchronous', 'asynchronous'],
      ['client-side', 'server-side'],
      ['allow', 'prohibit'],
      ['faster', 'slower'],
      ['increased', 'decreased']
    ];

    for (const [pos, neg] of contradictionPairs) {
      if ((a.includes(pos) && b.includes(neg)) || (a.includes(neg) && b.includes(pos))) {
        // Ensure they talk about the same subject
        const sim = this.computeSemanticSimilarity(textA, textB);
        if (sim > 0.25) return true;
      }
    }

    return false;
  }

  /**
   * Categorizes the statement by domain typology.
   */
  static categorizeClaim(text) {
    const t = text.toLowerCase();
    if (/\d+(?:\.\d+)?\s*(?:users|ms|seconds|gb|mb|%|requests|qps|fps|px)/.test(t) || /\b\d+\b/.test(t)) {
      return 'Quantitative Claim';
    }
    if (t.includes('architecture') || t.includes('database') || t.includes('api') || t.includes('schema') || t.includes('protocol') || t.includes('service')) {
      return 'Architectural Specification';
    }
    if (t.includes('must') || t.includes('shall') || t.includes('requirement') || t.includes('validat') || t.includes('support')) {
      return 'Behavioral Requirement';
    }
    if (t.includes('methodology') || t.includes('experiment') || t.includes('study') || t.includes('dataset')) {
      return 'Methodological Claim';
    }
    return 'Qualitative Assessment';
  }

  /**
   * Extracts human-readable semantic delta summary (e.g. "Capacity changed: 100 → 500 users").
   */
  static extractSemanticDelta(textA, textB, type) {
    if (type === 'STABLE') return 'Semantics and scope remain unchanged across versions.';
    if (type === 'CONTRADICTED') return `Direct contradiction detected between versions.`;
    
    // Quantitative delta
    const numsA = textA.match(/\d+(?:\.\d+)?/g);
    const numsB = textB?.match(/\d+(?:\.\d+)?/g);

    if (numsA && numsB && numsA[0] !== numsB[0]) {
      return `Quantitative metric shifted from ${numsA[0]} to ${numsB[0]}`;
    }

    return `Scope or wording modified; review downstream dependency impacts.`;
  }

  /**
   * Evaluates potential impact level.
   */
  static estimateImpact(textA, textB, type, category) {
    if (type === 'CONTRADICTED') return 'Critical — Contradiction requires immediate review';
    if (category === 'Quantitative Claim' || category === 'Architectural Specification') {
      return 'Potentially significant — Downstream dependencies may require adjustment';
    }
    if (type === 'REMOVED') return 'Moderate — Deprecated or removed requirement';
    return 'Low / Informational';
  }

  /**
   * Assesses supportability without inventing fake numeric scores.
   */
  static assessSupportability(textA, textB) {
    if (/\b(?:benchmark|measured|tested|verified|proven|logged)\b/i.test(textB)) {
      return 'Supported by explicit empirical mention in text';
    }
    return 'Stated specification without attached external benchmark in text';
  }
}

export default KnowledgeEvolutionEngine;
