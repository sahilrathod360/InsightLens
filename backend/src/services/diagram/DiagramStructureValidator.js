/**
 * Phase 4: Structural Diagram Extraction & Validation Engine
 * 
 * Provides controlled vocabularies, deterministic indexing, and resilient
 * structural graph validation for diagrams (Flowcharts, DFD, UML, ER, Architecture).
 */

export const CONTROLLED_DIAGRAM_TYPES = [
  'flowchart',
  'dfd',
  'uml',
  'er_diagram',
  'architecture',
  'generic diagram'
];

export const CONTROLLED_NODE_TYPES = [
  'person',
  'external_entity',
  'process',
  'data_store',
  'database',
  'component',
  'class',
  'object',
  'entity',
  'decision',
  'document',
  'system',
  'unknown'
];

export const CONTROLLED_EDGE_TYPES = [
  'directed',
  'undirected',
  'association',
  'dependency',
  'data_flow',
  'inheritance',
  'aggregation',
  'composition',
  'unknown'
];

export class DiagramStructureValidator {
  /**
   * Normalizes raw diagram type to controlled vocabulary.
   */
  static normalizeDiagramType(rawType) {
    if (!rawType || typeof rawType !== 'string') return 'generic diagram';
    const clean = rawType.trim().toLowerCase();

    if (CONTROLLED_DIAGRAM_TYPES.includes(clean)) {
      return clean;
    }

    if (/\b(flowcharts?|process\s*flow|workflows?)\b/i.test(clean)) {
      return 'flowchart';
    }
    if (/\b(dfd|data[-_\s]*flows?(\s*diagrams?)?)\b/i.test(clean)) {
      return 'dfd';
    }
    if (/\b(uml|class\s*diagrams?|sequence\s*diagrams?|activity\s*diagrams?)\b/i.test(clean)) {
      return 'uml';
    }
    if (clean.includes('er_') || clean.includes('e-r') || clean === 'er' || /\b(er|erd|entity[-_\s]*relationship|relational\s*schema|database\s*schema)\b/i.test(clean)) {
      return 'er_diagram';
    }
    if (/\b(architectures?|system\s*design|cloud\s*topology|microservices?)\b/i.test(clean)) {
      return 'architecture';
    }

    return 'generic diagram';
  }

  /**
   * Normalizes node type to controlled vocabulary.
   */
  static normalizeNodeType(rawType) {
    if (!rawType || typeof rawType !== 'string') return 'unknown';
    const clean = rawType.trim().toLowerCase();
    return CONTROLLED_NODE_TYPES.includes(clean) ? clean : 'unknown';
  }

  /**
   * Normalizes edge type to controlled vocabulary.
   */
  static normalizeEdgeType(rawType) {
    if (!rawType || typeof rawType !== 'string') return 'directed';
    const clean = rawType.trim().toLowerCase();
    return CONTROLLED_EDGE_TYPES.includes(clean) ? clean : 'directed';
  }

  /**
   * Validates and repairs a diagramStructure object.
   * Ensures deterministic node IDs (node_1, node_2) and edge IDs (edge_1, edge_2),
   * verifies referential integrity (edges only reference existing nodes),
   * and compiles visible labels.
   */
  static validateAndRepair(rawStructure, isDiagram = true) {
    if (!isDiagram) {
      return null;
    }

    if (!rawStructure || typeof rawStructure !== 'object') {
      return {
        diagramType: 'generic diagram',
        classificationReason: 'Diagram visual artifact detected without formal structural nodes.',
        nodes: [],
        edges: [],
        groups: [],
        visibleLabels: []
      };
    }

    const diagramType = DiagramStructureValidator.normalizeDiagramType(rawStructure.diagramType);
    const classificationReason = typeof rawStructure.classificationReason === 'string' && rawStructure.classificationReason.trim()
      ? rawStructure.classificationReason.trim()
      : `Classified as ${diagramType} based on visible structural blocks and connectors.`;

    // 1. Process & Re-index Nodes Deterministically
    const rawNodes = Array.isArray(rawStructure.nodes) ? rawStructure.nodes : [];
    const validNodes = [];
    const oldIdToNewId = new Map();
    const visibleLabelsSet = new Set();

    let nodeCounter = 1;
    for (const rawNode of rawNodes) {
      if (!rawNode || typeof rawNode !== 'object') continue;

      const newId = `node_${nodeCounter++}`;
      const originalId = rawNode.id ? String(rawNode.id).trim() : null;
      if (originalId) {
        oldIdToNewId.set(originalId, newId);
      }
      oldIdToNewId.set(newId, newId);

      // Label extraction discipline
      let label = typeof rawNode.label === 'string' ? rawNode.label.trim() : null;
      if (!label || label.toLowerCase() === 'unreadable' || label.toLowerCase() === 'null') {
        label = 'Unreadable label';
      } else {
        visibleLabelsSet.add(label);
      }

      const nodeType = DiagramStructureValidator.normalizeNodeType(rawNode.type);

      validNodes.push({
        id: newId,
        label,
        type: nodeType
      });
    }

    // 2. Process & Re-index Edges Deterministically
    const rawEdges = Array.isArray(rawStructure.edges) ? rawStructure.edges : [];
    const validEdges = [];
    let edgeCounter = 1;

    for (const rawEdge of rawEdges) {
      if (!rawEdge || typeof rawEdge !== 'object') continue;

      const rawSource = rawEdge.source ? String(rawEdge.source).trim() : null;
      const rawTarget = rawEdge.target ? String(rawEdge.target).trim() : null;

      const sourceId = oldIdToNewId.get(rawSource);
      const targetId = oldIdToNewId.get(rawTarget);

      // Strict Referential Integrity: Discard edge if source or target does not exist
      if (!sourceId || !targetId) {
        continue;
      }

      const newEdgeId = `edge_${edgeCounter++}`;
      let edgeLabel = typeof rawEdge.label === 'string' && rawEdge.label.trim() ? rawEdge.label.trim() : null;
      if (edgeLabel) {
        visibleLabelsSet.add(edgeLabel);
      }

      const edgeType = DiagramStructureValidator.normalizeEdgeType(rawEdge.type);
      const direction = (rawEdge.direction === 'bidirectional' || rawEdge.direction === 'none' || rawEdge.direction === 'forward')
        ? rawEdge.direction
        : 'forward';

      validEdges.push({
        id: newEdgeId,
        source: sourceId,
        target: targetId,
        label: edgeLabel,
        type: edgeType,
        direction,
        relationshipCertainty: rawEdge.relationshipCertainty || (edgeLabel ? 'observed' : 'undetermined')
      });
    }

    // 3. Process Groups if any
    const rawGroups = Array.isArray(rawStructure.groups) ? rawStructure.groups : [];
    const validGroups = [];
    let groupCounter = 1;
    for (const rawGroup of rawGroups) {
      if (!rawGroup || typeof rawGroup !== 'object') continue;
      const groupLabel = typeof rawGroup.label === 'string' ? rawGroup.label.trim() : `Group ${groupCounter}`;
      const groupNodeIds = (Array.isArray(rawGroup.nodeIds) ? rawGroup.nodeIds : [])
        .map(id => oldIdToNewId.get(String(id).trim()))
        .filter(Boolean);

      validGroups.push({
        id: `group_${groupCounter++}`,
        label: groupLabel,
        nodeIds: groupNodeIds
      });
      visibleLabelsSet.add(groupLabel);
    }

    return {
      diagramType,
      classificationReason,
      nodes: validNodes,
      edges: validEdges,
      groups: validGroups,
      visibleLabels: Array.from(visibleLabelsSet)
    };
  }
}

export default DiagramStructureValidator;
