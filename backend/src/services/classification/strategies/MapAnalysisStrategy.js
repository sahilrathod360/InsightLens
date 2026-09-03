import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class MapAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('map', 'MapAnalysisStrategy', 'Map Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED MAP & CARTOGRAPHIC PIPELINE GUIDELINES:
- Identify the cartographic representation type (e.g., geopolitical border map, topographical contour survey, transit network schematic, urban street grid, physical relief map, thematic demographic visualization, nautical/aeronautical chart).
- Catalog clearly visible geographic labels: country/state/city names, bodies of water, mountain ranges, administrative districts, highway markers.
- Interpret map legend components: symbology, scale bar, compass rose/orientation, color-coded terrain/elevation keys.
- Document visible borders, boundaries, coastlines, and jurisdictional dividers.
- Trace transport corridors, navigation routes, transit stops, arterial roads, and point-of-interest markers.
- Characterize macro spatial relationships, regional adjacency, and geographic distribution patterns.
- STRICT PROHIBITION: Do NOT extrapolate or guess exact numerical GPS coordinates or minute distances unless specifically printed on coordinate grids/graticules visible in the image.`;
  }
}

export default MapAnalysisStrategy;
