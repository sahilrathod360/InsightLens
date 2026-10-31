import ResearchEngine from '../src/services/research/ResearchEngine.js';

async function testEngine() {
  console.log('Testing ResearchEngine for "James Webb Space Telescope"...');
  const dossier = await ResearchEngine.retrieveGroundingDossier({
    subject: 'James Webb Space Telescope',
    concepts: ['space observatory', 'infrared astronomy'],
    category: 'Astronomy',
    visualType: 'photograph'
  });
  console.log('Retrieved count:', dossier.retrievedCount);
  console.log('Has academic:', dossier.hasAcademicSources);
  console.log('Has encyclopedic:', dossier.hasEncyclopedicSources);
  console.log('Academic sources count:', dossier.academicSources.length);
  dossier.academicSources.forEach((s, idx) => {
    console.log(` ${idx + 1}. "${s.title}" (DOI: ${s.doi || 'N/A'}, Verified: ${s.doiVerified}, Venue: ${s.journal})`);
  });
  console.log('Wikipedia:', dossier.encyclopedicSource?.title, '| URL:', dossier.encyclopedicSource?.url);
  console.log('\n--- Grounding Prompt Preview (First 350 chars) ---');
  console.log(dossier.groundingPromptText.slice(0, 350));
}

testEngine().catch(console.error);
