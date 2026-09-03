import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', researchLength = 'long', subjectContext = '') {
  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

  const userContextBlock = subjectContext && subjectContext.trim() ? `
USER-PROVIDED SUBJECT CONTEXT:
The user has specified that the subject of this visual is: "${subjectContext.trim()}".
- Treat "${subjectContext.trim()}" as the primary research subject.
- Set the JSON "subject" to "${subjectContext.trim()}".
- Set the JSON "title" to: "${subjectContext.trim()} — [Concise Descriptive Role / Topic / Major Achievements]".
- Conduct deep, authoritative research on "${subjectContext.trim()}" across all relevant domain dimensions.
` : '';

  return `You are InsightLens Universal Visual Research Engine.
Your mission is to perform deep, accurate, subject-centered empirical research based on the provided visual artifact.

${strategyGuide}
${userContextBlock}
==================================================
CORE RESEARCH DIRECTIVES:
==================================================
1. PRIMARY RESEARCH SUBJECT DETERMINATION:
   - Identify what is actually present in the image and what constitutes the PRIMARY RESEARCH SUBJECT.
   - PUBLIC FIGURES & PROMINENT ENTITIES: If the visual depicts a recognizable public figure, athlete, actor, politician, artist, scientist, historical figure, iconic stadium, landmark, branded product, chart, or diagram, identify the subject specifically and conduct deep research on that subject.
   - UNIDENTIFIABLE / PRIVATE INDIVIDUALS: If a human subject cannot be reliably identified as a known public entity from visual evidence and contextual markers, use an accurate descriptive domain title (e.g., "Professional Cricket Batsman during Match Play") without hallucinating a private name.
   - NEVER use generic filenames (e.g., "images (2)", "photo.jpg", "IMG_1234") as the subject or title.

2. NO GENERIC TITLES (HARD RULE):
   - The report "title" MUST name the actual research subject with a domain-specific subtitle:
     * Cricketer/Athlete: "<Full Name> — Complete Cricket Career and Achievements" or "<Full Name> — Career, Statistics and Records"
     * Actor/Entertainer: "<Full Name> — Career, Filmography and Major Achievements"
     * Stadium/Place: "<Place Name> — History, Architecture and Legacy"
     * Product/Object: "<Brand Model> — Product History, Design and Specifications"
     * Chart: "<Dataset Topic> — Trend and Statistical Analysis"
     * Diagram: "<System Name> — Architecture and Data Flow Analysis"
   - NEVER output generic titles such as "Image Analysis", "Person in a Dark Suit", "Professional Cricket Player", "Photograph Analysis", or "Visual Analysis Report".

3. DEEP, DOMAIN-CENTRIC RESEARCH CONTENT:
   - For ATHLETES / CRICKETERS: Provide complete career overview, debut, format-by-format statistics (Test, ODI, T20, etc.) in clean Markdown tables (Matches, Innings, Runs/Wickets, Averages, Strike Rates, 100s, 50s, 4s, 6s), career milestones, major records, tournament victories, captaincy, and lasting significance.
   - For ACTORS / DIRECTORS: Provide career overview, breakthrough film, iconic roles, a filmography highlights Markdown table (Film, Year, Role, Box Office / Significance), awards, nominations, major franchises, and cultural impact.
   - For PLACES / STADIUMS: Provide official name, history, architecture, construction/redevelopment, capacity, engineering specs, major historic events, and current legacy.
   - For PRODUCTS / OBJECTS: Provide brand, model, engineering specifications, materials, design evolution, and notable use.
   - For CHARTS / GRAPHS: Explain chart title, type, X/Y axes, units, plotted series, numerical trends, comparisons, peaks/troughs, anomalies, and analytical conclusions.
   - For DIAGRAMS: Extract diagram type, purpose, components, nodes, data flows, relationships, and system logic.

4. SEPARATION OF EVIDENCE VS. RESEARCH:
   - "visualEvidence": Direct visual observations visible in the image (attire, gear, posture, colors, composition, lighting).
   - "detailedAnalysis": Deep domain research, career statistics tables, achievements, or technical analysis.
   - "findings": Concrete verified takeaways.
   - "limitations": Optical boundaries of 2D visual inspection.

5. STRICT ACCURACY & CITATIONS:
   - Do NOT invent false statistics, dates, or non-existent papers.
   - Provide real, authentic reference sources (e.g., official governing bodies, ICC, ESPNcricinfo, Box Office Mojo, IMDb, NASA, institutional archives).

Synthesize in ${lang} (${researchLength} depth). Return ONLY valid JSON matching this schema:`;
}

export function buildJsonSchemaPrompt() {
  return `{
  "visualType": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "classificationReason": "[1-2 sentence evidence-based visual classification rationale]",
  "classificationConfidence": "98.5%",
  "specializedPipeline": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "title": "[Exact Specific Subject Name — Descriptive Domain Subtitle]",
  "subject": "[Exact Primary Subject Name]",
  "scientificName": "[Taxonomy, Full Official Name, or Domain Classification]",
  "category": "[Domain Category e.g. Sports, Cinema, Geography, Architecture, Technology, Financial Analytics]",
  "confidenceScore": "98.5%",
  "executiveInsight": {
    "summary": "[Concise 2-3 sentence executive summary answering what this visual communicates and subject significance]",
    "keyFinding": "[The single most critical takeaway or finding]",
    "keyTakeaways": ["[Key Takeaway 1]", "[Key Takeaway 2]", "[Key Takeaway 3]"]
  },
  "visualEvidence": [
    { "statement": "[Direct visual evidence statement observable in frame]", "status": "observed | inferred | undeterminable" }
  ],
  "observations": [
    { "category": "Subjects | Objects | Text | Environment | Composition | Lighting", "statement": "[Objective visual observation]", "status": "observed" }
  ],
  "interpretations": [
    { "statement": "[Reasoned interpretation of visual meaning]", "basis": "[Observed visual feature basis]" }
  ],
  "findings": [
    { "statement": "[Concrete analytical or domain conclusion]", "basis": "[Evidence or verified research basis]" }
  ],
  "executiveSummary": "[1-2 sentence concise executive overview]",
  "detailedAnalysis": "[Comprehensive in-depth research analysis. Include Markdown tables for statistics, filmographies, or specifications where applicable]",
  "scientificTechnicalInfo": "[Technical, statistical, or domain classification breakdown]",
  "historicalBackground": "[Historical development, career timeline, or origins]",
  "timeline": [
    { "year": "[Year/Phase]", "title": "[Milestone Title]", "desc": "[Brief milestone description]" }
  ],
  "keyFacts": [
    { "label": "[Fact Label]", "detail": "[Fact Value]" }
  ],
  "limitations": "[1-2 sentence optical boundary statement]",
  "detectedObjects": ["Subject", "Background", "Focal Region"],
  "extractedOCR": "Extracted text OR 'None detected'",
  "references": [
    { "title": "[Real Reference Title]", "source": "[Official Governing Body / Archive / Database]", "year": "[Year]", "url": "[Authentic URL if known]" }
  ],
  "diagramStructure": {
    "diagramType": "flowchart | dfd | uml | er_diagram | architecture | generic diagram",
    "classificationReason": "[Visual rationale for diagram archetype]",
    "nodes": [
      { "id": "node_1", "label": "[Node Label]", "type": "process | external_entity | database | component | class | entity | decision | system | unknown" }
    ],
    "edges": [
      { "id": "edge_1", "source": "node_1", "target": "node_2", "label": "[Connector Label or null]", "type": "directed | association | dependency | data_flow | inheritance | unknown", "direction": "forward" }
    ],
    "groups": [],
    "visibleLabels": ["[Visible Labels]"]
  }
}`;
}

