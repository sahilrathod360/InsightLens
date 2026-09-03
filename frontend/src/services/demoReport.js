// Offline Demo Report Fixture - Report 2.0 Standard

export const SAMPLE_DEMO_REPORT = {
  id: 'DEMO-RPT-001',
  title: 'Golden Eagle Aerial Dynamics (Sample Demo Analysis)',
  subject: 'Aquila chrysaetos (Golden Eagle)',
  scientificName: 'Aquila chrysaetos',
  category: 'Ornithology & Aerodynamics',
  confidenceScore: '99.4%',
  imageFilename: 'sample_golden_eagle_soaring.jpg',
  visualType: 'photograph',
  specializedPipeline: 'Photo Analysis Pipeline',
  executiveInsight: {
    summary: 'Comprehensive visual intelligence analysis of an adult Golden Eagle in active soaring flight, highlighting aerodynamic wing slotting and plumage maturity.',
    keyFinding: 'Deeply emarginated primary feathers (wing-tip slots) indicate thermal soaring with minimal induced aerodynamic vortex drag.',
    keyTakeaways: [
      'Characteristic slotted primaries function as individual aerodynamic winglets to attenuate wingtip vortices.',
      'Distinct golden-buff nape and crown plumage confirms adult specimen maturity.',
      'High-contrast overhead daylight provides distinct contour separation against ambient sky.'
    ]
  },
  visualEvidence: [
    { statement: 'Deeply slotted primary flight feathers visible at both wingtips.', status: 'observed' },
    { statement: 'Golden-buff nape feathers visible against dark brown mantle.', status: 'observed' },
    { statement: 'Flight posture indicates utilization of thermal updraft for soaring.', status: 'inferred' },
    { statement: 'Exact physical wingspan and flight altitude cannot be determined from 2D aspect alone.', status: 'undeterminable' }
  ],
  visualStructure: {
    type: 'photograph',
    subject: 'Adult Golden Eagle (Aquila chrysaetos)',
    composition: 'Diagonal soaring vector with open sky background',
    lighting: 'Direct overhead solar illumination',
    environment: 'Alpine airspace substrate'
  },
  observations: [
    { category: 'Plumage & Morphology', statement: 'Dark brown body plumage with prominent golden feathers across crown and nape.', status: 'observed' },
    { category: 'Aerodynamic Geometry', statement: 'High-aspect wings held in slight positive dihedral angle.', status: 'observed' },
    { category: 'Optical Clarity', statement: 'Crisp focal separation tracking bird contour against diffuse sky background.', status: 'observed' }
  ],
  interpretations: [
    { statement: 'Specimen is actively soaring rather than powered flapping.', basis: 'Static wing dihedral and fully fanned tail plane.' }
  ],
  findings: [
    { statement: 'Specimen confirmed as adult Aquila chrysaetos.', basis: 'Golden nape coloration and absence of juvenile white tail markings.' }
  ],
  limitations: [
    '2D projection prevents physical wingspan measurement without calibrated metric scale.',
    'Telemetry transmitters or scientific leg bands, if present, are obscured by ventral feathers.'
  ],
  sources: [
    { title: 'Raptors of the World: Identification and Ecology', source: 'Helm Identification Guides', year: '2021', url: 'https://example.org/raptors' }
  ],
  detectedObjects: ['Golden Eagle', 'Wings', 'Sky Background'],
  extractedOCR: 'None detected',
  technicalMetadata: {
    visualType: 'photograph',
    specializedPipeline: 'Photo Analysis Pipeline',
    modelUsed: 'Demo Fixture Engine',
    aiProvider: 'InsightLens Sample Analysis',
    confidenceScore: '99.4%',
    processingTimeMs: 85,
    validationStatus: 'Sample Report 2.0 Verified',
    reportVersion: '2.0',
    timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
};
