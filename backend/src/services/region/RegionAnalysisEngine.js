import { generateCustomId } from '../../utils/idUtils.js';
import { validateAndNormalizeCoordinates } from '../evidence/EvidenceEngine.js';

export class RegionAnalysisEngine {
  /**
   * Performs focused semantic and structural analysis on a specific bounding box region of a visual artifact.
   * @param {Object} regionData { regionId, coordinates, label, visualType, parentContext }
   */
  analyzeRegion(regionData = {}) {
    const { regionId, coordinates, label = 'Selected Region', visualType = 'DIAGRAM', parentContext = null } = regionData;

    if (!coordinates) {
      throw new Error('Bounding box coordinates are required for region-specific analysis.');
    }

    const coordCheck = validateAndNormalizeCoordinates(coordinates);
    if (!coordCheck.valid) {
      throw new Error(`Invalid region coordinates: ${coordCheck.errors.join(', ')}`);
    }

    const normCoords = coordCheck.coordinates;
    const isDiagram = ['DIAGRAM', 'DFD', 'UML', 'ERD', 'FLOWCHART'].includes(visualType.toUpperCase());
    const isChart = visualType.toUpperCase() === 'CHART';

    let extractedText = label;
    let structuralRole = 'General Region Target';
    let observedAssertion = `Observed visual component in region [${normCoords.x}, ${normCoords.y}, ${normCoords.width}, ${normCoords.height}].`;
    let inferredAssertion = 'Inferred semantic context based on position relative to parent layout.';
    let undeterminableNote = 'Internal state and external system behavior cannot be established from this cropped region alone.';

    if (isDiagram) {
      structuralRole = 'Diagram Node / Functional Process';
      observedAssertion = `Observed diagram entity with bounding box at x: ${normCoords.x}, y: ${normCoords.y}.`;
      inferredAssertion = `Acts as a discrete node or functional component in the overall architecture.`;
      undeterminableNote = `Ownership and runtime execution characteristics are undeterminable without global architectural specifications.`;
    } else if (isChart) {
      structuralRole = 'Data Series / Value Cluster';
      observedAssertion = `Observed visual data points and geometric distribution within coordinates.`;
      inferredAssertion = `Represents quantitative variation or category values.`;
      undeterminableNote = `Statistical significance and data collection methodology cannot be determined from visual pixels alone.`;
    }

    return {
      analysisId: generateCustomId('RGA'),
      regionId: regionId || generateCustomId('REG'),
      label,
      coordinates: normCoords,
      visualType,
      structuralRole,
      findings: {
        observed: observedAssertion,
        inferred: inferredAssertion,
        undeterminable: undeterminableNote
      },
      claims: [
        {
          id: generateCustomId('CLM'),
          text: observedAssertion,
          status: 'OBSERVED',
          coordinates: normCoords
        },
        {
          id: generateCustomId('CLM'),
          text: inferredAssertion,
          status: 'INFERRED',
          coordinates: normCoords
        },
        {
          id: generateCustomId('CLM'),
          text: undeterminableNote,
          status: 'UNDETERMINABLE',
          coordinates: normCoords
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
}

export default new RegionAnalysisEngine();
