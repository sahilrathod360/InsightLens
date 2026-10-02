import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', researchLength = 'long', subjectContext = '', writingStyle = 'classic', citationStyle = 'APA') {
  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

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

  return `You are InsightLens Universal Visual Research Engine.
Your mission is to perform deep, accurate, subject-centered empirical research based on the provided visual artifact.

${strategyGuide}
${userContextBlock}
==================================================
CRITICAL RESEARCH DIRECTIVES:
==================================================
1. PRIMARY SUBJECT FIRST:
   Once the primary subject is identified or classified from the visual, the ENTIRE report must be primarily ABOUT THAT SUBJECT. The photograph is supporting context.
   - For an ATHLETE / ENTERTAINER (e.g., AB de Villiers, Roman Reigns, Tom Cruise):
     * Research their complete career: Biography (birthplace, role, style), domestic/early career, international debut, championship milestones, world records, technique, awards, and enduring legacy.
     * Include comprehensive Markdown tables for format-by-format statistics, championship reigns, or filmography highlights.
   - For a LANDMARK / STADIUM / BUILDING:
     * Research official name, location, architectural history, construction & engineering specifications table (Attribute, Value), seating capacity, major global events hosted, and legacy.
   - For an OBJECT / PRODUCT / VEHICLE:
     * Research manufacturer, model, history, technical specifications table (Specification, Value), design innovations, variants, and use cases.
   - For a CHART / DATA VISUALIZATION:
     * Research chart title, type, X/Y axes, units, plotted data points table (Category, Value), trends, comparisons, highest/lowest points, anomalies, and analytical conclusions.
   - For a DIAGRAM / SYSTEM FLOW:
     * Research diagram type, system purpose, components, nodes, data flows, relationships, and execution logic.
   - For an UNIDENTIFIABLE / GENERIC VISUAL:
     * Ground the report strictly in observable visual features, setting, and domain principles without hallucinating private names or fake facts.

2. SUBJECT & TITLE GROUNDING (HARD RULE):
   - Report title MUST name the actual research subject or domain topic:
     * "<Subject Name> — Career, Records, Statistics and Legacy"
     * "<Subject Name> — History, Architecture, Capacity and Legacy"
     * "<Subject Name> — Statistical and Quantitative Trend Analysis"
     * "Visual Analysis — <Domain Topic & Descriptive Subtitle>" (for unidentifiable or general scenes)
   - NEVER use generic filenames like "Images (2)", "IMG_1234", "photo.jpg", "Image Analysis", "Photograph Analysis".

3. STRICT IDENTITY SAFETY & BIOMETRIC PROHIBITION:
   - NEVER assert biometric facial recognition, facial geometry, facial morphology, photographic database matching, or that "facial features uniquely identify" any person.
   - For human subjects, visual observations must describe observable attire, scene, equipment, staging, and visible insignias. The personal identity is domain/research context, never biometric proof.

4. UNIVERSAL SUBJECT NAMING & DOMAIN CLASSIFICATION:
   - NEVER output a Latin scientific name or biological taxonomy for human beings, vehicles, buildings, electronics, charts, diagrams, or non-biological objects.
   - Output "domainClassification" reflecting authentic domain terms:
     * Person/Athlete/Actor: e.g. "Professional Athlete / WWE Performer", "Actor / Cinema"
     * Vehicle/Engineering: e.g. "High-Performance Fastback Coupe", "Commercial Aviation"
     * Architecture/Civil: e.g. "Sports Stadium / Steel & Concrete Structure"
     * Chart/Diagram: e.g. "Data Visualization / Time-Series", "System Architecture Flowchart"
     * Animal/Plant: Biological taxonomy (e.g. "Aquila chrysaetos") ONLY when genuine biological species.

5. CITATION & EVIDENCE INTEGRITY:
   - Only cite real, authentic institutions, governing bodies, or archival sources (e.g. ICC Official Records, WWE Archives, ESPNcricinfo, NASA Archives, Britannica, W3C Specifications, IEEE).
   - NEVER fabricate fake DOIs or synthetic reference links.
   - Maintain clear separation between direct visual observations ("observed") and secondary inferences ("inferred").

6. EVIDENCE INTELLIGENCE WORKBENCH (CRITICAL REQUIREMENT):
   You MUST construct an "evidenceLedger" array containing 5-10 structured evidence entries that explicitly deconstruct the analysis:
   - "claim": Specific empirical assertion made in the report.
   - "evidenceType": Must be strictly one of:
       * "visual_observation" (directly visible in image pixels/frame, e.g. attire, jersey colors, emblem, stage lighting, vehicle grille, chart axes). NEVER use visual_observation for biographical/historical claims or identity verification!
       * "external_source" (historical dates, career records, statistics, specifications, or institutional data from external knowledge)
       * "inference" (analytical reasoning connecting visual features to domain conclusions)
   - "evidence": The exact observable feature (for visual_observation) or cited external evidence (for external_source).
   - "sourceTitle": Real governing body, database, literature, or specification (or null if purely visual_observation).
   - "sourceUrl": Authentic URL if known and verified (or null).
   - "supportStatus": Must be strictly one of: "supported" | "partially_supported" | "uncertain" | "unsupported".
   - "reasoning": 1-2 sentences explaining why the evidence supports (or fails to support) the claim.
   - "relatedSection": Name of the report section where this claim is discussed.

7. STRUCTURED CLAIMS & FINDINGS (EMPIRICAL GROUNDING):
   - You MUST populate "claims" and "structuredFindings" arrays with empirical statements.
   - For every claim and finding, set "status" strictly to one of:
     * "OBSERVED": Directly visible optical features in the image (e.g. colors, labels, shapes, attire, chart bars).
     * "INFERRED": Logical deductions connecting visual evidence to domain/external knowledge.
     * "UNDETERMINABLE": Claims that cannot be definitively confirmed or refuted from available visual evidence.
   - Include the specific "evidence" and "reasoning" for every claim and finding.

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
      "claim": "[Specific empirical assertion made in the report]",
      "evidenceType": "visual_observation | external_source | inference",
      "evidence": "[Direct observable visual cue or external factual record]",
      "sourceTitle": "[Governing body, institutional database, or null if visual_observation]",
      "sourceUrl": "[Authentic URL if known, or null]",
      "supportStatus": "supported | partially_supported | uncertain | unsupported",
      "reasoning": "[1-2 sentences detailing the evidentiary connection or uncertainty]",
      "relatedSection": "[Related section heading]"
    }
  ],
  "structuredSections": [
    {
      "heading": "[Domain-Adaptive Section Title, e.g. Career Timeline & Major Championships]",
      "icon": "[Material icon name e.g. sports, trophy, movie, history, biotech, query_stats, analytics]",
      "content": "[Long-form comprehensive research content. Include detailed Markdown tables where applicable]"
    },
    {
      "heading": "[Second Domain Section Title, e.g. World Records & Career Milestones]",
      "icon": "[Material icon name e.g. star, award_star, military_tech]",
      "content": "[Detailed research content with Markdown statistics/data tables]"
    },
    {
      "heading": "[Third Domain Section Title, e.g. Signature Style, Mastery & Enduring Legacy]",
      "icon": "[Material icon name e.g. psychology, workspace_premium]",
      "content": "[In-depth analysis of technique, innovations, domain influence, and lasting legacy]"
    },
    {
      "heading": "[Fourth Domain Section Title, e.g. Visual Evidence & Staging Context]",
      "icon": "[Material icon name e.g. visibility, center_focus_strong]",
      "content": "[Clear breakdown connecting the uploaded visual evidence with verified domain facts]"
    }
  ],
  "detailedAnalysis": "[Comprehensive in-depth research analysis including Markdown statistics or specifications tables]",
  "identification": "[Domain classification, legal/official naming, and subject background]",
  "scientificTechnicalInfo": "[Technical, statistical, or domain classification breakdown]",
  "historicalBackground": "[Historical development, career timeline, or origins]",
  "keyFacts": [
    { "label": "[Fact Label e.g. Full Name, Discipline / Role, Debut, Key Achievements]", "detail": "[Fact Detail]" }
  ],
  "timeline": [
    { "year": "[Year/Phase]", "title": "[Milestone Title]", "desc": "[Detailed milestone description]" }
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
      "statement": "[Specific empirical assertion made in the report]",
      "status": "OBSERVED | INFERRED | UNDETERMINABLE",
      "evidence": "[Direct optical observation or cited external data]",
      "source": "[Governing body / database or 'Visual Optical Frame']",
      "reasoning": "[1-2 sentences explaining why the evidence supports or qualifies the claim]"
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
