import { generateCustomId } from '../../utils/idUtils.js';

export class VisualQAEngine {
  /**
   * Evaluates an evidence-grounded query against a visual artifact's extracted structure and claims.
   * @param {Object} visualArtifact { id, title, visualType, diagramStructure, chartStructure, claims, evidence }
   * @param {string} query User query about the visual
   */
  answerQuery(visualArtifact, query) {
    if (!visualArtifact || !query || typeof query !== 'string' || !query.trim()) {
      return {
        queryId: generateCustomId('VQA'),
        query: query || '',
        status: 'UNDETERMINABLE',
        answer: 'Please provide a valid question regarding the visual artifact.',
        reason: 'Missing query input or visual artifact.',
        evidenceRegions: []
      };
    }

    const q = query.toLowerCase().trim();
    const diagramStruct = visualArtifact.diagramStructure || visualArtifact.data?.diagramStructure || null;
    const chartStruct = visualArtifact.chartStructure || visualArtifact.data?.chartStructure || null;
    const claims = visualArtifact.claims || visualArtifact.data?.claims || [];
    const evidenceList = visualArtifact.evidence || visualArtifact.data?.evidence || [];

    // 1. Diagram Connectivity & Access Queries (e.g. "Does Customer directly access the database?")
    if (diagramStruct) {
      const nodes = diagramStruct.nodes || [];
      const links = diagramStruct.links || diagramStruct.edges || [];

      // Extract entities mentioned in query
      const mentionedNodes = nodes.filter(n => {
        const lbl = (n.label || n.id || '').toLowerCase();
        return lbl && q.includes(lbl);
      });

      if (mentionedNodes.length >= 2) {
        const nodeA = mentionedNodes[0];
        const nodeB = mentionedNodes[1];
        const labelA = nodeA.label || nodeA.id;
        const labelB = nodeB.label || nodeB.id;

        // Check direct link
        const directLink = links.find(l => {
          const from = (l.from || l.source || '').toLowerCase();
          const to = (l.to || l.target || '').toLowerCase();
          const a = labelA.toLowerCase();
          const b = labelB.toLowerCase();
          return (from.includes(a) && to.includes(b)) || (from.includes(b) && to.includes(a));
        });

        if (directLink) {
          return {
            queryId: generateCustomId('VQA'),
            query,
            status: 'OBSERVED',
            verdict: 'YES',
            answer: `YES. A direct visual connection exists between "${labelA}" and "${labelB}".`,
            reason: `Visual evidence shows direct link: ${directLink.from} -> ${directLink.to}${directLink.label ? ` (${directLink.label})` : ''}.`,
            evidenceRegions: [
              {
                label: `Node: ${labelA}`,
                coordinates: nodeA.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1, normalized: true }
              },
              {
                label: `Connection: ${directLink.from} -> ${directLink.to}`,
                coordinates: directLink.coordinates || { x: 0.4, y: 0.3, width: 0.2, height: 0.1, normalized: true }
              },
              {
                label: `Node: ${labelB}`,
                coordinates: nodeB.coordinates || { x: 0.6, y: 0.4, width: 0.2, height: 0.1, normalized: true }
              }
            ]
          };
        } else {
          return {
            queryId: generateCustomId('VQA'),
            query,
            status: 'UNDETERMINABLE',
            verdict: 'UNDETERMINABLE',
            answer: `UNDETERMINABLE. Both "${labelA}" and "${labelB}" are detected in the visual artifact, but no direct connecting flow or edge was identified.`,
            reason: `Extracted topology contains nodes "${labelA}" and "${labelB}", but lacks an observed visual connector between them.`,
            evidenceRegions: [
              {
                label: `Node: ${labelA}`,
                coordinates: nodeA.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1, normalized: true }
              },
              {
                label: `Node: ${labelB}`,
                coordinates: nodeB.coordinates || { x: 0.6, y: 0.4, width: 0.2, height: 0.1, normalized: true }
              }
            ]
          };
        }
      }

      if (mentionedNodes.length === 1) {
        const node = mentionedNodes[0];
        const label = node.label || node.id;
        
        // If the user asks a relational/connection question ("Does X connect/link/access/talk to Y?"), but Y is not found
        const isRelationalQuery = q.includes('connect') || q.includes('link') || q.includes('access') || q.includes('flow') || q.includes('call') || q.includes('to ');
        if (isRelationalQuery) {
          return {
            queryId: generateCustomId('VQA'),
            query,
            status: 'UNDETERMINABLE',
            verdict: 'UNDETERMINABLE',
            answer: `UNDETERMINABLE. "${label}" was identified, but the queried target connection is not observed in the visual artifact.`,
            reason: `Target entity or relationship queried in "${query}" is not evidenced in the visual structure.`,
            evidenceRegions: [
              {
                label: `Node: ${label}`,
                coordinates: node.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1, normalized: true }
              }
            ]
          };
        }

        const connectedLinks = links.filter(l => 
          (l.from || l.source || '').toLowerCase().includes(label.toLowerCase()) ||
          (l.to || l.target || '').toLowerCase().includes(label.toLowerCase())
        );

        return {
          queryId: generateCustomId('VQA'),
          query,
          status: 'OBSERVED',
          verdict: 'OBSERVED',
          answer: `Observed entity "${label}" (${node.type || 'Entity'}) with ${connectedLinks.length} visual connection(s).`,
          reason: `Found in diagram topology with ${connectedLinks.length} adjacent link(s).`,
          evidenceRegions: [
            {
              label: `Node: ${label}`,
              coordinates: node.coordinates || { x: 0.2, y: 0.2, width: 0.2, height: 0.1, normalized: true }
            }
          ]
        };
      }
    }

    // 2. Chart Queries
    if (chartStruct) {
      const series = chartStruct.series || [];
      const matchedSeries = series.find(s => (s.name || '').toLowerCase().includes(q) || q.includes((s.name || '').toLowerCase()));
      if (matchedSeries) {
        return {
          queryId: generateCustomId('VQA'),
          query,
          status: 'OBSERVED',
          verdict: 'OBSERVED',
          answer: `Series "${matchedSeries.name}" is present in the chart with ${matchedSeries.data?.length || 0} data points.`,
          reason: 'Extracted from visual chart structure.',
          evidenceRegions: [
            {
              label: `Series: ${matchedSeries.name}`,
              coordinates: { x: 0.2, y: 0.2, width: 0.6, height: 0.5, normalized: true }
            }
          ]
        };
      }
    }

    // 3. General Claim Matches
    const matchingClaim = claims.find(c => {
      const text = typeof c === 'string' ? c : (c.claim || c.text || '');
      return text && (text.toLowerCase().includes(q) || q.includes(text.toLowerCase().slice(0, 20)));
    });

    if (matchingClaim) {
      const claimText = typeof matchingClaim === 'string' ? matchingClaim : (matchingClaim.claim || matchingClaim.text);
      const claimStatus = typeof matchingClaim === 'object' ? (matchingClaim.status || 'OBSERVED') : 'OBSERVED';
      return {
        queryId: generateCustomId('VQA'),
        query,
        status: claimStatus,
        verdict: claimStatus,
        answer: claimText,
        reason: 'Grounding derived from validated visual finding in source report.',
        evidenceRegions: [
          {
            label: 'Extracted Claim Region',
            coordinates: { x: 0.1, y: 0.1, width: 0.8, height: 0.3, normalized: true }
          }
        ]
      };
    }

    // 4. Default: Strictly Refuse Unsupported Inferences as UNDETERMINABLE
    return {
      queryId: generateCustomId('VQA'),
      query,
      status: 'UNDETERMINABLE',
      verdict: 'UNDETERMINABLE',
      answer: 'UNDETERMINABLE. Insufficient visual evidence found in the artifact to reliably answer this question.',
      reason: 'No matching diagram entities, chart series, or evidenced visual regions match the query terms.',
      evidenceRegions: []
    };
  }
}

export default new VisualQAEngine();
