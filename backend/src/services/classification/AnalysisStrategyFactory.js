import { PhotoAnalysisStrategy } from './strategies/PhotoAnalysisStrategy.js';
import { DocumentAnalysisStrategy } from './strategies/DocumentAnalysisStrategy.js';
import { DiagramAnalysisStrategy } from './strategies/DiagramAnalysisStrategy.js';
import { ChartAnalysisStrategy } from './strategies/ChartAnalysisStrategy.js';
import { ScreenshotAnalysisStrategy } from './strategies/ScreenshotAnalysisStrategy.js';
import { ArtworkAnalysisStrategy } from './strategies/ArtworkAnalysisStrategy.js';
import { MapAnalysisStrategy } from './strategies/MapAnalysisStrategy.js';
import { GenericAnalysisStrategy } from './strategies/GenericAnalysisStrategy.js';
import { VisualTypeClassifier } from './VisualTypeClassifier.js';

export class AnalysisStrategyFactory {
  static strategies = {
    photograph: new PhotoAnalysisStrategy(),
    document: new DocumentAnalysisStrategy(),
    diagram: new DiagramAnalysisStrategy(),
    chart: new ChartAnalysisStrategy(),
    screenshot: new ScreenshotAnalysisStrategy(),
    artwork: new ArtworkAnalysisStrategy(),
    map: new MapAnalysisStrategy(),
    unknown: new GenericAnalysisStrategy()
  };

  /**
   * Resolves appropriate strategy based on visualType.
   */
  static getStrategy(rawType) {
    const type = VisualTypeClassifier.normalizeType(rawType);
    return AnalysisStrategyFactory.strategies[type] || AnalysisStrategyFactory.strategies.unknown;
  }

  /**
   * Generates comprehensive prompt guidance embedding Visual Classification Taxonomy
   * and all 8 specialized analysis pipeline rules into the single-turn AI synthesis call.
   */
  static buildPromptInstructions() {
    return `===================================================================
PHASE 3 VISUAL TYPE CLASSIFICATION & SPECIALIZED PIPELINES:
===================================================================
STEP 1: CLASSIFY VISUAL TYPE
Examine the visual artifact and classify it into EXACTLY ONE of these 8 categories:
- "photograph": Real-world photography of people, animals, landscapes, objects, architecture, or physical scenes.
- "document": Text-heavy pages, scanned sheets, official forms, invoices, receipts, letters, tables, or manuscripts.
- "diagram": Conceptual schematics, architecture blocks, flowcharts, electrical circuits, network topology, or UML graphs.
- "chart": Quantitative data plots, bar graphs, line charts, scatter plots, pie charts, histograms, or metrics dashboards.
- "screenshot": Software interfaces, web browsers, operating system windows, mobile applications, or code editors.
- "artwork": Fine art paintings, watercolors, sketches, digital drawings, illustrations, graphic designs, or sculptures.
- "map": Geographic representations, cartographic surveys, transit route networks, urban street grids, or terrain charts.
- "unknown": Visuals where category is genuinely ambiguous, hybrid, or confidence is low.

STEP 2: APPLY THE MATCHING SPECIALIZED STRATEGY GUIDELINES
${AnalysisStrategyFactory.strategies.photograph.getInstructions()}

${AnalysisStrategyFactory.strategies.document.getInstructions()}

${AnalysisStrategyFactory.strategies.chart.getInstructions()}

${AnalysisStrategyFactory.strategies.screenshot.getInstructions()}

${AnalysisStrategyFactory.strategies.artwork.getInstructions()}

${AnalysisStrategyFactory.strategies.map.getInstructions()}

${AnalysisStrategyFactory.strategies.diagram.getInstructions()}

${AnalysisStrategyFactory.strategies.unknown.getInstructions()}
===================================================================`;
  }
}

export default AnalysisStrategyFactory;
