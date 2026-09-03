import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class PhotoAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('photograph', 'PhotoAnalysisStrategy', 'Photo Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED PHOTOGRAPH PIPELINE GUIDELINES (COMPREHENSIVE VISUAL INTELLIGENCE):
InsightLens requires rich, rigorous, empirical visual analysis for photographs rather than superficial demographic tags or 3-word generic labels.
You MUST systematically evaluate and articulate the photographic evidence across these 10 concrete visual dimensions:

1. SUBJECT DESCRIPTION:
   - Provide a granular descriptive breakdown of the focal subject(s).
   - Describe visible posture, physical silhouette, and spatial scale relative to the scene.
   - Avoid generic demographic summaries (e.g., do NOT just say "young adult male in suit"). Characterize the concrete visual attributes.

2. VISIBLE CLOTHING & APPAREL:
   - Meticulously catalog all visible garments: fabric types, weave, sheen, color palette, cuts, tailoring, lapel styles, collar construction, buttons, and folds.
   - Note visible textures (e.g., velvet, wool, silk satin, cotton twill) and craftsmanship details.

3. POSE & BODY POSITIONING:
   - Stance, posture, spine alignment, angle of head tilt, and direction of gaze.
   - Positioning of hands, arms, shoulders, and leg placement.

4. FACIAL & VISIBLE APPEARANCE (STRICT IDENTITY SAFETY RULE):
   - Describe visible facial features: hair color, styling/parting, grooming, eye region, and visible expression (neutral, composed, slight smile) objectively.
   - CRITICAL MANDATORY SAFETY RULE: Do NOT invent, guess, or confidently assert the identity of any real person from facial appearance alone.
   - Do NOT convert visual resemblance into a named-person claim.
   - Never hallucinate a real person's name merely because the model recognizes or sees a resemblance. Describe the visual appearance only.

5. OBJECTS, ACCESSORIES & ADORNMENTS:
   - Visible wristwatches, neckwear, bow ties, jewelry, eyewear, cufflinks, pocket squares, or carried items.
   - Note material finishes (e.g., metallic gold, brushed steel, polished satin).

6. ENVIRONMENT, BACKGROUND & SETTING:
   - Detail the physical setting: interior architectural elements (molding, panels, curtains, walls) or exterior features (vegetation, terrain, sky, buildings).
   - Analyze depth of field, background bokeh, and focal plane separation.

7. LIGHTING & OPTICAL CHARACTERISTICS:
   - Key light position and direction (e.g., 45-degree Rembrandt lighting, frontal fill, overhead rim lighting).
   - Highlights, shadows, shadow falloff, specular reflections, and color temperature (warm tungsten, neutral daylight, cool ambient).

8. COMPOSITION, FRAMING & PERSPECTIVE:
   - Framing type (medium portrait, close-up, environmental three-quarter), camera angle (eye-level, low, high), rule-of-thirds, and visual symmetry.

9. NOTABLE VISUAL DETAILS & MICRO-FEATURES:
   - Surface textures, fabric weave patterns, reflections, edge sharpness, and focal clarity.

10. VISUAL UNCERTAINTY & BOUNDARIES:
   - Explicitly document what CANNOT be established from the 2D visual (e.g., geographic location, private occasion/event, unseen surroundings).

REQUIRED REPORT DEPTH:
- "detailedAnalysis": Must be comprehensive (at least 250-350 words across 3+ distinct paragraphs) analyzing clothing, lighting, posture, composition, and environment in detail.
- "title" & "subject": Use descriptive, objective visual titles (e.g., "Formal Portrait Study: Tailored Evening Attire in Controlled Studio Lighting") rather than named-person claims or shallow demographic summaries.`;
  }
}

export default PhotoAnalysisStrategy;
