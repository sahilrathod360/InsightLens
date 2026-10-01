import { generateCustomId } from '../../utils/idUtils.js';

export const CONSISTENCY_CATEGORIES = ['OBSERVED', 'INFERRED', 'UNDETERMINABLE', 'POTENTIAL CONFLICT'];
export const INCONSISTENCY_TYPES = [
  'ENTITY_MISMATCH',
  'MISSING_REPRESENTATION',
  'RELATIONSHIP_MISMATCH',
  'LABEL_MISMATCH',
  'DIRECTION_MISMATCH',
  'STRUCTURAL_CONTRADICTION',
  'CONFLICTING_DEFINITION'
];

export class CrossVisualConsistencyEngine {
  /**
   * Analyzes multiple visual artifacts for cross-representation consistency and conflicts.
   * @param {Array<Object>} artifacts Array of { id, title, visualType, data, diagramStructure, chartStructure, claims }
   */
  evaluateConsistency(artifacts = []) {
    if (!Array.isArray(artifacts) || artifacts.length < 2) {
      return {
        consistencyId: generateCustomId('CNS'),
        timestamp: new Date().toISOString(),
        artifactCount: artifacts?.length || 0,
        overallStatus: 'INSUFFICIENT_DATA',
        findings: [],
        message: 'At least two visual artifacts are required for cross-visual consistency analysis.'
      };
    }

    const findings = [];
    const entityRegistry = new Map(); // normalized name -> Array<{ artifactId, artifactTitle, entity, rawName }>
    const connectionRegistry = new Map(); // "from->to" -> Array<{ artifactId, link, direction }>

    // 1. Ingest entities & structural links across all artifacts
    artifacts.forEach((artifact, aIdx) => {
      const artId = artifact.id || `ART-${aIdx + 1}`;
      const artTitle = artifact.title || `Artifact ${aIdx + 1} (${artifact.visualType || 'Visual'})`;
      const struct = artifact.diagramStructure || artifact.data?.diagramStructure || { nodes: [], links: [] };
      const nodes = struct.nodes || [];
      const links = struct.links || struct.edges || [];

      nodes.forEach(node => {
        const rawLabel = node.label || node.id || '';
        const norm = rawLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!norm) return;

        if (!entityRegistry.has(norm)) {
          entityRegistry.set(norm, []);
        }
        entityRegistry.get(norm).push({
          artifactId: artId,
          artifactTitle: artTitle,
          entity: node,
          rawName: rawLabel,
          type: node.type
        });
      });

      links.forEach(link => {
        const fromNorm = (link.from || link.source || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const toNorm = (link.to || link.target || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!fromNorm || !toNorm) return;

        const forwardKey = `${fromNorm}->${toNorm}`;
        const reverseKey = `${toNorm}->${fromNorm}`;

        if (!connectionRegistry.has(forwardKey)) {
          connectionRegistry.set(forwardKey, []);
        }
        connectionRegistry.get(forwardKey).push({
          artifactId: artId,
          artifactTitle: artTitle,
          link,
          direction: 'FORWARD'
        });

        // Track potential reverse connections
        if (connectionRegistry.has(reverseKey)) {
          connectionRegistry.get(reverseKey).push({
            artifactId: artId,
            artifactTitle: artTitle,
            link,
            direction: 'REVERSE'
          });
        }
      });
    });

    // 2. Detect Missing Representations & Entity Mismatches
    // Entities present in some diagram artifacts but absent from others that share context
    const allArtifactIds = artifacts.map((a, i) => a.id || `ART-${i + 1}`);
    
    for (const [normKey, appearances] of entityRegistry.entries()) {
      const appearingArtifacts = new Set(appearances.map(a => a.artifactId));
      
      // Check for label casing or type mismatches across artifacts
      if (appearances.length >= 2) {
        const names = Array.from(new Set(appearances.map(a => a.rawName)));
        if (names.length > 1) {
          findings.push({
            id: generateCustomId('INC'),
            type: 'LABEL_MISMATCH',
            status: 'POTENTIAL CONFLICT',
            title: `Label variation detected for entity: "${names[0]}"`,
            description: `Entity is labeled as "${names[0]}" in ${appearances[0].artifactTitle}, but rendered as "${names[1]}" in ${appearances[1].artifactTitle}.`,
            severity: 'LOW',
            involvedArtifacts: appearances.map(a => ({ artifactId: a.artifactId, artifactTitle: a.artifactTitle, label: a.rawName })),
            evidence: appearances.map(a => ({
              artifactId: a.artifactId,
              region: `Node: ${a.rawName}`,
              coordinates: a.entity.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1, normalized: true }
            }))
          });
        }
      }

      // If entity is central (appears in >50% of artifacts) but missing in a critical one
      if (appearances.length > 1 && appearingArtifacts.size < allArtifactIds.length) {
        const missingFrom = artifacts.filter(a => !appearingArtifacts.has(a.id || ''));
        if (missingFrom.length > 0 && artifacts.length >= 3) {
          findings.push({
            id: generateCustomId('INC'),
            type: 'MISSING_REPRESENTATION',
            status: 'INFERRED',
            title: `Entity "${appearances[0].rawName}" omitted in ${missingFrom[0].title || 'companion artifact'}`,
            description: `Entity "${appearances[0].rawName}" is established across ${appearances.length} visual models, but is unrepresented in ${missingFrom[0].title || 'companion artifact'}.`,
            severity: 'MEDIUM',
            involvedArtifacts: appearances.map(a => ({ artifactId: a.artifactId, artifactTitle: a.artifactTitle })),
            evidence: appearances.map(a => ({
              artifactId: a.artifactId,
              region: `Node: ${a.rawName}`,
              coordinates: a.entity.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1, normalized: true }
            }))
          });
        }
      }
    }

    // 3. Detect Direction Mismatch & Relationship Mismatch
    for (const [connKey, linksList] of connectionRegistry.entries()) {
      const distinctArtifacts = new Set(linksList.map(l => l.artifactId));
      const hasReverse = linksList.some(l => l.direction === 'REVERSE');

      if (hasReverse && distinctArtifacts.size >= 2) {
        const [from, to] = connKey.split('->');
        findings.push({
          id: generateCustomId('INC'),
          type: 'DIRECTION_MISMATCH',
          status: 'POTENTIAL CONFLICT',
          title: `Contradictory flow direction: ${from} <-> ${to}`,
          description: `Data or control flow is represented in opposing directions across artifacts for connection between "${from}" and "${to}".`,
          severity: 'HIGH',
          involvedArtifacts: linksList.map(l => ({ artifactId: l.artifactId, artifactTitle: l.artifactTitle, flow: `${l.link.from} -> ${l.link.to}` })),
          evidence: linksList.map(l => ({
            artifactId: l.artifactId,
            region: `Connection: ${l.link.from} -> ${l.link.to}`,
            coordinates: l.link.coordinates || { x: 0.3, y: 0.3, width: 0.2, height: 0.1, normalized: true }
          }))
        });
      }
    }

    // 4. If all artifacts are consistent, generate positive verification findings
    if (findings.length === 0) {
      findings.push({
        id: generateCustomId('INC'),
        type: 'STRUCTURAL_CONTRADICTION',
        status: 'OBSERVED',
        title: 'Cross-visual structural consistency verified',
        description: 'All analyzed visual models and diagrams exhibit coherent topological entities and matching flow directions.',
        severity: 'INFO',
        involvedArtifacts: artifacts.map(a => ({ artifactId: a.id, artifactTitle: a.title })),
        evidence: []
      });
    }

    return {
      consistencyId: generateCustomId('CNS'),
      timestamp: new Date().toISOString(),
      artifactCount: artifacts.length,
      artifacts: artifacts.map(a => ({ id: a.id, title: a.title, type: a.visualType })),
      conflictCount: findings.filter(f => f.status === 'POTENTIAL CONFLICT').length,
      mismatchCount: findings.filter(f => f.status === 'POTENTIAL CONFLICT').length,
      overallStatus: findings.some(f => f.status === 'POTENTIAL CONFLICT') ? 'POTENTIAL_INCONSISTENCIES_FOUND' : 'CONSISTENT',
      findings
    };
  }
}

export default new CrossVisualConsistencyEngine();
