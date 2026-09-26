// Offline Demo Report Fixture - High-Density Intelligence Standard

export const SAMPLE_DEMO_REPORT = {
  id: 'DEMO-89420',
  isDemo: true,
  isSample: true,
  demoNotice: 'SAMPLE DEMONSTRATION — NOT A LIVE AI ANALYSIS',
  title: 'Golden Eagle Aerial Dynamics (Sample Demonstration)',
  subject: 'Golden Eagle (Aquila chrysaetos)',
  scientificName: 'Aquila chrysaetos',
  domainClassification: 'Aquila chrysaetos (Avian Raptor)',
  category: 'Ornithology & Aerodynamics',
  evidenceStatus: 'observed',
  imageFilename: 'sample_golden_eagle_soaring.jpg',
  visualType: 'photograph',
  specializedPipeline: 'Photo Analysis Pipeline',
  summaryLead: 'Sample demonstration brief analyzing an adult Golden Eagle in active soaring flight, highlighting aerodynamic wing slotting, plumage maturity, and thermal soaring posture.',
  executiveSummary: 'SAMPLE DEMONSTRATION: Comprehensive visual research analysis of an adult Golden Eagle in active soaring flight, highlighting aerodynamic wing slotting, plumage maturity, and thermal soaring posture.',
  executiveInsight: {
    summary: 'Sample demonstration brief of an adult Golden Eagle in active soaring flight, highlighting aerodynamic wing slotting and plumage maturity.',
    keyFinding: 'Deeply emarginated primary feathers (wing-tip slots) indicate thermal soaring with minimal induced aerodynamic vortex drag.',
    keyTakeaways: [
      'Characteristic slotted primaries function as individual aerodynamic winglets to attenuate wingtip vortices.',
      'Distinct golden-buff nape and crown plumage confirms adult specimen maturity.',
      'High-contrast overhead daylight provides distinct contour separation against ambient sky.'
    ]
  },
  claims: [
    {
      id: 'claim_1',
      statement: 'Deeply emarginated primary flight feathers (wing-tip slots) are visible at both wingtips.',
      status: 'OBSERVED',
      evidence: 'Fanned primary remiges visible with distinct slotted emarginations at wingtips in visual frame.',
      source: 'Visual Optical Frame',
      reasoning: 'Direct optical detection from image artifact.'
    },
    {
      id: 'claim_2',
      statement: 'Golden-buff nape and crown plumage indicates adult specimen maturity.',
      status: 'OBSERVED',
      evidence: 'Golden-buff crown contrasting against dark brown mantle.',
      source: 'Visual Optical Frame',
      reasoning: 'Visible plumage coloration matches definitive basic phase.'
    },
    {
      id: 'claim_3',
      statement: 'Emarginated primaries attenuate induced vortex drag during thermal soaring.',
      status: 'INFERRED',
      evidence: 'Fluid dynamic aerodynamics of avian wingtip slots.',
      source: 'Journal of Experimental Biology',
      reasoning: 'Aerodynamic theory corroborating visible dihedral wing geometry.'
    },
    {
      id: 'claim_4',
      statement: 'Absolute flight speed and altitude cannot be measured without ground sensor calibration.',
      status: 'UNDETERMINABLE',
      evidence: 'Single uncalibrated 2D optical frame without spatial telemetry.',
      source: 'Visual Optical Frame',
      reasoning: 'Geometric limitation of uncalibrated single-view imaging.'
    }
  ],
  structuredFindings: [
    {
      id: 'finding_1',
      statement: 'Deeply slotted primary flight feathers visible at both wingtips.',
      category: 'Visual Observation',
      status: 'OBSERVED',
      evidence: 'Fanned primary remiges visible with distinct slotted emarginations.',
      reasoning: 'Direct visual detection from visual artifact.'
    },
    {
      id: 'finding_2',
      statement: 'Golden-buff nape feathers visible against dark brown mantle.',
      category: 'Visual Observation',
      status: 'OBSERVED',
      evidence: 'Nape feather coloration.',
      reasoning: 'Direct optical detection in visual frame.'
    },
    {
      id: 'finding_3',
      statement: 'Flight posture indicates utilization of thermal updraft for soaring.',
      category: 'Aerodynamic Analysis',
      status: 'INFERRED',
      evidence: 'Dihedral wing angle and fanned tail.',
      reasoning: 'Inferred from flight posture.'
    },
    {
      id: 'finding_4',
      statement: 'Exact physical wingspan and flight altitude cannot be determined from 2D aspect alone.',
      category: 'Physical Measurement',
      status: 'UNDETERMINABLE',
      evidence: 'Lack of ground scale reference.',
      reasoning: '2D optical perspective boundary.'
    }
  ],
  visualEvidence: [
    { statement: 'Deeply slotted primary flight feathers visible at both wingtips.', status: 'observed' },
    { statement: 'Golden-buff nape feathers visible against dark brown mantle.', status: 'observed' },
    { statement: 'Flight posture indicates utilization of thermal updraft for soaring.', status: 'inferred' },
    { statement: 'Exact physical wingspan and flight altitude cannot be determined from 2D aspect alone.', status: 'undeterminable' }
  ],
  observations: [
    { category: 'Plumage & Morphology', statement: 'Dark brown body plumage with prominent golden feathers across crown and nape.', status: 'observed' },
    { category: 'Aerodynamic Geometry', statement: 'High-aspect wings held in slight positive dihedral angle.', status: 'observed' },
    { category: 'Optical Clarity', statement: 'Crisp focal separation tracking bird contour against diffuse sky background.', status: 'observed' }
  ],
  evidenceLedger: [
    {
      claim: 'Deeply emarginated primary feathers (wing-tip slots) indicate thermal soaring with minimal vortex drag.',
      evidenceType: 'visual_observation',
      supportStatus: 'supported',
      evidence: 'Fanned primary remiges visible with distinct slotted emarginations at wingtips.',
      reasoning: 'Direct geometric and morphological optical detection from visual artifact frame.',
      sourceTitle: 'Visual Optical Frame'
    },
    {
      claim: 'Specimen is an adult Golden Eagle (Aquila chrysaetos) in definitive basic plumage.',
      evidenceType: 'inference',
      supportStatus: 'supported',
      evidence: 'Golden-buff nape and crown plumage contrasting against dark brown mantle.',
      reasoning: 'Taxonomical diagnostic markers consistent with adult definitive basic plumage.',
      sourceTitle: 'Avian Taxonomy Manual',
      sourceUrl: 'https://example.org/raptors'
    },
    {
      claim: 'Slotted primaries function as individual aerodynamic winglets attenuating induced vortex drag.',
      evidenceType: 'external_source',
      supportStatus: 'supported',
      evidence: 'Aerodynamic theory and wind tunnel trials of raptor wingtip slots.',
      reasoning: 'Corroborated by external fluid dynamics literature.',
      sourceTitle: 'Journal of Experimental Biology',
      sourceUrl: 'https://example.org/aero'
    }
  ],
  sections: [
    {
      heading: 'Visual & Structural Analysis',
      body: 'The specimen is captured in full soaring spread with wings extended horizontally in a slight positive dihedral V-angle. The primary remiges are fully fanned, showing distinct slotted emarginations characteristic of Buteonine and Aquiline raptors.'
    },
    {
      heading: 'Subject Identification & Domain Taxonomy',
      body: 'Identified as Aquila chrysaetos (Golden Eagle), belonging to family Accipitridae. The crown and nape exhibit characteristic golden-brown lanceolater feathers contrasting against the dark chocolate mantle.'
    },
    {
      heading: 'Scientific & Aerodynamic Specifications',
      body: 'High aspect-ratio cambered aerofoil structure enables sustained gliding at low sink rates within thermal columns. The slotted primaries generate multiple small tip vortices rather than a single large drag vortex.'
    }
  ],
  historicalTimeline: [
    { era: 'Evolutionary Origins', event: 'Late Miocene Accipitrid Radiation', description: 'Appearance of specialized large-bodied soaring raptors in open montane ecosystems.' },
    { era: 'Historical Falconry', event: 'Central Asian Traditional Hunting', description: 'Centuries of documented co-evolutionary hunting partnerships across the Eurasian steppe.' },
    { era: 'Modern Conservation', event: 'Global Aerial Telemetry Monitoring', description: 'Implementation of satellite GPS tracking and wind farm collision mitigation corridors.' }
  ],
  scientificSpecifications: [
    { label: 'Wingspan Range', value: '1.8 – 2.34 m (Adult)' },
    { label: 'Wing Chord / Aspect Ratio', value: 'High (~7.2)' },
    { label: 'Soaring Speed', value: '45 – 55 km/h (Cruise)' },
    { label: 'Primary Plumage Phase', value: 'Adult (Definitive Basic)' }
  ],
  applications: [
    'Biomimetic winglet design for fixed-wing aerial vehicles and wind turbine blades.',
    'Ecological raptor population census and migration route mapping.',
    'Avian aerodynamics research in low Reynolds number turbulence.'
  ],
  interestingFacts: [
    'Slotted primaries allow birds of prey to fly at high angles of attack without stalling.',
    'Golden Eagles can dive in stoop at speeds exceeding 240 km/h (150 mph).',
    'Their keen visual acuity resolves small prey targets from altitudes over 1.5 kilometers.'
  ],
  limitations: '2D optical perspective limits absolute physical wingspan measurement without calibrated ground scale; telemetry transmitters if fitted ventrally are occluded.',
  references: [
    { title: 'Raptors of the World: Identification and Ecology', source: 'Helm Identification Guides', year: '2021', url: 'https://example.org/raptors' },
    { title: 'Avian Flight Mechanics and Induced Vortex Dynamics', source: 'Journal of Experimental Biology', year: '2023', url: 'https://example.org/aero' }
  ],
  detectedObjects: ['Golden Eagle', 'Wings', 'Sky Background'],
  extractedOCR: 'No textual inscriptions detected.',
  technicalMetadata: {
    visualType: 'photograph',
    specializedPipeline: 'Photo Analysis Pipeline',
    modelUsed: 'Demo Fixture (Offline)',
    aiProvider: 'InsightLens Sample Demonstration',
    evidenceStatus: 'observed',
    processingTimeMs: 85,
    validationStatus: 'Sample Demonstration Fixture',
    timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
};

