// AI Research Prompt & Schema Synthesis Engine

export function buildAiPrompt(lang = 'en', researchLength = 'long') {
  return `Perform a structured, high-precision academic research report on the primary subject identified in this uploaded visual artifact:
- Target Language: ${lang}
- Research Depth: ${researchLength === 'long' ? 'Comprehensive & Deep' : 'Concise Brief'}

CORE DIRECTIVE:
Identify the specific primary subject in the image (e.g. Eiffel Tower, Bengal Tiger, Gothic Vaulting Blueprint, Financial Bar Chart, Decarbonization Infographic).
Generate a structured, academic-grade research paper grounded in domain knowledge.

REQUIRED STRUCTURED SECTIONS & KEYS:
1. Executive Summary: 150-250 words concise executive overview of the subject.
2. Identification: Primary subject name, domain category, confidence level, and core visual markers.
3. Detailed Analysis: Multi-faceted breakdown of visual geometry, color/lighting, composition, and physical features.
4. Historical Context: Origins, evolutionary milestones, or historical timeline of the subject.
5. Scientific / Technical Information: Structural mechanisms, material properties, data trends, or domain specs.
6. Applications: 3-5 practical, real-world, or industrial applications.
7. Significance: Cultural, academic, scientific, or economic significance.
8. Key Facts: 4-6 bulleted factual highlights or technical statistics.
9. References: Verified academic citations in APA 7th edition format.
10. Conclusion: 100-150 words concluding synthesis summarizing research findings.`;
}

export function buildJsonSchemaPrompt() {
  return `Return JSON output matching this EXACT schema:
{
  "title": "Research Analysis of [Exact Subject Name]",
  "subject": "Exact Subject Name (e.g. Eiffel Tower, Bengal Tiger, Mona Lisa)",
  "category": "Domain Category (e.g. Architectural Engineering & Cultural Heritage)",
  "aiProvider": "Google Gemini Vision API",
  "modelUsed": "gemini-2.5-flash",
  "confidenceScore": "98.4%",
  "executiveSummary": "150–250 word concise executive research summary about the specific subject.",
  "identification": "Detailed subject identification, taxonomy/classification, and detection rationale.",
  "detailedAnalysis": "Comprehensive visual, spatial, compositional, and physical feature analysis.",
  "historicalContext": "Historical origins, timeline milestones, or scientific context.",
  "scientificTechnicalInfo": "Scientific principles, technical specifications, material properties, or quantitative trends.",
  "applications": [
    "Practical application 1",
    "Practical application 2",
    "Practical application 3"
  ],
  "significance": "Academic, industrial, cultural, or domain significance of the subject.",
  "keyFacts": [
    { "label": "Key Fact 1", "detail": "Subject detail 1" },
    { "label": "Key Fact 2", "detail": "Subject detail 2" },
    { "label": "Key Fact 3", "detail": "Subject detail 3" },
    { "label": "Key Fact 4", "detail": "Subject detail 4" }
  ],
  "references": [
    "Author, A. A. (Year). Subject domain publication title. Publisher.",
    "Author, B. B. (Year). Secondary reference publication. Academic Press."
  ],
  "conclusion": "100–150 word concise concluding synthesis.",
  "visualAnalysisBullets": [
    "Detected Elements: Specific visible elements",
    "Colors & Lighting: Dominant palette and illumination",
    "Composition & Framing: Spatial alignment and framing",
    "Visible Features: Structural or physical details",
    "Text Inscriptions: Extracted text or 'No readable text detected.'"
  ],
  "backgroundInformation": "Detailed multi-paragraph explanation about the subject.",
  "historicalScientificContext": "Factual historical, scientific, or evolutionary context.",
  "keyCharacteristics": [
    { "label": "Key Feature 1", "detail": "Detail 1" },
    { "label": "Key Feature 2", "detail": "Detail 2" }
  ],
  "applicationsImportance": [
    "Application 1",
    "Application 2"
  ],
  "interestingFacts": [
    "Fact 1",
    "Fact 2"
  ],
  "limitations": "Specific limitations of visual inference from this 2D representation alone.",
  "detectedObjects": ["Feature 1", "Feature 2", "Feature 3"],
  "extractedOCR": "Extracted text string OR 'No readable text detected.'",
  "generatedKeywords": ["Tag1", "Tag2", "Tag3"]
}`;
}
