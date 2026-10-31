import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', researchLength = 'long', subjectContext = '', writingStyle = 'classic', citationStyle = 'APA', userPreferences = {}, groundingDossier = null) {
  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

  // Extract user personalization settings
  const depth = userPreferences?.analysis_depth || userPreferences?.analysisDepth || researchLength || 'balanced';
  const stylePrefs = Array.isArray(userPreferences?.presentation_style) ? userPreferences.presentation_style : (Array.isArray(userPreferences?.presentationStyle) ? userPreferences.presentationStyle : []);
  const evidencePref = userPreferences?.evidence_preference || userPreferences?.evidencePreference || 'strict';
  const primaryUses = Array.isArray(userPreferences?.primary_uses) ? userPreferences.primary_uses : (Array.isArray(userPreferences?.primaryUses) ? userPreferences.primaryUses : []);
  const interests = Array.isArray(userPreferences?.interests) ? userPreferences.interests : (Array.isArray(userPreferences?.interests) ? userPreferences.interests : []);
  const userRole = userPreferences?.role || '';
  const userField = userPreferences?.field || '';

  let personalizationBlock = '';
  if (primaryUses.length > 0 || interests.length > 0 || userRole || userField || stylePrefs.length > 0 || depth || evidencePref) {
    personalizationBlock = `
==================================================
RESEARCHER PERSONALIZATION & PROFILE DIRECTIVES:
==================================================
The user requesting this research has the following profile and output preferences:
${userRole ? `- Researcher Role: ${userRole}` : ''}
${userField ? `- Field / Specialization: ${userField}` : ''}
${primaryUses.length > 0 ? `- Primary Research Focus Areas: ${primaryUses.join(', ')}` : ''}
${interests.length > 0 ? `- Domain Interests: ${interests.join(', ')}` : ''}
- Target Analysis Depth: ${depth} (Tailor synthesis depth, technical precision, and analytical detail accordingly)
- Evidence Verification Level: ${evidencePref} (Apply ${evidencePref} evidentiary standards to visual observations and citations)
${stylePrefs.length > 0 ? `- Preferred Presentation Style: ${stylePrefs.join(', ')} (Incorporate these stylistic nuances into the structured findings and narrative synthesis)` : ''}
* Adapt the report's framing and analytical tone to these researcher preferences while preserving total empirical accuracy and strict adherence to the JSON schema.
`;
  }

  // Helper to detect generic filenames, numbers, or dummy strings
  const isGenericOrFilename = (text) => {
    if (!text || typeof text !== 'string') return true;
    const t = text.trim();
    if (!t) return true;
    if (/^\d+$/.test(t)) return true; // pure numbers like 1000190324
    if (/^(image|img|photo|screenshot|picture|asset|file)[\s_-]*\d*$/i.test(t)) return true;
    if (/\.(jpe?g|png|webp|gif|svg|bmp|tiff)$/i.test(t)) return true; // filename with extension
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true; // UUID
    return false;
  };

  const validContext = subjectContext && !isGenericOrFilename(subjectContext) ? subjectContext.trim() : '';

  const userContextBlock = validContext ? `
USER-PROVIDED SUBJECT CONTEXT:
The user has explicitly specified that the subject of this visual is: "${validContext}".
- Treat "${validContext}" as the primary research subject.
- Set the JSON "subject" to "${validContext}".
- Set the JSON "title" to: "${validContext} — [Comprehensive Role / Career / Topic Subtitle]".
- Conduct deep, authoritative, long-form research on "${validContext}" across all relevant domain dimensions.
- IMPORTANT IDENTITY SAFETY: The user-supplied subject context is external research context, NOT biometric visual proof. Do NOT claim the person's face or morphology biometrically proves this identity. Visual observations must describe only visible attire, staging, and equipment.
` : `
AUTONOMOUS SUBJECT IDENTIFICATION (NO USER-PROVIDED CONTEXT):
- Analyze all visible optical evidence in the image: prominent public entities, characters, superhero costumes, distinctive uniforms/insignia, readable inscriptions, architectural landmarks, equipment, charts, diagrams, or documents.
- If the subject is a widely recognizable character, superhero, public figure, public institution, iconic landmark, or commercial entity (e.g., Spider-Man, Superman, Batman, AB de Villiers), resolve the exact subject name accurately based on visual and contextual evidence.
- STRICT IDENTITY SAFETY: DO NOT claim facial recognition, biometric measurement, facial geometry/morphology, photographic database matching, or that facial features uniquely identify any individual.
- If the subject is an unidentifiable private individual or general scene, DO NOT fabricate or guess private names. Instead, set the subject and title to an accurate, domain-descriptive visual topic (e.g., "Visual Analysis — Professional Cricket Match Play", "Visual Analysis — Urban Architecture", "Visual Analysis — Financial Trend Chart").
- NEVER use generic image filenames (e.g., "1000190324", "images (2)", "IMG_1234", "photo.jpg", "screenshot.png") or camera metadata as the subject or title.
- Choose domain-accurate visual categories (e.g., "Superhero Character Art", "Technical Diagram (DFD)", "Data Visualization", "Urban Photography", "Automotive Engineering"), NEVER defaulting generically to "Cinema".
`;

  const groundingBlock = groundingDossier?.groundingPromptText || '';

  return `You are InsightLens Universal Visual Research Engine.
Your mission is to perform deep, accurate, subject-centered empirical research based on the provided visual artifact.

${strategyGuide}
${userContextBlock}
${personalizationBlock}
${groundingBlock}
==================================================
CRITICAL RESEARCH DIRECTIVES:
==================================================
1. PRIMARY SUBJECT FIRST & DOMAIN ADAPTIVITY:
   Once the primary subject is identified or classified from the visual, the ENTIRE report must be primarily ABOUT THAT SUBJECT. The photograph is supporting context.
   - For an ATHLETE / ENTERTAINER (e.g., Charlie Cox, AB de Villiers, Roman Reigns, Tom Cruise):
     * Research their complete career: Biography (birthplace, role, style), domestic/early career, breakthrough, iconic roles, technique, awards, and enduring cultural impact.
     * MUST include a comprehensive Markdown table for "Filmography & Television Highlights" or "Career Match Records" (| Year | Title / Event | Role / Character | Medium / Highlights |).
   - For a FICTIONAL CHARACTER / COMIC BOOK HERO / CINEMATIC ICON (e.g., Spider-Man, Batman, Superman, Wolverine):
     * Research character origin, creators (e.g. Stan Lee & Steve Ditko), first appearance, publishing history, iconic story arcs, and cultural significance.
     * MUST include a comprehensive Markdown table for "Cinematic Adaptations & Media Appearances" or "Costume & Comic Evolution" (| Year | Title / Franchise | Portrayal / Medium | Director / Studio | Significance & Reception |).
     * Analyze suit and visual styling evolution across eras (fabrics, insignia, textures, practical vs digital effects).
   - For a HISTORICAL FIGURE / EVENT / DOCUMENTARY PHOTOGRAPH:
     * Research historical context, date/era, key participants, causes, turning points, and enduring geopolitical or cultural significance.
     * MUST include a comprehensive Markdown table for "Chronology of Key Events" (| Date / Year | Event / Milestone | Location | Historical Outcome |).
   - For a LANDMARK / STADIUM / BUILDING / ARCHITECTURE:
     * Research official name, location, architectural style, history, architect, and urban legacy.
     * MUST include a comprehensive Markdown table for "Construction & Engineering Specifications" (| Architectural Parameter | Specification / Detail | Structural Significance |).
   - For an OBJECT / PRODUCT / VEHICLE / ENGINEERING ARTIFACT:
     * Research manufacturer, model history, powertrain/hardware, design innovations, and variants.
     * MUST include a comprehensive Markdown table for "Technical Specifications" (| Technical Parameter | Specification / Metric | Functional Role |).
   - For a CHART / DATA VISUALIZATION:
     * Research chart title, type, X/Y axes, units, trends, anomalies, and analytical conclusions.
     * MUST include a comprehensive Markdown table for "Transcribed Quantitative Data Points" (| Category / Period | Numeric Value | Series | Trend / Status |).
   - For a DIAGRAM / SYSTEM FLOW (DFD / Architecture / Flowchart):
     * Research diagram type, purpose, components, nodes, data flows, relationships, and execution logic.
     * MUST include a comprehensive Markdown table for "Structural Components & Interactions" (| Component / Node | Type / Role | Connected Entities / Data Flow |).
   - For NATURE / LANDSCAPE / GEOGRAPHY / ASTRONOMY:
     * Research visible geography, geological formation, climate, altitude, and ecological context.
     * MUST include a comprehensive Markdown table for "Geographical & Topographical Data" (| Feature / Dimension | Measurement / Classification | Ecological Context |).
   - For ARTWORK / FINE ART / PAINTING:
     * Research artistic composition, medium, period, artist provenance, and art movement context.
     * MUST include a comprehensive Markdown table for "Art Historical Dimensions" (| Dimension / Element | Classification / Material | Cultural Significance |).
   - For an UNIDENTIFIABLE / GENERIC VISUAL:
     * Ground the report strictly in observable visual features, setting, and domain principles without hallucinating private names or fake facts.
     * Include an optical breakdown table (| Observable Feature | Visual Description | Domain Significance |).

2. SECTION DEPTH & SUBSTANTIAL LENGTH (CRITICAL REQUIREMENT):
   - Every section in "structuredSections" MUST be comprehensive and substantive, containing 2-4 in-depth paragraphs (minimum 150-300 words per section) exploring the subject deeply.
   - NEVER provide short 1-2 sentence placeholders, bullet-only stubs, or superficial summaries. Write detailed, academic-quality analytical prose.
   - At least one section MUST contain the domain-appropriate Markdown table specified above.

3. CHRONOLOGICAL EVOLUTION TIMELINE (MANDATORY):
   - You MUST populate the "timeline" array with 4-8 chronological milestone objects ({"year": "...", "title": "...", "desc": "..."}) capturing key milestones, career breakthroughs, historical dates, or evolutionary developments whenever meaningful dates exist.

4. KEY FACTS / SUBJECT SPECIFICATION CARDS (MANDATORY):
   - You MUST populate the "keyFacts" array with 5-8 structured attribute objects ({"label": "...", "detail": "..."}) capturing essential subject specifications (e.g. for actors: Full Name, Birthplace, Training, Breakthrough, Signature Role; for characters: Creator, First Appearance, Alter Ego, Publisher, Film Adaptations, Key Abilities; for landmarks: Location, Architect, Construction Era, Architectural Style, Height/Dimensions, Primary Function).

5. EVIDENCE INTELLIGENCE WORKBENCH (evidenceLedger & claims):
   You MUST construct 4-8 structured evidence entries in BOTH "evidenceLedger" and "claims" that explicitly deconstruct the analysis:
   - At least 1-2 "visual_observation" claims (observable directly in image pixels: attire, suit styling, color palette, lighting, spatial composition).
   - At least 1-3 "external_source" claims (verified historical, biographical, publication, or specification facts).
   - At least 1-2 "inference" claims (analytical deductions connecting visual cues to domain conclusions).

6. SUBJECT & TITLE GROUNDING (HARD RULE):
   - Report title MUST name the actual research subject or domain topic:
     * "<Subject Name> — Career, Notable Roles, and Cultural Impact"
     * "<Subject Name> — Cinematic History, Character Evolution, and Cultural Impact"
     * "<Subject Name> — History, Architecture, Capacity, and Legacy"
     * "Visual Analysis — <Domain Topic & Descriptive Subtitle>" (for general scenes)
   - NEVER use generic filenames like "Images (2)", "IMG_1234", "photo.jpg", "Image Analysis".

7. STRICT IDENTITY SAFETY & BIOMETRIC PROHIBITION:
   - NEVER assert biometric facial recognition, facial geometry, facial morphology, photographic database matching, or that "facial features uniquely identify" any person.
   - For human subjects, visual observations must describe observable attire, scene, equipment, staging, and visible insignias. The personal identity is domain/research context, never biometric proof.

8. CITATION & EVIDENCE GROUNDING (HARD RULE):
   - When external grounding literature is provided above, YOU MUST CITE THOSE EXACT RETRIEVED SOURCES in the "references" array.
   - Use their verified titles, exact DOIs, authors, publication years, and authentic URLs.
   - Maintain clear separation between direct visual observations ("observed") and secondary inferences ("inferred").

  Write in ${writingStyle} style. Use ${citationStyle} formatting where a source is available.
  Synthesize in ${lang} (${researchLength} depth). Do not invent a source, a confidence percentage, or facts not supported by the image or clearly identified external knowledge. Return ONLY valid JSON matching this schema:`;
}

export function buildJsonSchemaPrompt() {
  return `{
  "visualType": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "classificationReason": "[1-2 sentence visual classification rationale]",
  "evidenceStatus": "observed | inferred | uncertain",
  "specializedPipeline": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "title": "[Exact Specific Subject Name — Descriptive Domain Subtitle]",
  "subject": "[Exact Primary Subject Name]",
  "domainClassification": "[Professional Domain, Vehicle Architecture, Structure Type, Chart Type, or Biological Taxonomy if animal/plant]",
  "category": "[Domain Category e.g. Sports, Cinema, Geography, Architecture, Technology, Financial Analytics]",
  "executiveInsight": {
    "summary": "[Substantial 2-3 paragraph executive summary explaining who/what the subject is, significance, career/domain impact, and key findings]",
    "keyFinding": "[The single most critical takeaway or finding regarding the subject]",
    "keyTakeaways": ["[Key Takeaway 1]", "[Key Takeaway 2]", "[Key Takeaway 3]", "[Key Takeaway 4]"]
  },
  "executiveSummary": "[Substantial multi-paragraph executive overview of the subject]",
  "evidenceLedger": [
    {
      "claim": "[Observable visual statement e.g. Subject is wearing a tailored red and blue textured suit with raised silver webbing]",
      "evidenceType": "visual_observation",
      "evidence": "Direct pixel inspection of costume texture, color boundaries, and spider emblem",
      "sourceTitle": null,
      "sourceUrl": null,
      "supportStatus": "supported",
      "reasoning": "Observable directly within optical frame.",
      "relatedSection": "Visual Evidence & Staging Context"
    },
    {
      "claim": "[External factual statement e.g. Character first appeared in Amazing Fantasy #15 in August 1962, created by Stan Lee and Steve Ditko]",
      "evidenceType": "external_source",
      "evidence": "Marvel Comics publishing archives and Library of Congress records",
      "sourceTitle": "Marvel Comics Publishing Archive",
      "sourceUrl": "https://www.marvel.com/",
      "supportStatus": "supported",
      "reasoning": "Historical publishing records confirm exact debut issue and creators.",
      "relatedSection": "Character Origin & Publication History"
    },
    {
      "claim": "[Analytical inference connecting visual cues to domain context e.g. Suit aesthetic corresponds to the 2002 Sam Raimi cinematic trilogy design]",
      "evidenceType": "inference",
      "evidence": "Raised silver web pattern and angular eye lens geometry matching 2002 film assets",
      "sourceTitle": "Cinema Production Design Records",
      "sourceUrl": null,
      "supportStatus": "supported",
      "reasoning": "Costume design matches the distinct practical fabrication from the 2002-2007 film production.",
      "relatedSection": "Costume Design Evolution"
    }
  ],
  "structuredSections": [
    {
      "heading": "[Section 1: Origin, Early History, or Core Overview]",
      "icon": "movie",
      "content": "[Long-form comprehensive research content (2-3 detailed paragraphs). In-depth historical, contextual, and technical analysis.]"
    },
    {
      "heading": "[Section 2: Highlights, Specifications, or Adaptations with Embedded Markdown Table]",
      "icon": "award_star",
      "content": "[Detailed research content. MUST embed a multi-row Markdown table, e.g.:\\n\\n| Year | Title / Milestone | Role / Medium | Highlights & Reception |\\n| 2002 | Spider-Man | Feature Film | Directed by Sam Raimi; massive commercial breakthrough |\\n| 2004 | Spider-Man 2 | Feature Film | Widely cited as one of the greatest superhero films |\\n| 2007 | Spider-Man 3 | Feature Film | Concluded the original trilogy |\\n| 2012 | The Amazing Spider-Man | Reboot Film | Andrew Garfield portrayal |\\n| 2017 | Spider-Man: Homecoming | MCU Film | Tom Holland MCU integration |\\n\\nFollowed by explanatory analytical paragraphs.]"
    },
    {
      "heading": "[Section 3: Technique, Design Evolution, or Structural Style]",
      "icon": "psychology",
      "content": "[Substantive paragraphs exploring technique, innovations, stylistic evolution, and domain influence.]"
    },
    {
      "heading": "[Section 4: Visual Evidence & Staging Context]",
      "icon": "visibility",
      "content": "[Detailed analytical breakdown connecting the uploaded visual evidence directly with verified domain facts.]"
    }
  ],
  "detailedAnalysis": "[Comprehensive in-depth research analysis including Markdown statistics or specifications tables]",
  "identification": "[Domain classification, legal/official naming, and subject background]",
  "scientificTechnicalInfo": "[Technical, statistical, or domain classification breakdown]",
  "historicalBackground": "[Historical development, career timeline, or origins]",
  "keyFacts": [
    { "label": "Full Name / Alter Ego", "detail": "[Detail]" },
    { "label": "Creator / Originator", "detail": "[Detail]" },
    { "label": "First Appearance / Debut", "detail": "[Detail]" },
    { "label": "Publisher / Organization", "detail": "[Detail]" },
    { "label": "Signature Breakthrough", "detail": "[Detail]" },
    { "label": "Key Abilities / Specifications", "detail": "[Detail]" }
  ],
  "timeline": [
    { "year": "1962", "title": "Comic Debut", "desc": "First appeared in Amazing Fantasy #15 created by Stan Lee and Steve Ditko." },
    { "year": "2002", "title": "Cinematic Milestone", "desc": "Sam Raimi-directed feature film brought character to modern blockbuster cinema." },
    { "year": "2004", "title": "Critical Peak", "desc": "Spider-Man 2 released to universal critical acclaim, redefining comic book cinema." },
    { "year": "2018", "title": "Animated Innovation", "desc": "Into the Spider-Verse premiered, winning the Academy Award for Best Animated Feature." },
    { "year": "2021", "title": "Multiverse Crossover", "desc": "No Way Home united three live-action cinematic generations." }
  ],
  "visualEvidence": [
    { "statement": "[Direct visual evidence statement observable in frame]", "status": "observed | inferred | undeterminable" }
  ],
  "observations": [
    { "category": "Subjects | Equipment | Attire | Environment | Context", "statement": "[Objective observation]", "status": "observed" }
  ],
  "limitations": "[Analytical boundaries of 2D image inspection and domain verification]",
  "conclusion": "[Substantial multi-paragraph conclusion summarizing the researched subject's career, accomplishments, or domain legacy]",
  "references": [
    { "title": "[Real Reference Title]", "source": "[Official Governing Body / Database / Archive]", "year": "[Year]", "url": "[Authentic URL if known]" }
  ],
  "diagramStructure": {
    "diagramType": "flowchart | dfd | uml | er_diagram | architecture | generic diagram",
    "classificationReason": "[1-2 sentence diagram classification rationale]",
    "nodes": [
      {
        "id": "node_1",
        "label": "[Exact legible text inside node]",
        "type": "process | decision | data_store | external_entity | database | component | class | entity | system | person | unknown",
        "subtype": "[Optional shape/role e.g. terminal, decision_diamond, entity_table, datastore_cylinder, api_gateway, microservice]",
        "certainty": "observed | inferred | undetermined"
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "node_1",
        "target": "node_2",
        "label": "[Connector label / condition / data flow payload or null]",
        "type": "directed | undirected | association | dependency | data_flow | inheritance | aggregation | composition",
        "direction": "forward | bidirectional | none",
        "relationshipCertainty": "observed | inferred | undetermined"
      }
    ],
    "groups": [
      { "id": "group_1", "label": "[Subsystem or boundary name]", "nodeIds": ["node_1", "node_2"] }
    ],
    "visibleLabels": ["[Visible text labels extracted from diagram]"]
  },
  "chartStructure": {
    "chartType": "bar | line | pie | donut | scatter | area | histogram | radar | generic chart",
    "title": "[Exact legible chart title or null]",
    "xAxis": {
      "label": "[X-Axis label or category dimension]",
      "unit": "[Unit if indicated e.g. Year, Month, USD, % or null]",
      "scale": "categorical | linear | time | logarithmic"
    },
    "yAxis": {
      "label": "[Y-Axis label or quantitative metric]",
      "unit": "[Unit if indicated e.g. Millions, %, Count or null]",
      "scale": "linear | percentage | logarithmic"
    },
    "series": [
      { "name": "[Series name / Legend entry]", "color": "[Color if identifiable or null]" }
    ],
    "dataPoints": [
      {
        "label": "[Category name or X value]",
        "value": 123.45,
        "formattedValue": "[e.g. $123.45M or 45%]",
        "series": "[Series name or null]",
        "certainty": "observed | estimated"
      }
    ],
    "trends": [
      { "direction": "increasing | decreasing | stable | volatile | cyclical", "description": "[Specific observed trend]" }
    ],
    "anomalies": ["[Outliers, peaks, troughs, or unexpected data points]"],
    "observations": ["[Key analytical conclusions directly visible in chart]"]
  },
  "claims": [
    {
      "id": "claim_1",
      "statement": "[Observable visual statement e.g. Subject is wearing a tailored red and blue textured suit with raised silver webbing]",
      "status": "OBSERVED",
      "evidence": "Direct pixel inspection of costume texture, color boundaries, and spider emblem",
      "source": "Visual Optical Frame",
      "reasoning": "Observable directly within optical frame."
    },
    {
      "id": "claim_2",
      "statement": "[External factual statement e.g. Character first appeared in Amazing Fantasy #15 in August 1962, created by Stan Lee and Steve Ditko]",
      "status": "INFERRED",
      "evidence": "Marvel Comics publishing archives and Library of Congress records",
      "source": "Marvel Comics Publishing Archive",
      "reasoning": "Historical publishing records confirm exact debut issue and creators."
    },
    {
      "id": "claim_3",
      "statement": "[Analytical inference connecting visual cues to domain context e.g. Suit aesthetic corresponds to the 2002 Sam Raimi cinematic trilogy design]",
      "status": "INFERRED",
      "evidence": "Raised silver web pattern and angular eye lens geometry matching 2002 film assets",
      "source": "Cinema Production Design Records",
      "reasoning": "Costume design matches the distinct practical fabrication from the 2002-2007 film production."
    }
  ],
  "structuredFindings": [
    {
      "id": "finding_1",
      "statement": "[Discrete empirical finding or claim]",
      "category": "Visual Observation | Quantitative Data | Architectural Flow | Subject Verification",
      "status": "OBSERVED | INFERRED | UNDETERMINABLE",
      "evidence": "[Direct observable element or data source]",
      "reasoning": "[1-2 sentences explaining observation or deduction]"
    }
  ]
}`;
}
