import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', researchLength = 'long', subjectContext = '') {
  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

  const userContextBlock = subjectContext && subjectContext.trim() ? `
USER-PROVIDED SUBJECT CONTEXT:
The user has provided the following domain/subject context for this visual: "${subjectContext.trim()}".
- This identity/context is provided directly by the user as domain metadata, NOT determined by automated facial recognition.
- Integrate the name "${subjectContext.trim()}" naturally throughout the generated report.
- Format the report title as: "${subjectContext.trim()} — [Descriptive Role / Context / Visual Summary]" (e.g. "${subjectContext.trim()} — Professional Cricket Player").
- Set the "subject" property in the JSON to "${subjectContext.trim()}".
- Seamlessly reference "${subjectContext.trim()}" across Executive Summary, Key Findings, Subject Identification, relevant observations, and Conclusion where appropriate.
- Preserve objective visual observations (attire, equipment, postures, colors, textures, lighting) anchored to this context.
` : '';

  return `You are InsightLens Visual Intelligence Engine.
Analyze the provided visual artifact and synthesize a structured empirical research report in ${lang} (${researchLength} depth).

${strategyGuide}
${userContextBlock}
MANDATORY IDENTITY SAFETY & OBSERVATION DISCIPLINE:
- Prioritize concrete, structured visual observations over generic demographic phrasing.
- For human subjects: When no user-provided subject context is given, NEVER assert or guess the name or identity of any real individual from facial appearance alone. When the user explicitly supplies subject context, treat it as user-provided metadata (not facial recognition) and use it throughout the report while describing observable visual evidence objectively.

IMPORTANT CITATION INSTRUCTION:
Never invent, fabricate, or hallucinate citations, DOIs, fake academic papers, or non-existent URLs.
Only cite genuine, verifiable sources relevant to the identified subject (such as official governing bodies, institutional archives, official records, reputable encyclopedias, or real published papers). If a real source URL is known, include it; otherwise, provide the legitimate publisher or institution title. Do NOT output placeholder DOIs.

Return ONLY valid JSON matching this schema:`;
}

export function buildJsonSchemaPrompt() {
  return `{
  "visualType": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "classificationReason": "[1-2 sentence evidence-based visual classification rationale]",
  "classificationConfidence": "98.5%",
  "specializedPipeline": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "title": "[Exact Subject Name]",
  "subject": "[Exact Subject Name]",
  "scientificName": "[Taxonomy or Domain Classification]",
  "category": "[Domain Category e.g. Sports, Geography, Astronomy, Architecture, Biology, Computer Science, Financial Analytics]",
  "confidenceScore": "98.5%",
  "executiveInsight": {
    "summary": "[Concise 2-3 sentence summary answering what this visual communicates]",
    "keyFinding": "[The single most critical takeaway or finding]",
    "keyTakeaways": ["[Takeaway 1]", "[Takeaway 2]", "[Takeaway 3]"]
  },
  "visualEvidence": [
    { "statement": "[Direct visual evidence statement]", "status": "observed | inferred | undeterminable" }
  ],
  "observations": [
    { "category": "Subjects | Objects | Text | Environment | Composition | Lighting", "statement": "[Objective visual observation]", "status": "observed" }
  ],
  "interpretations": [
    { "statement": "[Reasoned interpretation of visual meaning]", "basis": "[Observed visual feature basis]" }
  ],
  "findings": [
    { "statement": "[Concrete analytical conclusion]", "basis": "[Visual evidence basis]" }
  ],
  "executiveSummary": "[1-2 sentence concise executive overview]",
  "detailedAnalysis": "[1-2 sentence core feature summary]",
  "scientificTechnicalInfo": "[1-2 sentence technical or domain classification note]",
  "limitations": "[1-2 sentence optical boundary statement]",
  "detectedObjects": ["Subject", "Background", "Focal Region"],
  "extractedOCR": "Extracted text OR 'None detected'",
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
