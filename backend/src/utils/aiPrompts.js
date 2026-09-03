import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', researchLength = 'long') {
  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

  return `You are InsightLens Visual Intelligence Engine.
Analyze the provided visual artifact and synthesize a structured empirical research report in ${lang} (${researchLength} depth).

${strategyGuide}

MANDATORY IDENTITY SAFETY & OBSERVATION DISCIPLINE:
- Prioritize concrete, structured visual observations over generic demographic phrasing.
- For human subjects: NEVER assert or guess the name or identity of any real individual from facial appearance alone. Describe observable clothing, posture, grooming, lighting, and composition objectively without making named-person claims.

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
  "executiveSummary": "100-150 word research summary tailored to the specialized visual type.",
  "identification": "Visual classification and identification rationale applying the specialized pipeline.",
  "detailedAnalysis": "Detailed visual feature analysis following the specialized pipeline guidelines.",
  "scientificTechnicalInfo": "Technical specifications, domain data, and structural principles.",
  "historicalContext": "Context, background, or emergence relevant to the subject.",
  "timeline": [
    { "year": "Phase I", "title": "Milestone 1", "desc": "Description 1" },
    { "year": "Phase II", "title": "Milestone 2", "desc": "Description 2" }
  ],
  "applications": ["Application 1", "Application 2", "Application 3"],
  "keyFacts": [
    { "label": "Metric 1", "detail": "Value 1" },
    { "label": "Metric 2", "detail": "Value 2" }
  ],
  "interestingFacts": ["Fact 1", "Fact 2"],
  "references": [
    {
      "title": "[Real Title of Reference or Document]",
      "source": "[Real Organization, Governing Body, or Publisher]",
      "year": "[Real Year or 'Official Record']",
      "url": "[Real URL or DOI, or empty string if unverified]"
    }
  ],
  "conclusion": "75-100 word conclusion.",
  "limitations": "Specific visual inference limitations based on the visual type.",
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
