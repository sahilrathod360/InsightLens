export function buildAiPrompt(lang = 'en', researchLength = 'long') {
  return `Analyze the primary subject in this image and generate an academic research paper in ${lang} (${researchLength} depth).
Identify the specific subject (e.g. Virat Kohli, Alps Mountain Range, Montreal Skyline, Milky Way Galaxy, Mars Rover) and domain taxonomy.
IMPORTANT CITATION INSTRUCTION:
Never invent, fabricate, or hallucinate citations, DOIs, fake academic papers, or non-existent URLs.
Only cite genuine, verifiable sources relevant to the identified subject (such as official governing bodies, institutional archives, official records, reputable encyclopedias, or real published papers). If a real source URL is known, include it; otherwise, provide the legitimate publisher or institution title. Do NOT output placeholder DOIs.
Return ONLY valid JSON matching this schema:`;
}

export function buildJsonSchemaPrompt() {
  return `{
  "title": "[Exact Subject Name]",
  "subject": "[Exact Subject Name]",
  "scientificName": "[Taxonomy or Domain Classification]",
  "category": "[Domain Category e.g. Sports, Geography, Astronomy, Architecture, Biology]",
  "confidenceScore": "99.2%",
  "executiveSummary": "100-150 word research summary.",
  "identification": "Taxonomy classification and visual identification rationale.",
  "detailedAnalysis": "Visual geometry, chromatic properties, and feature analysis.",
  "scientificTechnicalInfo": "Scientific principles, domain data, and technical specifications.",
  "historicalContext": "Historical emergence and career/evolutionary milestones.",
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
  "limitations": "Specific 2D visual inference limitations.",
  "detectedObjects": ["Subject", "Background", "Focal Region"],
  "extractedOCR": "Extracted text OR 'None detected'"
}`;
}
