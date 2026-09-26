import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';
import { ChartStructureValidator } from '../../chart/ChartStructureValidator.js';

export class ChartAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('chart', 'ChartAnalysisStrategy', 'Chart Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED CHART & DATA VISUALIZATION PIPELINE GUIDELINES:
When the visual artifact is classified as a "chart", you MUST perform full machine-readable quantitative chart extraction in the "chartStructure" JSON field:

1. CLASSIFY CHART ARCHETYPE (Use exact controlled string):
   - "bar": Vertical column or horizontal bar chart comparing discrete categories.
   - "line": Time-series, multi-line trend graph, or continuous mathematical curves.
   - "pie": Proportional breakdown of a whole (slices).
   - "donut": Proportional ring visualization with central cutout.
   - "scatter": 2D Cartesian scatter plot, bubble chart, or dispersion distribution.
   - "area": Shaded volume under curves or stacked categorical area.
   - "histogram": Frequency distribution over continuous numerical bins.
   - "radar": Multivariate polar or spider web chart across radial axes.
   - "generic chart": Hybrid, financial candlestick, or dashboard chart.

2. EXTRACT AXIS SPECIFICATIONS (X-Axis & Y-Axis):
   - "xAxis": { "label": "Time / Category / Metric name", "unit": "Year | Month | USD | % | Count | null", "scale": "categorical | linear | time | logarithmic" }
   - "yAxis": { "label": "Quantitative dependent variable", "unit": "USD | Millions | % | Units | null", "scale": "linear | percentage | logarithmic" }

3. EXTRACT LEGEND & SERIES:
   - "series": Array of series names and visible line/bar colors (e.g. [{ "name": "Revenue", "color": "blue" }]).

4. EXTRACT DATA POINTS (Strict Observational Discipline):
   - "dataPoints": Array of visible data points:
     [{ "label": "2023 Q1", "value": 142.5, "formattedValue": "$142.5M", "series": "Revenue", "certainty": "observed" }]
   - "certainty": "observed" if explicitly written in data callouts/labels; "estimated" if interpolated from axis gridlines.
   - STRICT PROHIBITION: Do NOT invent precise decimal values that are completely unreadable.

5. EXTRACT ANALYTICAL TRENDS & ANOMALIES:
   - "trends": Array of [{ "direction": "increasing | decreasing | stable | volatile | cyclical", "description": "Specific trend explanation" }]
   - "anomalies": Array of strings describing peaks, troughs, gaps, or notable visual outliers.
   - "observations": Array of key takeaways grounded in the quantitative visualization.`;
  }

  postProcess(report) {
    const baseReport = super.postProcess(report);
    const validatedStructure = ChartStructureValidator.validateAndRepair(
      report.chartStructure,
      report.visualType === 'chart'
    );

    return {
      ...baseReport,
      chartStructure: validatedStructure
    };
  }
}

export default ChartAnalysisStrategy;
