import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';

export function buildAiPrompt(lang = 'en', researchLength = 'long', subjectContext = '') {
  const strategyGuide = AnalysisStrategyFactory.buildPromptInstructions();

  const userContextBlock = subjectContext && subjectContext.trim() ? `
USER-PROVIDED SUBJECT CONTEXT:
The user has specified that the subject of this visual is: "${subjectContext.trim()}".
- Treat "${subjectContext.trim()}" as the primary research subject.
- Set the JSON "subject" to "${subjectContext.trim()}".
- Set the JSON "title" to: "${subjectContext.trim()} — [Comprehensive Role / Career / Topic Subtitle]".
- Conduct deep, authoritative, long-form research on "${subjectContext.trim()}" across all relevant domain dimensions.
` : '';

  return `You are InsightLens Universal Visual Research Engine.
Your mission is to perform deep, accurate, subject-centered empirical research based on the provided visual artifact.

${strategyGuide}
${userContextBlock}
==================================================
CRITICAL RESEARCH DIRECTIVES:
==================================================
1. PRIMARY SUBJECT FIRST:
   Once the primary subject is identified or classified from the visual, the ENTIRE report must be primarily ABOUT THAT SUBJECT. The photograph is supporting context.
   - For an ATHLETE / CRICKETER (e.g., AB de Villiers, Virat Kohli, Sachin Tendulkar):
     * Research their complete career: Biography (birthplace, role, style), domestic career, international debut, Test career, ODI career, T20I career, franchise/IPL career, batting/bowling records, world records, milestones, playing style (360-degree batting, technique), wicketkeeping/fielding, captaincy, retirement, and enduring legacy.
     * Include comprehensive Markdown tables for format-by-format international statistics (Format, Matches, Innings, Runs, Average, Strike Rate, 100s, 50s, 4s, 6s) and franchise/IPL statistics.
   - For an ACTOR / ENTERTAINER (e.g., Tom Cruise):
     * Research their complete career: Biography, breakthrough role, filmography highlights table (Film, Year, Role, Significance, Box Office), major franchises, stunt work, awards & nominations, and cultural legacy.
   - For a LANDMARK / STADIUM / BUILDING (e.g., Narendra Modi Stadium, Eiffel Tower):
     * Research official name, location, architectural history, construction & engineering specifications table (Attribute, Value), seating capacity, major global events hosted, and legacy.
   - For an OBJECT / PRODUCT / VEHICLE:
     * Research manufacturer, model, history, technical specifications table (Specification, Value), design innovations, variants, and use cases.
   - For a CHART / DATA VISUALIZATION:
     * Research chart title, type, X/Y axes, units, plotted data points table (Category, Value), trends, comparisons, highest/lowest points, anomalies, and analytical conclusions.
   - For a DIAGRAM / SYSTEM FLOW:
     * Research diagram type, system purpose, components, nodes, data flows, relationships, and execution logic.
   - For an UNIDENTIFIABLE / GENERIC VISUAL:
     * Ground the report strictly in observable visual features, setting, and domain principles without hallucinating private names or fake facts.

2. NO GENERIC TITLES (HARD RULE):
   - Report title MUST name the actual research subject:
     * "<Subject Name> — Career, Records, Statistics and Legacy"
     * "<Subject Name> — History, Architecture, Capacity and Legacy"
     * "<Subject Name> — Statistical and Quantitative Trend Analysis"
   - NEVER use generic titles like "Images (2)", "Image Analysis", "Photograph Analysis", "Person in Green Jersey", "Professional Cricketer".

3. ZERO GENERIC AI FILLER:
   - NEVER use generic filler phrases like "Grounded in empirical visual intelligence algorithms", "well-structured artifact with crisp edge contours", "clear spatial organization with well-defined illumination vectors", "high structural definition", or "taxonomical classification and evolutionary lineage".
   - The Conclusion MUST summarize the researched SUBJECT's career, accomplishments, or domain significance, NOT image pixels.

4. HIGH INFORMATION DENSITY & LONG-FORM SECTIONS:
   - Generate substantial, detailed paragraphs with rich factual data.
   - Provide structured domain-adaptive sections in "structuredSections".
   - Executive Summary must be a substantial multi-paragraph overview explaining WHO/WHAT this is, WHY it matters, and KEY TAKEAWAYS.

Synthesize in ${lang} (${researchLength} depth). Return ONLY valid JSON matching this schema:`;
}

export function buildJsonSchemaPrompt() {
  return `{
  "visualType": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "classificationReason": "[1-2 sentence visual classification rationale]",
  "classificationConfidence": "99.2%",
  "specializedPipeline": "photograph | document | diagram | chart | screenshot | artwork | map | unknown",
  "title": "[Exact Specific Subject Name — Descriptive Domain Subtitle]",
  "subject": "[Exact Primary Subject Name]",
  "scientificName": "[Taxonomy, Full Official Name, or Domain Classification]",
  "category": "[Domain Category e.g. Sports, Cinema, Geography, Architecture, Technology, Financial Analytics]",
  "confidenceScore": "99.4%",
  "executiveInsight": {
    "summary": "[Substantial 2-3 paragraph executive summary explaining who/what the subject is, significance, career/domain impact, and key findings]",
    "keyFinding": "[The single most critical takeaway or finding regarding the subject]",
    "keyTakeaways": ["[Key Takeaway 1]", "[Key Takeaway 2]", "[Key Takeaway 3]", "[Key Takeaway 4]"]
  },
  "executiveSummary": "[Substantial multi-paragraph executive overview of the subject]",
  "structuredSections": [
    {
      "heading": "[Domain-Adaptive Section Title, e.g. International Cricket Career & Multi-Format Dominance]",
      "icon": "[Material icon name e.g. sports_cricket, movie, history, biotech, query_stats, analytics]",
      "content": "[Long-form comprehensive research content. Include detailed Markdown tables where applicable]"
    },
    {
      "heading": "[Second Domain Section Title, e.g. IPL & Global Franchise Career]",
      "icon": "[Material icon name e.g. trophy, star, sports]",
      "content": "[Detailed research content with Markdown statistics/data tables]"
    },
    {
      "heading": "[Third Domain Section Title, e.g. World Records & Career Milestones]",
      "icon": "[Material icon name e.g. award_star, military_tech]",
      "content": "[Detailed research content covering records, milestones, and landmark achievements]"
    },
    {
      "heading": "[Fourth Domain Section Title, e.g. Playing Style, Technical Mastery & Legacy]",
      "icon": "[Material icon name e.g. psychology, workspace_premium]",
      "content": "[In-depth analysis of technique, innovations, domain influence, and lasting legacy]"
    },
    {
      "heading": "[Fifth Domain Section Title, e.g. Visual Evidence & Contextual Grounding]",
      "icon": "[Material icon name e.g. visibility, center_focus_strong]",
      "content": "[Clear breakdown connecting the uploaded visual evidence with verified domain facts]"
    }
  ],
  "detailedAnalysis": "[Comprehensive in-depth research analysis including Markdown statistics or specifications tables]",
  "identification": "[Domain taxonomy, legal/official naming, and subject background]",
  "scientificTechnicalInfo": "[Technical, statistical, or domain classification breakdown]",
  "historicalBackground": "[Historical development, career timeline, or origins]",
  "keyFacts": [
    { "label": "[Fact Label e.g. Full Name, Batting Style, Debut, Top Score]", "detail": "[Fact Detail]" }
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
    "nodes": [],
    "edges": []
  }
}`;
}
