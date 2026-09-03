import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', intent = {}) {
  // Support both object intent or legacy string/number arguments
  const researchIntent = typeof intent === 'object' && intent !== null
    ? intent
    : { subjectContext: typeof intent === 'string' ? intent : '', depth: 'standard', focus: 'auto', question: '' };

  const subjectContext = (researchIntent.subjectContext || '').trim();
  const focus = (researchIntent.focus || 'auto').toLowerCase();
  const question = (researchIntent.question || '').trim();
  const depth = (researchIntent.depth || 'standard').toLowerCase();

  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

  // Focus-specific priority instructions
  let focusInstruction = '';
  switch (focus) {
    case 'person':
      focusInstruction = `RESEARCH FOCUS: PERSON / SUBJECT
- Prioritize: The focal individual's domain discipline, professional role, achievements, career context, visible athletic/professional action, stance, and verifiable event setting.
- De-prioritize: Generic clothing descriptions, camera optics, or generic background noise unless directly requested.`;
      break;
    case 'clothing':
      focusInstruction = `RESEARCH FOCUS: CLOTHING / APPEARANCE
- Prioritize: Visible garments, sportswear, team kit/uniform details, fabrics, weave, stitching, emblems, logos, sponsor branding, color palettes, tailoring, and era/style significance.
- De-prioritize: Unrelated personal biography or non-visual assumptions.`;
      break;
    case 'object':
      focusInstruction = `RESEARCH FOCUS: OBJECT / PRODUCT
- Prioritize: Physical items, equipment, gear (e.g. bat, helmet, balls, machinery, products), specifications, materials, engineering construction, condition, and functional utility.`;
      break;
    case 'place':
      focusInstruction = `RESEARCH FOCUS: PLACE / BACKGROUND
- Prioritize: Location, stadium/pitch context, geographic and environmental attributes, architectural landmarks, crowd/setting atmosphere, and verifiable venue details without guessing unseen locations.`;
      break;
    case 'chart':
      focusInstruction = `RESEARCH FOCUS: CHART / DATA
- Prioritize: Quantitative data series, axes, coordinates, chart archetype, visible metrics, statistical trends, comparative anomalies, and data legibility boundaries.`;
      break;
    case 'document':
      focusInstruction = `RESEARCH FOCUS: DOCUMENT / TEXT
- Prioritize: OCR transcriptions, textual layout, typographic structure, headings, document classification, signatures/clauses, and tabular formatting.`;
      break;
    case 'diagram':
      focusInstruction = `RESEARCH FOCUS: DIAGRAM / STRUCTURE
- Prioritize: Structural graph extraction, diagram type, node definitions (id, label, type), directed edge connections (source, target, label, direction), and system architectures.`;
      break;
    case 'all':
      focusInstruction = `RESEARCH FOCUS: ALL DIMENSIONS
- Systematically synthesize subject, clothing/objects, environment, and structured findings in balanced empirical detail strictly aligned to the user's research question.`;
      break;
    case 'auto':
    default:
      focusInstruction = `RESEARCH FOCUS: AUTO-ADAPTIVE
- Automatically deduce the primary research focus based on visual type, visible focal subject, user question, and domain significance.`;
      break;
  }

  // Research Question Block
  let questionBlock = '';
  if (question) {
    questionBlock = `
USER'S TARGETED RESEARCH QUESTION:
"${question}"
PRIMARY RELEVANCE MANDATE:
- The user's research question is your HIGHEST priority.
- Explicitly and directly answer this question in the "executiveInsight.summary", "executiveInsight.keyFinding", and throughout "findings".
- Tailor all observations, domain context, and evidence directly to answer what the user asked.`;
  }

  // Depth-specific instructions
  let depthInstruction = '';
  if (depth === 'quick') {
    depthInstruction = `RESEARCH DEPTH: QUICK BRIEF
- Synthesize a concise, high-impact brief.
- Provide 2-3 focused keyTakeaways and 2-3 essential observations.
- Avoid unnecessary academic elaboration or redundant context.`;
  } else if (depth === 'deep') {
    depthInstruction = `RESEARCH DEPTH: DEEP INVESTIGATION
- Conduct an exhaustive, rigorous empirical investigation.
- Provide 4-6 detailed keyTakeaways, 6-8 thorough visual observations, in-depth contextual interpretations, and legitimate verifiable sources.
- Detail optical boundaries and evidence limitations comprehensively.`;
  } else {
    depthInstruction = `RESEARCH DEPTH: STANDARD
- Provide a balanced, high-signal empirical research report with 3-4 keyTakeaways, 4-6 structured observations, and verified findings.`;
  }

  // User Subject Context Block
  const userContextBlock = subjectContext ? `
USER-PROVIDED SUBJECT CONTEXT:
The user has specified that the subject of this visual is: "${subjectContext}".
CRITICAL RULES FOR USER-PROVIDED SUBJECT CONTEXT:
1. Treat "${subjectContext}" as user-provided research context/premise, NOT as an identification made through automated facial recognition.
2. The JSON "subject" property MUST be exactly "${subjectContext}".
3. The JSON "title" property MUST be formatted as: "${subjectContext} — [Concise Descriptive Role / Sport / Context / Title]" (e.g. "${subjectContext} — Professional Indian Cricketer").
4. Seamlessly integrate "${subjectContext}" naturally throughout all relevant sections.
5. NEVER use generic image filenames (such as "images (2)", "image.jpeg", "photo.jpg") as the subject. The subject is "${subjectContext}".` : `
NO USER SUBJECT CONTEXT PROVIDED:
- Do NOT guess, assert, or claim the identity of real individuals from facial appearance alone.
- NEVER use generic filenames (e.g., "images (2)", "photo.jpg", "IMG_1234") as the subject or title.
- Describe observable visual features, attire, objects, and setting objectively (e.g., "Professional Cricket Player in Indian National Kit").`;

  return `You are InsightLens Visual Intelligence Engine.
Analyze the provided visual artifact and synthesize a structured empirical research report in ${lang}.

${strategyGuide}

==================================================
RESEARCH INTENT & RELEVANCE
==================================================
${userContextBlock}
${questionBlock}
${focusInstruction}
${depthInstruction}

MANDATORY IDENTITY SAFETY & OBSERVATION DISCIPLINE:
- Prioritize concrete, structured visual observations over generic demographic phrasing.
- For human subjects: When no user-provided subject context is given, NEVER assert or guess the name or identity of any real individual from facial appearance alone. When the user explicitly supplies subject context, treat it as user-provided metadata (not facial recognition) and use it throughout the report while describing observable visual evidence objectively.
- NEVER use image filenames or camera file numbering as the subject name.

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
  "title": "[Exact Subject Name or Subject — Descriptive Subtitle]",
  "subject": "[Exact Subject Name]",
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
  "limitations": [
    "[1-2 sentence optical boundary statement]"
  ],
  "sources": [
    { "title": "[Reference Title]", "source": "[Institutional Publisher / Governing Body]", "year": "2024", "url": "[URL if verified or empty]" }
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
