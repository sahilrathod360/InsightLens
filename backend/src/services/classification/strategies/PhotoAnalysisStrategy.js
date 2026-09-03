import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class PhotoAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('photograph', 'PhotoAnalysisStrategy', 'Photo Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED PHOTOGRAPH PIPELINE GUIDELINES:
- Focus on directly observable subjects, objects, scene environment, lighting conditions, and spatial layout.
- For individuals or groups: Describe visible physical attributes, attire, posture, and spatial composition ONLY as visual descriptions. Do NOT assert unverified real-world identities, private names, or personal biographical facts unless verifiable directly from visible textual badges/inscriptions.
- Focus on visible actions, interactions, and environmental context.
- Document spatial relationships and focal depth.
- Record any visible inscriptions or background text verbatim.
- STRICT PROHIBITION: Do NOT invent unobservable locations, hidden motivations, intentions, internal context, or historical facts that cannot be grounded in visible features.`;
  }
}

export default PhotoAnalysisStrategy;
