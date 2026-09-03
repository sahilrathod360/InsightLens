import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class ArtworkAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('artwork', 'ArtworkAnalysisStrategy', 'Artwork Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED ARTWORK & VISUAL CREATION PIPELINE GUIDELINES:
- Identify the apparent artistic medium, technique, or visual style if visually evident (e.g., oil on canvas, watercolor, fresco, pencil sketch, digital concept art, vector illustration, printmaking, classical sculpture).
- Analyze spatial composition, rule-of-thirds, perspective, horizon lines, framing, and focal points.
- Characterize the primary subjects, figures, symbolic elements, and background scenery.
- Evaluate chromatic palette, dominant hue families, color harmony, saturation, chiaroscuro, tonal range, and lighting sources.
- Detail visual textures, brushwork fidelity, line weight, geometric motifs, and structural forms.
- Note any visible signatures, monograms, dates, or textual inscriptions verbatim.
- STRICT PROHIBITION: Do NOT make unverified, definitive assertions regarding unknown artists, specific historical provenance, acquisition records, or private collection history unless directly recognizable as a globally famous museum masterwork or clearly labeled.`;
  }
}

export default ArtworkAnalysisStrategy;
