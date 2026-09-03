import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class GenericAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('unknown', 'GenericAnalysisStrategy', 'Standard Empirical Visual Pipeline');
  }

  getInstructions() {
    return `STANDARD EMPIRICAL VISUAL ANALYSIS GUIDELINES (GENERAL / UNKNOWN CLASSIFICATION):
- Used when visual type is hybrid, ambiguous, non-standard, or classification confidence is low.
- Provide rigorous, objective visual observation without forcing an unconfirmed specialized archetype.
- Analyze dominant visual geometry, focal regions, chromatic properties, luminance contrast, and spatial hierarchy.
- Document any legible text, symbolic marks, logos, or domain artifacts observable.
- Classify the subject within general scientific, cultural, or physical domain taxonomy.
- Ground all findings strictly in directly observable features without unwarranted assumptions.`;
  }
}

export default GenericAnalysisStrategy;
