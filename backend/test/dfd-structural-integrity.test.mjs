import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DiagramStructureValidator } from '../src/services/diagram/DiagramStructureValidator.js';
import { ChartStructureValidator } from '../src/services/chart/ChartStructureValidator.js';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

describe('DFD Structural Extraction & Referential Integrity Suite', () => {
  it('should maintain referential integrity on real DFD with unresolved endpoints and duplicate nodes', () => {
    const rawDFDStructure = {
      diagramType: 'dfd',
      nodes: [
        { id: 'n1', label: 'Customer', type: 'external_entity' },
        { id: 'n2', label: 'Process Order', type: 'process' },
        { id: 'n3', label: 'Ship Good', type: 'process' },
        { id: 'n4', label: 'Issue Receipt', type: 'process' },
        { id: 'n5', label: 'Inventory', type: 'data_store' },
        { id: 'n6', label: 'Customer', type: 'external_entity' } // duplicate node
      ],
      connections: [
        { source: 'Customer', target: 'Process Order', label: 'Order Request' },
        { source: 'Process Order', target: 'Inventory', label: 'Check Stock' },
        { source: 'Transaction', target: 'Inventory', label: 'Record Transaction' }, // Transaction is NOT a node!
        { source: 'Transaction', target: 'Issue Receipt', label: 'Print Receipt' }   // Transaction is NOT a node!
      ]
    };

    const validated = DiagramStructureValidator.validateAndRepair(rawDFDStructure, true);

    // 1. Diagram type formatting
    assert.equal(validated.diagramType, 'dfd');
    assert.equal(validated.displayType, 'Data Flow Diagram (DFD)');

    // 2. Duplicate detection
    // The duplicate "Customer" without distinct position should be consolidated into 5 unique nodes
    assert.equal(validated.nodes.length, 5);
    const nodeLabels = validated.nodes.map(n => n.label);
    assert.deepEqual(nodeLabels, ['Customer', 'Process Order', 'Ship Good', 'Issue Receipt', 'Inventory']);

    // 3. No phantom nodes created
    assert.equal(validated.nodes.some(n => n.label === 'Transaction'), false);

    // 4. Referential Integrity of Edges
    assert.equal(validated.edges.length, 2); // Only Customer -> Process Order and Process Order -> Inventory are valid
    for (const edge of validated.edges) {
      const sourceExists = validated.nodes.some(n => n.id === edge.source);
      const targetExists = validated.nodes.some(n => n.id === edge.target);
      assert.ok(sourceExists, `Edge source ${edge.source} must exist in nodes`);
      assert.ok(targetExists, `Edge target ${edge.target} must exist in nodes`);
    }

    // 5. Unresolved connections captured and isolated
    assert.equal(validated.unresolvedConnections.length, 2);
    assert.ok(validated.unresolvedConnections[0].reason.includes('Transaction'));
    assert.ok(validated.unresolvedConnections[1].reason.includes('Transaction'));

    // 6. Extraction Completeness Awareness
    assert.equal(validated.extractionCompleteness, 'partial');

    // 7. Structural warnings safety (cautious phrasing)
    assert.ok(validated.structuralIssues.some(issue => issue.includes('Extraction completeness note')));
    assert.ok(validated.structuralIssues.some(issue => issue.includes('Structural validation is limited')));
  });

  it('should ensure DFD reports completely omit chart sections and adjust evidence status for partial extraction', () => {
    const rawDFDReport = {
      visualType: 'diagram',
      subject: 'E-Commerce Order Processing DFD',
      category: 'Software Architecture & System Design',
      diagramStructure: {
        diagramType: 'dfd',
        nodes: [
          { label: 'Customer', type: 'external_entity' },
          { label: 'Process Order', type: 'process' },
          { label: 'Inventory', type: 'data_store' }
        ],
        connections: [
          { source: 'Customer', target: 'Process Order', label: 'Order Placement' },
          { source: 'Transaction', target: 'Inventory', label: 'Log Item' } // Unresolved
        ]
      },
      // Model accidentally included a chartStructure template field
      chartStructure: {
        chartType: 'generic chart',
        xAxis: { label: 'Categories' },
        yAxis: { label: 'Values' },
        dataPoints: []
      },
      claims: [
        { statement: 'Customer external entity connects to Process Order', status: 'OBSERVED' }
      ]
    };

    const normalized = normalizeReport(rawDFDReport);

    // Visual type must be diagram
    assert.equal(normalized.visualType, 'diagram');
    assert.equal(normalized.specializedPipeline, 'Data Flow Diagram (DFD) Analysis Pipeline');

    // chartStructure must be NULL (no chart section for DFD!)
    assert.equal(normalized.chartStructure, null);

    // diagramStructure must be present
    assert.ok(normalized.diagramStructure);
    assert.equal(normalized.diagramStructure.edges.length, 1);
    assert.equal(normalized.diagramStructure.unresolvedConnections.length, 1);

    // Evidence status must be inferred because extraction is partial
    assert.equal(normalized.evidenceStatus, 'inferred');
  });

  it('should return null when ChartStructureValidator or DiagramStructureValidator is passed isChart/isDiagram false', () => {
    const dummyObj = { chartType: 'bar', dataPoints: [] };
    assert.equal(ChartStructureValidator.validateAndRepair(dummyObj, false), null);

    const dummyDiagObj = { diagramType: 'flowchart', nodes: [] };
    assert.equal(DiagramStructureValidator.validateAndRepair(dummyDiagObj, false), null);
  });

  it('should guarantee mutual exclusivity: artwork visualType has null chartStructure and null diagramStructure', () => {
    const rawArtworkReport = {
      visualType: 'artwork',
      subject: 'Spider-Man Suit Concept Art',
      category: 'Art, Design & Creative Media',
      chartStructure: {
        chartType: 'generic chart',
        xAxis: { label: 'Categories' },
        yAxis: { label: 'Values' },
        dataPoints: []
      },
      diagramStructure: {
        diagramType: 'diagram',
        nodes: []
      }
    };

    const normalized = normalizeReport(rawArtworkReport);
    assert.equal(normalized.visualType, 'artwork');
    assert.equal(normalized.chartStructure, null);
    assert.equal(normalized.diagramStructure, null);
  });

  it('should verify print stylesheet in style.css strictly hides .hidden elements and displays appendix telemetry', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const styleCss = fs.readFileSync(path.resolve('../frontend/src/style.css'), 'utf-8');
    const indexHtml = fs.readFileSync(path.resolve('../frontend/index.html'), 'utf-8');

    // 1. Check style.css print block contains .hidden display: none !important
    assert.ok(styleCss.includes('.hidden,') || styleCss.includes('.hidden {'), 'style.css must have .hidden print rule');
    assert.ok(styleCss.includes('#chart-structure-container.hidden'), 'style.css must specifically suppress #chart-structure-container.hidden in print');
    assert.ok(styleCss.includes('#diagram-structure-container.hidden'), 'style.css must specifically suppress #diagram-structure-container.hidden in print');

    // 2. Check #appendix-telemetry-box is present in index.html inside #paper-canvas
    assert.ok(indexHtml.includes('id="appendix-telemetry-box"'), 'index.html must include #appendix-telemetry-box');
    assert.ok(indexHtml.includes('id="paper-canvas"'), 'index.html must include #paper-canvas');
  });
});
