import { generateCustomId } from '../../utils/idUtils.js';

export const COMPARISON_STATUSES = ['ADDED', 'REMOVED', 'MODIFIED', 'MOVED', 'UNCHANGED', 'UNCERTAIN'];

export class VisualComparisonEngine {
  /**
   * Compares two visual artifacts and produces a structured delta model.
   * @param {Object} sourceA { id, title, visualType, data, imageDimensions }
   * @param {Object} sourceB { id, title, visualType, data, imageDimensions }
   * @param {Object} options { intent: string }
   */
  compareVisuals(sourceA, sourceB, options = {}) {
    if (!sourceA || !sourceB) {
      throw new Error('Both Source A and Source B visual artifacts are required for comparison.');
    }

    const typeA = (sourceA.visualType || sourceA.type || 'DIAGRAM').toUpperCase();
    const typeB = (sourceB.visualType || sourceB.type || 'DIAGRAM').toUpperCase();

    const diffs = [];

    // 1. Diagram vs Diagram Comparison
    if ((typeA === 'DIAGRAM' || typeA === 'DFD' || typeA === 'UML' || typeA === 'ERD') &&
        (typeB === 'DIAGRAM' || typeB === 'DFD' || typeB === 'UML' || typeB === 'ERD')) {
      const diagDiffs = this._compareDiagrams(sourceA, sourceB);
      diffs.push(...diagDiffs);
    }
    // 2. Chart vs Chart Comparison
    else if (typeA === 'CHART' && typeB === 'CHART') {
      const chartDiffs = this._compareCharts(sourceA, sourceB);
      diffs.push(...chartDiffs);
    }
    // 3. Document / General Visual Comparison
    else {
      const generalDiffs = this._compareGeneralVisuals(sourceA, sourceB);
      diffs.push(...generalDiffs);
    }

    const summary = {
      totalChanges: diffs.filter(d => d.status !== 'UNCHANGED').length,
      addedCount: diffs.filter(d => d.status === 'ADDED').length,
      removedCount: diffs.filter(d => d.status === 'REMOVED').length,
      modifiedCount: diffs.filter(d => d.status === 'MODIFIED').length,
      movedCount: diffs.filter(d => d.status === 'MOVED').length,
      unchangedCount: diffs.filter(d => d.status === 'UNCHANGED').length,
      uncertainCount: diffs.filter(d => d.status === 'UNCERTAIN').length
    };

    return {
      comparisonId: generateCustomId('CMP'),
      sourceA: { id: sourceA.id || 'A', title: sourceA.title || 'Version 1', type: typeA },
      sourceB: { id: sourceB.id || 'B', title: sourceB.title || 'Version 2', type: typeB },
      timestamp: new Date().toISOString(),
      summary,
      diffs
    };
  }

  _compareDiagrams(sourceA, sourceB) {
    const diffs = [];
    const structA = sourceA.diagramStructure || sourceA.data?.diagramStructure || { nodes: [], links: [] };
    const structB = sourceB.diagramStructure || sourceB.data?.diagramStructure || { nodes: [], links: [] };

    const nodesA = structA.nodes || [];
    const nodesB = structB.nodes || [];
    const linksA = structA.links || structA.edges || [];
    const linksB = structB.links || structB.edges || [];

    const mapA = new Map(nodesA.map(n => [(n.label || n.id || '').toLowerCase().trim(), n]));
    const mapB = new Map(nodesB.map(n => [(n.label || n.id || '').toLowerCase().trim(), n]));

    // Check nodes in B against A
    for (const [key, nodeB] of mapB.entries()) {
      if (!mapA.has(key)) {
        diffs.push({
          id: generateCustomId('DIFF'),
          targetType: 'NODE',
          elementName: nodeB.label || nodeB.id,
          status: 'ADDED',
          description: `New diagram node "${nodeB.label || nodeB.id}" added in ${sourceB.title || 'Version B'}.`,
          regionA: null,
          regionB: {
            coordinates: nodeB.coordinates || { x: 0.5, y: 0.5, width: 0.2, height: 0.1, normalized: true },
            label: nodeB.label
          }
        });
      } else {
        const nodeA = mapA.get(key);
        // Check for modification in type, label casing, or position
        const typeChanged = nodeA.type && nodeB.type && nodeA.type !== nodeB.type;
        const posChanged = nodeA.coordinates && nodeB.coordinates &&
          (Math.abs((nodeA.coordinates.x || 0) - (nodeB.coordinates.x || 0)) > 0.1 ||
           Math.abs((nodeA.coordinates.y || 0) - (nodeB.coordinates.y || 0)) > 0.1);

        if (typeChanged || posChanged) {
          diffs.push({
            id: generateCustomId('DIFF'),
            targetType: 'NODE',
            elementName: nodeB.label || nodeB.id,
            status: posChanged ? 'MOVED' : 'MODIFIED',
            description: `Diagram node "${nodeB.label}" ${posChanged ? 'relocated on visual canvas' : `type changed from ${nodeA.type} to ${nodeB.type}`}.`,
            regionA: { coordinates: nodeA.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1 }, label: nodeA.label },
            regionB: { coordinates: nodeB.coordinates || { x: 0.5, y: 0.5, width: 0.2, height: 0.1 }, label: nodeB.label }
          });
        } else {
          diffs.push({
            id: generateCustomId('DIFF'),
            targetType: 'NODE',
            elementName: nodeB.label || nodeB.id,
            status: 'UNCHANGED',
            description: `Diagram node "${nodeB.label}" preserved identically across both versions.`,
            regionA: { coordinates: nodeA.coordinates, label: nodeA.label },
            regionB: { coordinates: nodeB.coordinates, label: nodeB.label }
          });
        }
      }
    }

    // Check removed nodes (in A but not B)
    for (const [key, nodeA] of mapA.entries()) {
      if (!mapB.has(key)) {
        diffs.push({
          id: generateCustomId('DIFF'),
          targetType: 'NODE',
          elementName: nodeA.label || nodeA.id,
          status: 'REMOVED',
          description: `Diagram node "${nodeA.label || nodeA.id}" was removed in ${sourceB.title || 'Version B'}.`,
          regionA: { coordinates: nodeA.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1 }, label: nodeA.label },
          regionB: null
        });
      }
    }

    // Compare Links / Connections
    const linkKey = (l) => `${(l.from || l.source || '').toLowerCase().trim()} -> ${(l.to || l.target || '').toLowerCase().trim()}`;
    const linksMapA = new Map(linksA.map(l => [linkKey(l), l]));
    const linksMapB = new Map(linksB.map(l => [linkKey(l), l]));

    for (const [key, linkB] of linksMapB.entries()) {
      if (!linksMapA.has(key)) {
        diffs.push({
          id: generateCustomId('DIFF'),
          targetType: 'EDGE',
          elementName: key,
          status: 'ADDED',
          description: `New connection created: ${key}.`,
          regionA: null,
          regionB: { coordinates: linkB.coordinates || { x: 0.4, y: 0.4, width: 0.2, height: 0.1 }, label: key }
        });
      }
    }

    for (const [key, linkA] of linksMapA.entries()) {
      if (!linksMapB.has(key)) {
        diffs.push({
          id: generateCustomId('DIFF'),
          targetType: 'EDGE',
          elementName: key,
          status: 'REMOVED',
          description: `Connection removed: ${key}.`,
          regionA: { coordinates: linkA.coordinates || { x: 0.4, y: 0.4, width: 0.2, height: 0.1 }, label: key },
          regionB: null
        });
      }
    }

    return diffs;
  }

  _compareCharts(sourceA, sourceB) {
    const diffs = [];
    const structA = sourceA.chartStructure || sourceA.data?.chartStructure || { series: [] };
    const structB = sourceB.chartStructure || sourceB.data?.chartStructure || { series: [] };

    const seriesA = structA.series || [];
    const seriesB = structB.series || [];

    const mapA = new Map(seriesA.map(s => [(s.name || '').toLowerCase().trim(), s]));
    const mapB = new Map(seriesB.map(s => [(s.name || '').toLowerCase().trim(), s]));

    for (const [key, sB] of mapB.entries()) {
      if (!mapA.has(key)) {
        diffs.push({
          id: generateCustomId('DIFF'),
          targetType: 'CHART_SERIES',
          elementName: sB.name,
          status: 'ADDED',
          description: `New data series "${sB.name}" introduced.`,
          regionA: null,
          regionB: { coordinates: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 }, label: sB.name }
        });
      } else {
        const sA = mapA.get(key);
        // Compare data points
        const valA = JSON.stringify(sA.data || sA.values || []);
        const valB = JSON.stringify(sB.data || sB.values || []);
        if (valA !== valB) {
          diffs.push({
            id: generateCustomId('DIFF'),
            targetType: 'CHART_SERIES',
            elementName: sB.name,
            status: 'MODIFIED',
            description: `Data series "${sB.name}" values changed between versions.`,
            regionA: { coordinates: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 }, label: sA.name },
            regionB: { coordinates: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 }, label: sB.name }
          });
        } else {
          diffs.push({
            id: generateCustomId('DIFF'),
            targetType: 'CHART_SERIES',
            elementName: sB.name,
            status: 'UNCHANGED',
            description: `Data series "${sB.name}" remained constant.`,
            regionA: { coordinates: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 }, label: sA.name },
            regionB: { coordinates: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 }, label: sB.name }
          });
        }
      }
    }

    for (const [key, sA] of mapA.entries()) {
      if (!mapB.has(key)) {
        diffs.push({
          id: generateCustomId('DIFF'),
          targetType: 'CHART_SERIES',
          elementName: sA.name,
          status: 'REMOVED',
          description: `Data series "${sA.name}" was removed.`,
          regionA: { coordinates: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 }, label: sA.name },
          regionB: null
        });
      }
    }

    return diffs;
  }

  _compareGeneralVisuals(sourceA, sourceB) {
    const diffs = [];
    const claimsA = sourceA.claims || sourceA.data?.claims || [];
    const claimsB = sourceB.claims || sourceB.data?.claims || [];

    const textA = (typeof claimsA[0] === 'string' ? claimsA : claimsA.map(c => c.claim || c.text)).join(' ');
    const textB = (typeof claimsB[0] === 'string' ? claimsB : claimsB.map(c => c.claim || c.text)).join(' ');

    if (textA !== textB) {
      diffs.push({
        id: generateCustomId('DIFF'),
        targetType: 'REGION',
        elementName: 'Visual Content Stream',
        status: 'MODIFIED',
        description: 'Observed variations in visual text content and detected key regional features.',
        regionA: { coordinates: { x: 0.1, y: 0.1, width: 0.8, height: 0.4 }, label: 'Source A Content' },
        regionB: { coordinates: { x: 0.1, y: 0.1, width: 0.8, height: 0.4 }, label: 'Source B Content' }
      });
    } else {
      diffs.push({
        id: generateCustomId('DIFF'),
        targetType: 'REGION',
        elementName: 'Visual Content Stream',
        status: 'UNCHANGED',
        description: 'Identical visual and textual assertions detected across both artifacts.',
        regionA: { coordinates: { x: 0.1, y: 0.1, width: 0.8, height: 0.4 }, label: 'Source A' },
        regionB: { coordinates: { x: 0.1, y: 0.1, width: 0.8, height: 0.4 }, label: 'Source B' }
      });
    }

    return diffs;
  }
}

export default new VisualComparisonEngine();
