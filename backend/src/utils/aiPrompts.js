export function buildAiPrompt(lang = 'en', researchLength = 'long') {
  return `Analyze the primary subject in this image and generate an academic research paper in ${lang} (${researchLength} depth).
Identify specific subject (e.g. Domestic Dog, Eiffel Tower, Mona Lisa) and taxonomy/scientific name. Do NOT output placeholders like "Unknown".
Return ONLY valid JSON matching this schema:`;
}

export function buildJsonSchemaPrompt() {
  return `{
  "title": "[Exact Subject Name]",
  "subject": "[Exact Subject Name]",
  "scientificName": "[Taxonomy/Scientific Name]",
  "category": "[Domain Category]",
  "confidenceScore": "99.2%",
  "executiveSummary": "100-150 word research summary.",
  "identification": "Taxonomy classification and visual identification rationale.",
  "detailedAnalysis": "Visual geometry, chromatic properties, and feature analysis.",
  "scientificTechnicalInfo": "Scientific principles and technical specifications.",
  "historicalContext": "Historical emergence and evolutionary milestones.",
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
    "Author, A. (2024). Domain Paper. Journal, 10(2), 100-110. https://doi.org/10.1038/s41586-024-00001-x"
  ],
  "conclusion": "75-100 word conclusion.",
  "limitations": "Specific 2D visual inference limitations.",
  "detectedObjects": ["Subject", "Background", "Focal Region"],
  "extractedOCR": "Extracted text OR 'None detected'"
}`;
}
