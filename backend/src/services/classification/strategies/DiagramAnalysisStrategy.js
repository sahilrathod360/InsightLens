import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';
import { DiagramStructureValidator } from '../../diagram/DiagramStructureValidator.js';

export class DiagramAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('diagram', 'DiagramAnalysisStrategy', 'Diagram Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED DIAGRAM STRUCTURAL EXTRACTION GUIDELINES (PHASE 4):
When the visual artifact is classified as a "diagram", you MUST perform full machine-readable structural graph extraction in the "diagramStructure" JSON field:

1. CLASSIFY DIAGRAM TYPE (Use exact controlled string):
   - "flowchart": Process steps, decisions, terminals, conditional logic branches.
   - "dfd": Data flow diagrams with external entities, numbered processes, data stores, and data flow vectors.
   - "uml": Class diagrams, sequence traces, activity graphs with classes, inheritance, dependencies, methods.
   - "er_diagram": Entity-relationship models with entities, attributes, primary keys, relationships, cardinality.
   - "architecture": Software/system architecture, microservices, cloud tiers, API gateways, database clusters.
   - "generic diagram": Used when the diagram is hybrid, conceptual, or diagram type is uncertain.

2. EXTRACT NODES (Deterministic IDs: "node_1", "node_2", "node_3", ...):
   - "id": Deterministic sequence starting at node_1.
   - "label": Legible textual name. If blurred or unreadable, write "Unreadable label" or null. NEVER invent node labels.
   - "type": Choose strictly from controlled node types:
     ["person", "external_entity", "process", "data_store", "database", "component", "class", "object", "entity", "decision", "document", "system", "unknown"]

3. EXTRACT EDGES & CONNECTORS (Deterministic IDs: "edge_1", "edge_2", ...):
   - "id": Deterministic sequence starting at edge_1.
   - "source": Must match the exact "id" of the origin node (e.g., "node_1").
   - "target": Must match the exact "id" of the destination node (e.g., "node_2").
   - "label": Legible text along the arrow/connector, or null if unlabelled.
   - "type": Choose strictly from:
     ["directed", "undirected", "association", "dependency", "data_flow", "inheritance", "aggregation", "composition", "unknown"]
   - "direction": "forward" | "bidirectional" | "none"
   - "relationshipCertainty": "observed" if visually evidenced; "undetermined" if connector semantics cannot be verified.

4. OBSERVATION DISCIPLINE:
   - Only record nodes and edges that are visually observable.
   - Do NOT extrapolate hidden system connections or fabricate invisible data paths.`;
  }

  postProcess(report) {
    const baseReport = super.postProcess(report);
    const validatedStructure = DiagramStructureValidator.validateAndRepair(
      report.diagramStructure,
      true
    );

    return {
      ...baseReport,
      diagramStructure: validatedStructure
    };
  }
}

export default DiagramAnalysisStrategy;
