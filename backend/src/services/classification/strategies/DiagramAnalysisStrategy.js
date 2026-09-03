import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class DiagramAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('diagram', 'DiagramAnalysisStrategy', 'Diagram Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED DIAGRAM & SCHEMATIC PIPELINE GUIDELINES (PREPARATORY PHASE):
- Classify the diagram archetype (e.g., system architecture diagram, process flowchart, sequence diagram, network topology, electrical circuit schematic, entity-relationship model, hierarchy tree).
- Catalog primary visible nodes, functional blocks, subsystems, component containers, and actors.
- Transcribe text labels, step numbers, and annotations associated with individual blocks.
- Trace directional connectors: solid arrows, dashed dependencies, feedback loops, bidirectional channels, and input/output interfaces.
- Identify visual grouping: clusters, swimlanes, boundary tiers (e.g., client-side, API layer, database cluster), and modular subgraphs.
- Summarize the high-level workflow, logical progression, or structural hierarchy exhibited by the diagram.
- NOTE: Provide objective high-level structural observations and topological relationships (full formal machine extraction is scheduled for Phase 4).`;
  }
}

export default DiagramAnalysisStrategy;
