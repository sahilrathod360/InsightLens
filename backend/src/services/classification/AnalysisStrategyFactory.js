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
   * Generates high-signal prompt guidance embedding Visual Classification Taxonomy
   * and specialized analysis pipeline rules into the single-turn AI synthesis call.
   */
  static buildPromptInstructions() {
    return `VISUAL CLASSIFICATION & SPECIALIZED PIPELINES:
1. CLASSIFY VISUAL TYPE into exactly ONE category:
- "photograph": Real-world photography of subjects, people, athletes, actors, landscapes, architecture, stadiums, products, or objects.
- "document": Text-heavy pages, forms, invoices, letters, tables, or scanned sheets. (Extract OCR text, document layout, sections).
- "diagram": Schematics, flowcharts, DFD, UML, architecture blocks, or circuits. (Extract diagramType, nodes with id/label/type, and edges with source/target/label/direction).
- "chart": Quantitative data plots, bar graphs, line charts, pie charts, or dashboards. (Extract chart archetype, axes, visible categories, trends).
- "screenshot": Software interfaces, browser apps, OS windows, mobile screens, or code editors. (Extract interface context, visible UI elements).
- "artwork": Paintings, drawings, watercolors, digital illustrations, or sculptures. (Extract artistic medium, style, composition).
- "map": Geographic maps, transit routes, or terrain surveys. (Extract cartographic type, landmarks, spatial features).
- "unknown": Ambiguous or hybrid visuals.

2. SUBJECT IDENTIFICATION DISCIPLINE:
- Automatically identify the primary research subject (prominent public figure, athlete, landmark, product, dataset, or diagram system) from all available visual evidence (features, logos, uniforms, team insignia, location cues, labels).
- For unidentifiable or private persons, use an accurate descriptive domain subject (e.g., "Professional Cricket Player in Match Uniform") without inventing a name.`;
  }
}

export default AnalysisStrategyFactory;
