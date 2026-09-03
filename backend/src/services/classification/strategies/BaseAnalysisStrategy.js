/**
 * Base Analysis Strategy for InsightLens Visual Intelligence Pipelines
 */
export class BaseAnalysisStrategy {
  constructor(visualType, name, label) {
    this.visualType = visualType;
    this.name = name;
    this.label = label;
  }

  getInstructions() {
    throw new Error('getInstructions() must be implemented by strategy subclass.');
  }

  postProcess(report) {
    return {
      ...report,
      visualType: this.visualType,
      analysisPipeline: this.visualType,
      specializedPipeline: this.label
    };
  }
}

export default BaseAnalysisStrategy;
