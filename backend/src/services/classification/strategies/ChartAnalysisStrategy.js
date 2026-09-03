import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class ChartAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('chart', 'ChartAnalysisStrategy', 'Chart Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED CHART & DATA VISUALIZATION PIPELINE GUIDELINES:
- Identify the exact chart/graph archetype (e.g., vertical bar chart, multi-line trend graph, scatter plot, pie/donut chart, stacked area chart, histogram, radar plot).
- Extract and document chart title, primary independent/dependent axes (X-axis and Y-axis labels, units of measurement, scales).
- Decipher the legend, categorical color codes, series markers, and plotted variables.
- Detail visible quantitative data points, ranges, baselines, and sample sizes.
- Identify analytical trends (linear growth, exponential shifts, cyclic variance, notable peaks, troughs, clusters, or outliers).
- Perform comparative evaluations across visible data series.
- STRICT PROHIBITION: Do NOT fabricate or invent precise numerical values or statistical metrics that cannot be read directly from axis markings or data callouts.`;
  }
}

export default ChartAnalysisStrategy;
