/**
 * Phase 4: Structural Diagram Extraction & Validation Engine
 * 
 * Provides controlled vocabularies, deterministic indexing, referential integrity verification,
 * duplicate node detection, and resilient structural graph validation for diagrams 
 * (Flowcharts, DFD, UML, ER, Architecture).
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
   * Returns a presentation-friendly label for diagram types.
   */
  static formatDiagramTypeLabel(diagramType) {
    switch (diagramType) {
      case 'dfd':
        return 'Data Flow Diagram (DFD)';
      case 'uml':
        return 'Unified Modeling Language (UML)';
      case 'er_diagram':
        return 'Entity-Relationship Diagram (ERD)';
      case 'flowchart':
        return 'Flowchart';
      case 'architecture':
        return 'System Architecture';
      default:
        return 'Diagram';
    }
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
   * verifies referential integrity (edges strictly reference existing nodes),
   * detects duplicates, isolates unresolved connections, and performs extraction-aware
   * topology validation.
   */
  static validateAndRepair(rawStructure, isDiagram = true) {
    if (!isDiagram) {
      return null;
    }

    if (!rawStructure || typeof rawStructure !== 'object') {
      return {
        diagramType: 'generic diagram',
        displayType: 'Diagram',
        classificationReason: 'Diagram visual artifact detected without formal structural nodes.',
        extractionCompleteness: 'inconclusive',
        nodes: [],
        edges: [],
        unresolvedConnections: [],
        groups: [],
        structuralIssues: [],
        visibleLabels: []
      };
    }

    const diagramType = DiagramStructureValidator.normalizeDiagramType(rawStructure.diagramType);
    const displayType = DiagramStructureValidator.formatDiagramTypeLabel(diagramType);
    const classificationReason = typeof rawStructure.classificationReason === 'string' && rawStructure.classificationReason.trim()
      ? rawStructure.classificationReason.trim()
      : `Classified as ${displayType} based on visible structural blocks and connectors.`;

    // 1. Process & Re-index Nodes Deterministically with Duplicate Detection
    const rawNodes = Array.isArray(rawStructure.nodes) ? rawStructure.nodes : [];
    const validNodes = [];
    const oldIdToNewId = new Map();
    const labelToNodeId = new Map();
    const visibleLabelsSet = new Set();
    const duplicateLabels = new Set();
    const seenNodeKeys = new Map(); // normalized "label::type" -> first newId

    let nodeCounter = 1;
    for (const rawNode of rawNodes) {
      if (!rawNode || typeof rawNode !== 'object') continue;

      let label = typeof rawNode.label === 'string' ? rawNode.label.trim() : null;
      if (!label || label.toLowerCase() === 'unreadable' || label.toLowerCase() === 'null') {
        label = 'Unreadable label';
      } else {
        visibleLabelsSet.add(label);
      }

      const nodeType = DiagramStructureValidator.normalizeNodeType(rawNode.type);
      const subtype = typeof rawNode.subtype === 'string' && rawNode.subtype.trim() ? rawNode.subtype.trim() : null;
      const position = rawNode.position && typeof rawNode.position === 'object' ? rawNode.position : (typeof rawNode.position === 'string' ? rawNode.position.trim() : null);
      const certainty = (rawNode.certainty === 'inferred' || rawNode.certainty === 'undetermined') ? rawNode.certainty : 'observed';
      const originalId = rawNode.id ? String(rawNode.id).trim() : null;

      const normKey = `${label.toLowerCase()}::${nodeType}`;
      if (seenNodeKeys.has(normKey) && !position) {
        // Duplicate node detected without distinct spatial coordinates
        const primaryId = seenNodeKeys.get(normKey);
        duplicateLabels.add(label);
        if (originalId) {
          oldIdToNewId.set(originalId, primaryId);
        }
        continue;
      }

      const newId = `node_${nodeCounter++}`;
      if (!seenNodeKeys.has(normKey)) {
        seenNodeKeys.set(normKey, newId);
      }

      if (originalId) {
        oldIdToNewId.set(originalId, newId);
      }
      oldIdToNewId.set(newId, newId);

      // Also map clean label to newId for fallback resolution
      if (label && label !== 'Unreadable label') {
        const lowerLabel = label.toLowerCase();
        if (!labelToNodeId.has(lowerLabel)) {
          labelToNodeId.set(lowerLabel, newId);
        }
        labelToNodeId.set(label, newId);
      }

      const nodeObj = {
        id: newId,
        label,
        type: nodeType
      };
      if (subtype) nodeObj.subtype = subtype;
      if (position) nodeObj.position = position;
      nodeObj.certainty = certainty;

      validNodes.push(nodeObj);
    }

    // Helper to resolve an endpoint string to a valid node ID
    const resolveNodeId = (rawEndpoint) => {
      if (!rawEndpoint) return null;
      const str = String(rawEndpoint).trim();
      if (oldIdToNewId.has(str)) return oldIdToNewId.get(str);
      const lower = str.toLowerCase();
      if (labelToNodeId.has(lower)) return labelToNodeId.get(lower);
      if (labelToNodeId.has(str)) return labelToNodeId.get(str);
      // Try fuzzy matching without leading/trailing punctuation or "node" prefixes
      const stripped = lower.replace(/^(node[_\s-]*|process[_\s-]*|entity[_\s-]*)/i, '');
      if (labelToNodeId.has(stripped)) return labelToNodeId.get(stripped);
      return null;
    };

    // 2. Process & Re-index Edges with Strict Referential Integrity
    const rawEdges = Array.isArray(rawStructure.edges)
      ? rawStructure.edges
      : (Array.isArray(rawStructure.connections) ? rawStructure.connections : (Array.isArray(rawStructure.links) ? rawStructure.links : []));
    
    const validEdges = [];
    const unresolvedConnections = [];
    let edgeCounter = 1;

    for (const rawEdge of rawEdges) {
      if (!rawEdge || typeof rawEdge !== 'object') continue;

      const rawSource = rawEdge.source ? String(rawEdge.source).trim() : (rawEdge.from ? String(rawEdge.from).trim() : null);
      const rawTarget = rawEdge.target ? String(rawEdge.target).trim() : (rawEdge.to ? String(rawEdge.to).trim() : null);

      const sourceId = resolveNodeId(rawSource);
      const targetId = resolveNodeId(rawTarget);

      // Strict Referential Integrity:
      // If either source or target cannot be resolved to an existing extracted node,
      // DO NOT create a valid edge and DO NOT invent a phantom node.
      if (!sourceId || !targetId) {
        const missingEndpoint = !sourceId ? rawSource : rawTarget;
        unresolvedConnections.push({
          source: rawSource,
          target: rawTarget,
          label: rawEdge.label || null,
          reason: `Unresolved endpoint: "${missingEndpoint}" does not match any extracted node.`
        });
        continue;
      }

      const newEdgeId = `edge_${edgeCounter++}`;
      let edgeLabel = typeof rawEdge.label === 'string' && rawEdge.label.trim() ? rawEdge.label.trim() : null;
      if (edgeLabel) {
        visibleLabelsSet.add(edgeLabel);
      }

      const edgeType = DiagramStructureValidator.normalizeEdgeType(rawEdge.type || rawEdge.connectionType);
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

    // 3. Determine Extraction Completeness
    let extractionCompleteness = 'complete';
    if (validNodes.length === 0) {
      extractionCompleteness = 'inconclusive';
    } else if (unresolvedConnections.length > 0) {
      extractionCompleteness = 'partial';
    } else if (validNodes.length > 1 && validEdges.length === 0) {
      extractionCompleteness = 'uncertain';
    }

    // 4. Process Groups if any
    const rawGroups = Array.isArray(rawStructure.groups) ? rawStructure.groups : [];
    const validGroups = [];
    let groupCounter = 1;
    for (const rawGroup of rawGroups) {
      if (!rawGroup || typeof rawGroup !== 'object') continue;
      const groupLabel = typeof rawGroup.label === 'string' ? rawGroup.label.trim() : `Group ${groupCounter}`;
      const groupNodeIds = (Array.isArray(rawGroup.nodeIds) ? rawGroup.nodeIds : [])
        .map(id => resolveNodeId(id))
        .filter(Boolean);
      validGroups.push({
        id: `group_${groupCounter++}`,
        label: groupLabel,
        nodeIds: groupNodeIds
      });
    }

    // 5. Extraction-Aware Structural Observations
    const structuralIssues = [];

    if (extractionCompleteness === 'partial') {
      structuralIssues.push(
        `Extraction completeness note: Visual extraction of diagram connections is partial (${validEdges.length} verified links, ${unresolvedConnections.length} unresolved endpoint(s)). Structural validation is limited because some connectors or labels may not have been reliably extracted from the 2D layout.`
      );
    } else if (extractionCompleteness === 'uncertain') {
      structuralIssues.push(
        `Extraction completeness note: Nodes were extracted but visible connection lines could not be resolved with certainty from the visual frame.`
      );
    }

    if (duplicateLabels.size > 0) {
      structuralIssues.push(
        `Layout observation: Multiple occurrences of entities (${Array.from(duplicateLabels).join(', ')}) were consolidated or present in diagram layout.`
      );
    }

    if (validNodes.length > 1 && validEdges.length > 0) {
      const incomingCounts = new Map();
      const outgoingCounts = new Map();
      validNodes.forEach(n => {
        incomingCounts.set(n.id, 0);
        outgoingCounts.set(n.id, 0);
      });

      validEdges.forEach(e => {
        outgoingCounts.set(e.source, (outgoingCounts.get(e.source) || 0) + 1);
        incomingCounts.set(e.target, (incomingCounts.get(e.target) || 0) + 1);
      });

      for (const node of validNodes) {
        const inCount = incomingCounts.get(node.id) || 0;
        const outCount = outgoingCounts.get(node.id) || 0;
        const isTerminal = (node.subtype && /\b(terminal|start|end|boundary|terminator)\b/i.test(node.subtype)) ||
          (/\b(start|end|stop|terminal)\b/i.test(node.label || '') && !/\bdead\s*end\b/i.test(node.label || ''));

        // Cautious observation phrasing that does not falsely assert confirmed diagram defects
        if (inCount === 0 && outCount === 0) {
          const prefix = extractionCompleteness === 'complete' ? 'Potential observation:' : 'Potential observation (unverified):';
          structuralIssues.push(`${prefix} Node "${node.label || node.id}" (${node.id}) appears isolated with no visible connections to other entities.`);
        } else if (diagramType === 'flowchart' || diagramType === 'dfd') {
          if (outCount === 0 && inCount > 0 && !isTerminal) {
            const prefix = extractionCompleteness === 'complete' ? 'Potential observation:' : 'Potential observation (unverified):';
            structuralIssues.push(`${prefix} Node "${node.label || node.id}" (${node.id}) has incoming flows but no visible outgoing connector.`);
          }
          if (inCount === 0 && outCount > 0 && !isTerminal && node.type === 'process') {
            const prefix = extractionCompleteness === 'complete' ? 'Potential observation:' : 'Potential observation (unverified):';
            structuralIssues.push(`${prefix} Process "${node.label || node.id}" (${node.id}) has outgoing flows but no visible incoming trigger.`);
          }
        }
      }
    }

    return {
      diagramType,
      displayType,
      classificationReason,
      extractionCompleteness,
      nodes: validNodes,
      edges: validEdges,
      unresolvedConnections,
      groups: validGroups,
      structuralIssues,
      visibleLabels: Array.from(visibleLabelsSet)
    };
  }
}

export default DiagramStructureValidator;
