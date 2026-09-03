import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class PhotoAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('photograph', 'PhotoAnalysisStrategy', 'Photo Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED PHOTOGRAPH PIPELINE GUIDELINES (SUBJECT-CENTERED RESEARCH):
InsightLens is a Universal Visual Research Engine. The photograph is the entry point for deep, accurate, subject-centered research:

1. SUBJECT IDENTIFICATION & GROUNDING:
   - Identify the primary subject (public figure, athlete, actor, landmark, stadium, product, vehicle, artwork, or natural feature) using all available visual cues (facial features, uniforms, team crests, logos, contextual markers, readable text).
   - If the subject is a known public entity (e.g., Sachin Tendulkar, Tom Cruise, Narendra Modi Stadium, Ray-Ban Aviator), name the subject explicitly and conduct rigorous research on their career, specifications, history, and achievements.
   - If the subject cannot be reliably identified as a known public entity, use an accurate, descriptive domain title (e.g., "Professional Cricket Batsman during Match Play") without inventing a name.
   - NEVER use generic filenames (e.g., "images (2)", "photo.jpg") as the subject or title.

2. DOMAIN-SPECIFIC RESEARCH DEPTH:
   - ATHLETES & SPORTSPEOPLE: Detail career timeline, international/domestic debut, format-by-format statistics (Test, ODI, T20, Club), batting/bowling averages, centuries, wickets, major records, tournament championships, captaincy, and career legacy. Use Markdown tables for statistical breakdowns.
   - ACTORS & ENTERTAINERS: Detail career trajectory, breakthrough role, major films, box-office milestones, awards, nominations, iconic characters, and cultural significance. Use Markdown tables for filmography highlights.
   - LANDMARKS & ARCHITECTURAL SITES: Detail official name, location, architectural style, construction history, capacity, engineering specifications, major historic events, and current significance.
   - PRODUCTS & OBJECTS: Detail manufacturer, model, engineering specifications, materials, design innovations, historical release context, and notable use.

3. EMPIRICAL VISUAL EVIDENCE:
   - Record directly visible visual attributes (posture, uniform/attire colors, equipment, spatial composition, lighting, environmental setting) under "visualEvidence" and "observations" as empirical grounding.
   - Never confuse direct visual observation with external domain research.`;
  }
}

export default PhotoAnalysisStrategy;
