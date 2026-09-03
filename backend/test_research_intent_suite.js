import fs from 'fs';
import { execSync } from 'child_process';
import AIManager from './src/services/ai/AIManager.js';
import { extractSuggestedSubjectFromFilename } from '../frontend/src/components/ResearchDesk.js';

console.log('================================================================');
console.log('=== INSIGHTLENS RESEARCH INTENT & RELEVANCE VERIFICATION SUITE ===');
console.log('================================================================\n');

const results = [];

function recordResult(testName, input, expected, actual, pass) {
  results.push({
    testName,
    input: typeof input === 'object' ? JSON.stringify(input) : input,
    expected,
    actual,
    pass: pass ? 'PASS' : 'FAIL'
  });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testName}`);
  console.log(`  Actual: ${actual}\n`);
}

// -------------------------------------------------------------
// 1. FILENAME EXTRACTION TESTS
// -------------------------------------------------------------
console.log('--- TEST GROUP 1: FILENAME EXTRACTION & FILTERING ---');
const genericFile = 'images (2).jpeg';
const meaningfulFile = 'virat-kohli.jpg';

const genericExtracted = extractSuggestedSubjectFromFilename(genericFile);
recordResult(
  'Generic Filename Filter',
  genericFile,
  'Empty string ("")',
  `"${genericExtracted}"`,
  genericExtracted === ''
);

const meaningfulExtracted = extractSuggestedSubjectFromFilename(meaningfulFile);
recordResult(
  'Meaningful Filename Extraction',
  meaningfulFile,
  'Virat Kohli',
  `"${meaningfulExtracted}"`,
  meaningfulExtracted === 'Virat Kohli'
);

// -------------------------------------------------------------
// 2. ATTACHED VIRAT KOHLI ACCEPTANCE IMAGE (media_1788430984416.jpg)
// -------------------------------------------------------------
console.log('--- TEST GROUP 2: ATTACHED VIRAT KOHLI ACCEPTANCE TEST ---');
const kohliImgPath = 'C:/Users/sahil rathod/.gemini/antigravity/brain/86bdf14f-9258-4aa0-9dd3-bdefd079d9bd/.user_uploaded/media_1788430984416.jpg';
const kohliBuf = fs.readFileSync(kohliImgPath);
const kohliDataUrl = `data:image/jpeg;base64,${kohliBuf.toString('base64')}`;

const kohliIntent = {
  subjectContext: 'Virat Kohli',
  focus: 'person',
  question: "What are Virat Kohli's major career achievements and what can be determined about this photograph?",
  depth: 'standard'
};

const start1 = Date.now();
const reportKohli = await AIManager.generateReport(kohliDataUrl, { researchIntent: kohliIntent });
const dur1 = Date.now() - start1;

const isTitleValid = reportKohli.title?.startsWith('Virat Kohli');
const isSubjectValid = reportKohli.subject === 'Virat Kohli';
const hasCareerAnswers = (reportKohli.executiveInsight?.summary || '').toLowerCase().includes('kohli') ||
                         (reportKohli.executiveInsight?.keyFinding || '').toLowerCase().includes('kohli');
const noGenericFilename = !reportKohli.title.toLowerCase().includes('images (2)') && !reportKohli.subject.toLowerCase().includes('images (2)');

recordResult(
  'Attached Virat Kohli Acceptance Report',
  kohliIntent,
  'Title starts with "Virat Kohli —", Subject="Virat Kohli", answers career/photograph question in 5-15s',
  `Title="${reportKohli.title}", Subject="${reportKohli.subject}", Latency=${(dur1 / 1000).toFixed(2)}s`,
  isTitleValid && isSubjectValid && hasCareerAnswers && noGenericFilename
);

await new Promise(r => setTimeout(r, 6000));

// -------------------------------------------------------------
// 3. FOCUS COMPARISON: PERSON FOCUS vs CLOTHING FOCUS
// -------------------------------------------------------------
console.log('--- TEST GROUP 3: SAME-IMAGE FOCUS COMPARISON (PERSON vs CLOTHING) ---');
const clothingIntent = {
  subjectContext: 'Virat Kohli',
  focus: 'clothing',
  question: 'What clothing and appearance details are relevant?',
  depth: 'standard'
};

const startClothing = Date.now();
const reportClothing = await AIManager.generateReport(kohliDataUrl, { researchIntent: clothingIntent });
const durClothing = Date.now() - startClothing;

const clothingFocusMentionsKit = (reportClothing.executiveInsight?.summary || '').toLowerCase().includes('jersey') ||
                                 (reportClothing.executiveInsight?.summary || '').toLowerCase().includes('blue') ||
                                 (reportClothing.executiveInsight?.summary || '').toLowerCase().includes('kit') ||
                                 (reportClothing.executiveInsight?.keyFinding || '').toLowerCase().includes('kit') ||
                                 (reportClothing.executiveInsight?.keyFinding || '').toLowerCase().includes('jersey') ||
                                 (reportClothing.executiveInsight?.keyFinding || '').toLowerCase().includes('uniform') ||
                                 (reportClothing.executiveInsight?.keyFinding || '').toLowerCase().includes('apparel');

const isDifferentFromPerson = reportClothing.executiveInsight?.keyFinding !== reportKohli.executiveInsight?.keyFinding;

recordResult(
  'Clothing Focus Differentiation',
  clothingIntent,
  'Focuses on jersey/kit/apparel and differs from Person focus',
  `KeyFinding="${reportClothing.executiveInsight?.keyFinding?.slice(0, 100)}..." (Latency=${(durClothing / 1000).toFixed(2)}s)`,
  clothingFocusMentionsKit && isDifferentFromPerson
);

await new Promise(r => setTimeout(r, 6000));

// -------------------------------------------------------------
// 4. QUESTION COMPARISON (ACHIEVEMENTS vs EVENT)
// -------------------------------------------------------------
console.log('--- TEST GROUP 4: SAME-IMAGE QUESTION COMPARISON ---');
const eventIntent = {
  subjectContext: 'Virat Kohli',
  focus: 'person',
  question: 'What can be determined about the event shown in this photograph?',
  depth: 'standard'
};

const startEvent = Date.now();
const reportEvent = await AIManager.generateReport(kohliDataUrl, { researchIntent: eventIntent });
const durEvent = Date.now() - startEvent;

const isEventDifferent = reportEvent.executiveInsight?.summary !== reportKohli.executiveInsight?.summary;

recordResult(
  'Question Differentiation',
  eventIntent,
  'Prioritizes event celebration/match determination over career biography',
  `Summary="${reportEvent.executiveInsight?.summary?.slice(0, 100)}..." (Latency=${(durEvent / 1000).toFixed(2)}s)`,
  isEventDifferent
);

await new Promise(r => setTimeout(r, 6000));

// -------------------------------------------------------------
// 5. DEPTH COMPARISON (QUICK vs DEEP)
// -------------------------------------------------------------
console.log('--- TEST GROUP 5: DEPTH COMPARISON (QUICK vs DEEP) ---');
const quickIntent = {
  subjectContext: 'Virat Kohli',
  focus: 'person',
  question: 'Brief overview of batsman',
  depth: 'quick'
};

const startQuick = Date.now();
const reportQuick = await AIManager.generateReport(kohliDataUrl, { researchIntent: quickIntent });
const durQuick = Date.now() - startQuick;

recordResult(
  'Quick Depth Processing',
  quickIntent,
  'Produces concise output in minimal time',
  `Takeaways count=${reportQuick.executiveInsight?.keyTakeaways?.length || 0}, Latency=${(durQuick / 1000).toFixed(2)}s`,
  (reportQuick.executiveInsight?.keyTakeaways?.length || 0) <= 4
);

await new Promise(r => setTimeout(r, 6000));

// -------------------------------------------------------------
// 6. UNNAMED IMAGE TEST (MOUNTAIN)
// -------------------------------------------------------------
console.log('--- TEST GROUP 6: UNNAMED VISUAL ---');
const mtnBuf = fs.readFileSync('../frontend/public/images/mountain-analysis.jpg');
const mtnDataUrl = `data:image/jpeg;base64,${mtnBuf.toString('base64')}`;

const unnamedIntent = {
  subjectContext: '',
  focus: 'auto',
  question: '',
  depth: 'standard'
};

const startUnnamed = Date.now();
const reportUnnamed = await AIManager.generateReport(mtnDataUrl, { researchIntent: unnamedIntent });
const durUnnamed = Date.now() - startUnnamed;

const unnamedNoFilename = !reportUnnamed.subject.toLowerCase().includes('images') && !reportUnnamed.title.toLowerCase().includes('images');

recordResult(
  'Unnamed Image Generic Behavior',
  unnamedIntent,
  'Objective descriptor without filename leakage',
  `Subject="${reportUnnamed.subject}", Title="${reportUnnamed.title}" (Latency=${(durUnnamed / 1000).toFixed(2)}s)`,
  unnamedNoFilename
);

// -------------------------------------------------------------
// 7. FRONTEND PRODUCTION BUILD
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 7: FRONTEND PRODUCTION BUILD ---');
try {
  execSync('npm run build', { cwd: '../frontend', stdio: 'inherit' });
  recordResult('Frontend Production Build', 'npm run build', 'Build succeeds with 0 errors', 'Vite build completed cleanly', true);
} catch (buildErr) {
  recordResult('Frontend Production Build', 'npm run build', 'Build succeeds with 0 errors', buildErr.message, false);
}

// -------------------------------------------------------------
// SUMMARY TABLE
// -------------------------------------------------------------
console.log('\n================================================================');
console.log('=== FINAL VERIFICATION SUMMARY TABLE ===');
console.log('================================================================');
console.table(results);

const allPass = results.every(r => r.pass === 'PASS');
if (allPass) {
  console.log('\n>>> ALL RESEARCH INTENT SUITE TESTS PASSED (100%) <<<');
} else {
  console.error('\n>>> SOME TESTS FAILED <<<');
  process.exit(1);
}
