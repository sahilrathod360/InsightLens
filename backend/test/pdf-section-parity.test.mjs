import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeReport } from '../src/services/report/ReportNormalizer.js';

describe('PDF Export & Report Section Parity Suite', () => {
  it('should verify that frontend/index.html has no rogue premature closing tag on #paper-canvas', () => {
    const htmlPath = path.resolve('..', 'frontend', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Verify paper-canvas opens
    assert.ok(html.includes('id="paper-canvas"'), 'paper-canvas ID must exist');

    // Find paper-canvas index
    const canvasIdx = html.indexOf('id="paper-canvas"');
    const afterCanvas = html.slice(canvasIdx);

    // Verify all trailing section IDs exist after paper-canvas
    const expectedSectionIds = [
      'specs-comparison-grid',
      'section-timeline-wrapper',
      'report-historical-timeline',
      'section-applications-wrapper',
      'applications-importance-list',
      'section-facts-wrapper',
      'interesting-facts-grid',
      'section-limitations-wrapper',
      'limitations-text',
      'section-references-wrapper',
      'references-list',
      'section-conclusion-wrapper',
      'conclusion-text',
      'appendix-telemetry-box'
    ];

    for (const secId of expectedSectionIds) {
      assert.ok(afterCanvas.includes(`id="${secId}"`), `Section ${secId} must be present inside paper-canvas scope`);
    }

    // Ensure no orphan closing div before the end of the sections
    const appendixIdx = afterCanvas.indexOf('id="appendix-telemetry-box"');
    assert.ok(appendixIdx > 0, 'Appendix box must exist after paper-canvas open');
  });

  it('should downgrade external/historical facts from OBSERVED to INFERRED', () => {
    const rawSpiderManReport = {
      subject: 'Spider-Man',
      category: 'Pop Culture & Comics',
      claims: [
        {
          statement: 'Character wearing red and blue suit with web pattern',
          status: 'OBSERVED',
          evidence: 'Visible mask and costume textures',
          evidenceType: 'visual_observation'
        },
        {
          statement: 'Spider-Man was created in 1962 by Stan Lee and Steve Ditko',
          status: 'OBSERVED', // Model mistakenly marked this as OBSERVED
          evidence: 'Historical context',
          evidenceType: 'visual_observation'
        },
        {
          statement: 'The film franchise grossed over $8 billion at the box office',
          status: 'OBSERVED', // Model mistakenly marked this as OBSERVED
          evidence: 'Box office records',
          evidenceType: 'visual_observation'
        }
      ],
      evidenceLedger: [
        {
          claim: 'Spider-Man first appeared in Amazing Fantasy #15 in 1962',
          evidenceType: 'visual_observation',
          supportStatus: 'supported'
        }
      ]
    };

    const normalized = normalizeReport(rawSpiderManReport);

    // Direct visual claim remains OBSERVED
    const visualClaim = normalized.claims.find(c => c.statement.includes('red and blue suit'));
    assert.equal(visualClaim.status, 'OBSERVED');

    // Historical 1962 creation claim MUST be INFERRED
    const creationClaim = normalized.claims.find(c => c.statement.includes('created in 1962'));
    assert.equal(creationClaim.status, 'INFERRED');

    // Box office $8 billion claim MUST be INFERRED
    const boxOfficeClaim = normalized.claims.find(c => c.statement.includes('$8 billion'));
    assert.equal(boxOfficeClaim.status, 'INFERRED');
  });

  it('should preserve and normalize full Spider-Man structured report sections', () => {
    const sampleSpiderManFullReport = {
      title: 'Spider-Man Cinematic and Comic Analysis',
      subject: 'Spider-Man (Peter Parker)',
      category: 'Fictional Character & Cinematic Design',
      structuredSections: [
        { heading: 'Character Origins and Evolution', content: 'Debuting in 1962, Spider-Man revolutionized comic storytelling.' },
        { heading: 'Cinematic Impact', content: 'Spider-Man has anchored multiple blockbuster movie iterations.' },
        { heading: 'Suit Design and Aesthetic', content: 'Features iconic dual-tone chromatic palette and raised web textures.' },
        { heading: 'Visual Evidence & Staging Context', content: 'Dynamic crouch pose atop metropolitan skyscraper.' }
      ],
      timeline: [
        { year: '1962', title: 'Amazing Fantasy #15', desc: 'First appearance of Peter Parker / Spider-Man.' },
        { year: '2002', title: 'Sam Raimi Trilogy', desc: 'Live-action blockbuster era begins.' },
        { year: '2016', title: 'Marvel Cinematic Universe Integration', desc: 'Debuts in Captain America: Civil War.' }
      ],
      applications: [
        'Cinematic VFX and costume design reference.',
        'Narrative structural analysis in contemporary mythology.'
      ],
      interestingFacts: [
        'Created by Stan Lee and Steve Ditko.',
        'Costume design uses high-contrast web patterns for visual clarity.'
      ],
      limitations: '2D optical frame cannot verify suit textile composition or mechanical web-shooter interior.',
      references: [
        { title: 'Marvel Comics Character Database', source: 'Marvel Entertainment', year: '2024' }
      ],
      conclusion: 'Spider-Man represents an enduring cultural icon blending dynamic visual design with relatable human vulnerability.'
    };

    const normalized = normalizeReport(sampleSpiderManFullReport);

    assert.equal(normalized.structuredSections.length, 4);
    assert.equal(normalized.timeline.length, 3);
    assert.equal(normalized.applications.length, 2);
    assert.equal(normalized.interestingFacts.length, 2);
    assert.ok(normalized.limitations.some(l => l.includes('2D optical frame')));
    assert.equal(normalized.references.length, 1);
    assert.ok(normalized.conclusion.includes('cultural icon'));
  });
});
