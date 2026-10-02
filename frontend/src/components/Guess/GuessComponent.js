import { getActiveReportData } from '../../state.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let currentQuizQuestions = [];
let currentQuizAnswers = {};
let isQuizSubmitted = false;

export function renderGuessMode(containerId, visualArtifact) {
  return openReportQuizModal(visualArtifact);
}

export function renderReportQuiz(containerId, reportData) {
  return openReportQuizModal(reportData);
}

export function openReportQuizModal(reportData) {
  const artifact = reportData || getActiveReportData();

  currentQuizQuestions = generateValidatedMCQsFromReport(artifact);
  currentQuizAnswers = {};
  isQuizSubmitted = false;

  let modal = document.getElementById('modal-quiz-dialog');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-quiz-dialog';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto';
    document.body.appendChild(modal);
  }

  renderQuizModalContent(modal, artifact);
}

/**
 * Utility to shuffle array and assign clean keys A, B, C, D with tracked correct answer
 */
function buildShuffledOptions(correctOption, distractor1, distractor2, distractor3) {
  const rawList = [
    { text: correctOption.text, isCorrect: true, explanation: correctOption.explanation },
    { text: distractor1.text, isCorrect: false, explanation: distractor1.explanation },
    { text: distractor2.text, isCorrect: false, explanation: distractor2.explanation },
    { text: distractor3.text, isCorrect: false, explanation: distractor3.explanation }
  ];

  // Fisher-Yates shuffle
  for (let i = rawList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawList[i], rawList[j]] = [rawList[j], rawList[i]];
  }

  const keys = ['A', 'B', 'C', 'D'];
  return rawList.map((opt, idx) => ({
    key: keys[idx],
    text: opt.text,
    isCorrect: opt.isCorrect,
    explanation: opt.explanation
  }));
}

function generateValidatedMCQsFromReport(data) {
  if (!data) return [];

  const subject = data.subject || data.title || data.fullData?.subject || data.full_data?.subject || 'Visual Subject';
  const category = data.category || data.domainClassification || data.visualType || data.fullData?.category || 'Visual Intelligence';
  const claims = Array.isArray(data.claims) ? data.claims : (data.fullData?.claims || []);
  const findings = Array.isArray(data.findings) ? data.findings : (Array.isArray(data.structuredFindings) ? data.structuredFindings : (data.fullData?.findings || []));
  const observations = Array.isArray(data.observations) ? data.observations : (data.fullData?.observations || []);
  const keyFacts = Array.isArray(data.keyFacts) ? data.keyFacts : (data.fullData?.keyFacts || []);
  const nodes = data.diagramStructure?.nodes || data.fullData?.diagramStructure?.nodes || [];
  const chartData = data.chartStructure || data.fullData?.chartStructure;
  const summary = data.summary || data.executiveInsight?.summary || data.executiveSummary || data.fullData?.summary || '';
  const keyFinding = data.executiveInsight?.keyFinding || findings[0]?.statement || observations[0]?.statement || 'Core structural features observed in frame';

  const questions = [];
  let qId = 1;

  // -------------------------------------------------------------
  // QUESTION 1: Domain Classification & Optical Staging (Medium)
  // -------------------------------------------------------------
  const envObs = observations.find(o => (o.category || '').toLowerCase() === 'environment')?.statement ||
                 claims.find(c => (c.statement || '').toLowerCase().includes('environment') || (c.statement || '').toLowerCase().includes('setting'))?.statement ||
                 `Spatial background and lighting context observed in frame`;
  
  const attireObs = observations.find(o => ['attire', 'equipment', 'subjects'].includes((o.category || '').toLowerCase()))?.statement ||
                    findings[0]?.statement ||
                    `Observable focal morphology and structural details`;

  const q1Correct = {
    text: `Visible foreground characteristics (${attireObs.slice(0, 65)}) situated within ${envObs.slice(0, 50)}.`,
    explanation: `Supported by report evidence: The visual classification as ${category} is grounded in observable foreground elements and environmental staging.`
  };
  const q1Dist1 = {
    text: `Isolated laboratory macro capture with uniform monochromatic backlight and no environmental depth.`,
    explanation: `Incorrect. The visual evidence contains structured spatial depth and domain-specific staging rather than isolated macro capture.`
  };
  const q1Dist2 = {
    text: `Low-altitude isometric orthographic projection lacking focal character or component hierarchy.`,
    explanation: `Incorrect. The artifact exhibits deliberate focal prominence and natural perspective alignment.`
  };
  const q1Dist3 = {
    text: `Synthetic schematic wireframe composed purely of untextured vector primitives without photographic fidelity.`,
    explanation: `Incorrect. The artifact presents rich optical detail consistent with authentic ${category} domain imagery.`
  };

  questions.push({
    id: qId++,
    topic: 'Classification & Staging Evidence',
    difficulty: 'medium',
    sourceClaimId: 'TAXONOMY-01',
    question: `Which combination of visual evidence and optical staging directly supports the report's classification of ${subject} under ${category}?`,
    options: buildShuffledOptions(q1Correct, q1Dist1, q1Dist2, q1Dist3)
  });

  // -------------------------------------------------------------
  // QUESTION 2: Observed Optical Evidence vs Inferred Deduction (Hard)
  // -------------------------------------------------------------
  const observedClaim = claims.find(c => (c.status || '').toUpperCase() === 'OBSERVED') ||
                        findings.find(f => (f.status || '').toUpperCase() === 'OBSERVED') ||
                        observations[0] ||
                        { statement: `Focal entity contours, color saturation, and primary lighting vector` };
  const obsText = observedClaim.statement || observedClaim.text || observedClaim.claim || 'Primary visual features in frame';

  const inferredClaim = claims.find(c => (c.status || '').toUpperCase() === 'INFERRED') ||
                        { statement: `Complete historical operational provenance and external governance records` };
  const infText = inferredClaim.statement || inferredClaim.text || inferredClaim.claim;

  const q2Correct = {
    text: `Directly visible optical detail: "${obsText.slice(0, 80)}" (Status: OBSERVED).`,
    explanation: `Supported by evidence ledger: This statement represents a direct pixel observation verified within the camera frame.`
  };
  const q2Dist1 = {
    text: `Analytical deduction: "${infText.slice(0, 80)}" (Status: INFERRED).`,
    explanation: `Incorrect. This statement is an analytical deduction or external correlation, not a direct optical pixel observation.`
  };
  const q2Dist2 = {
    text: `Historical domain record: Long-term archival career statistics and championship chronology.`,
    explanation: `Incorrect. Archival statistics are verified external domain knowledge, not direct visual features.`
  };
  const q2Dist3 = {
    text: `Manufacturing specification: Internal chemical substrate composition and metallurgy ratings.`,
    explanation: `Incorrect. Sub-surface material composition cannot be directly observed from a 2D optical frame.`
  };

  questions.push({
    id: qId++,
    topic: 'Evidence Ledger Rigor',
    difficulty: 'hard',
    sourceClaimId: observedClaim.id || 'EVI-LEDGER-01',
    question: `In the evidentiary ledger for ${subject}, which statement is strictly cataloged as directly OBSERVED visual evidence rather than an inferred deduction?`,
    options: buildShuffledOptions(q2Correct, q2Dist1, q2Dist2, q2Dist3)
  });

  // -------------------------------------------------------------
  // QUESTION 3: Structural Topology, Quantitative Chart, or Distinctive Features (Hard)
  // -------------------------------------------------------------
  if (nodes.length >= 2) {
    const n1 = nodes[0].label || 'Primary Client';
    const n2 = nodes[1].label || 'Processing Gateway';
    const n3 = nodes[2]?.label || 'Data Store';

    const q3Correct = {
      text: `Direct directed linkage connecting "${n1}" to "${n2}" with forward data payload flow.`,
      explanation: `Supported by diagram structure: The topology graph maps a verified directed connector between ${n1} and ${n2}.`
    };
    const q3Dist1 = {
      text: `Cyclic feedback loop routing directly from "${n3}" into "${n1}" bypassing intermediate services.`,
      explanation: `Incorrect. The diagram topology does not exhibit an unmediated return loop between these nodes.`
    };
    const q3Dist2 = {
      text: `Decoupled pub-sub broadcast bus bridging "${n2}" to an unobserved legacy gateway.`,
      explanation: `Incorrect. No decoupled broadcast bus is extracted in this diagram.`
    };
    const q3Dist3 = {
      text: `Isolated stateless cluster partition separating "${n1}" from the primary network boundary.`,
      explanation: `Incorrect. ${n1} maintains active connectivity within the mapped boundary.`
    };

    questions.push({
      id: qId++,
      topic: 'Diagram Topology & Data Flow',
      difficulty: 'hard',
      sourceClaimId: 'TOPOLOGY-01',
      question: `In the extracted architectural topology of ${subject}, which structural connection is verified between components?`,
      options: buildShuffledOptions(q3Correct, q3Dist1, q3Dist2, q3Dist3)
    });
  } else if (chartData && chartData.series && chartData.series.length > 0) {
    const sName = chartData.series[0].name || 'Primary Metric';
    const yUnit = chartData.yAxis?.unit || 'Units';

    const q3Correct = {
      text: `Quantitative measurement series tracking "${sName}" across the calibrated Cartesian axis (${yUnit}).`,
      explanation: `Supported by chart structure: The series "${sName}" maps verified quantitative data points on the dependent axis.`
    };
    const q3Dist1 = {
      text: `Uncalibrated nominal category index measuring qualitative aesthetic rankings.`,
      explanation: `Incorrect. The chart plots calibrated quantitative numerical metrics, not arbitrary aesthetic rankings.`
    };
    const q3Dist2 = {
      text: `Stochastic Monte Carlo simulation boundary with probabilistic error envelopes.`,
      explanation: `Incorrect. The chart presents discrete historical data points rather than a simulation envelope.`
    };
    const q3Dist3 = {
      text: `Continuous spectral density distribution plotted on a logarithmic frequency axis.`,
      explanation: `Incorrect. The X/Y coordinates represent discrete domain data series.`
    };

    questions.push({
      id: qId++,
      topic: 'Quantitative Chart Analysis',
      difficulty: 'hard',
      sourceClaimId: 'CHART-01',
      question: `Based on the quantitative structure extracted for ${subject}, what analytical metric does series "${sName}" quantify?`,
      options: buildShuffledOptions(q3Correct, q3Dist1, q3Dist2, q3Dist3)
    });
  } else {
    // Subject specific feature question
    const fact1 = keyFacts[0] || { label: 'Primary Feature', detail: keyFinding.slice(0, 70) };
    const q3Correct = {
      text: `Verified attribute: ${fact1.label ? `${fact1.label} — ${fact1.detail}` : fact1.detail}.`,
      explanation: `Supported by domain research: The verified attribute profile confirms this exact specification.`
    };
    const q3Dist1 = {
      text: `Alternative specification: Standard commercial baseline configuration without specialized domain attributes.`,
      explanation: `Incorrect. The analysis establishes distinctive domain attributes rather than a generic baseline.`
    };
    const q3Dist2 = {
      text: `Unverified variant: Experimental prototype lacking public domain registry documentation.`,
      explanation: `Incorrect. The subject is verified through established domain records.`
    };
    const q3Dist3 = {
      text: `Contradicted attribute: Reversed color scheme and alternate geographic origin.`,
      explanation: `Incorrect. Contradicts observable optical features and verified archival records.`
    };

    questions.push({
      id: qId++,
      topic: 'Verified Subject Attributes',
      difficulty: 'hard',
      sourceClaimId: 'FACT-01',
      question: `Regarding ${subject}, which verified attribute is documented in the domain intelligence profile?`,
      options: buildShuffledOptions(q3Correct, q3Dist1, q3Dist2, q3Dist3)
    });
  }

  // -------------------------------------------------------------
  // QUESTION 4: Analytical Boundaries & Scope (Hard)
  // -------------------------------------------------------------
  const undeterClaim = claims.find(c => (c.status || '').toUpperCase() === 'UNDETERMINABLE');
  const undeterText = undeterClaim ? (undeterClaim.statement || undeterClaim.text || undeterClaim.claim) : 'Internal mechanical state and unobservable private metadata';

  const q4Correct = {
    text: `Two-dimensional optical inspection cannot verify unobserved internal states or private metadata without external ground truth.`,
    explanation: `Supported by epistemic methodology: InsightLens strictly prohibits assuming unobserved facts when optical evidence is absent.`
  };
  const q4Dist1 = {
    text: `The image was flagged as corrupt and rejected by the hardware decoding layer.`,
    explanation: `Incorrect. The artifact was successfully decoded and processed through the visual pipeline.`
  };
  const q4Dist2 = {
    text: `Direct background contradictions conclusively proved the claim to be false.`,
    explanation: `Incorrect. An undeterminable status indicates absence of sufficient evidence, not definitive refutation.`
  };
  const q4Dist3 = {
    text: `The model's classification registry is restricted to pre-modern historical eras.`,
    explanation: `Incorrect. The visual intelligence registry spans modern, technical, and historical domains.`
  };

  questions.push({
    id: qId++,
    topic: 'Epistemic Scope & Verification',
    difficulty: 'hard',
    sourceClaimId: undeterClaim?.id || 'LIMIT-01',
    question: `Why does the report categorize assertions regarding "${undeterText.slice(0, 60)}" as UNDETERMINABLE?`,
    options: buildShuffledOptions(q4Correct, q4Dist1, q4Dist2, q4Dist3)
  });

  // -------------------------------------------------------------
  // QUESTION 5: Executive Synthesis & Key Finding (Medium)
  // -------------------------------------------------------------
  const q5Correct = {
    text: `Core finding: ${keyFinding.slice(0, 85)}${keyFinding.length > 85 ? '...' : ''}`,
    explanation: `Supported by executive summary: The synthesized report highlights this finding as the primary takeaway.`
  };
  const q5Dist1 = {
    text: `The artifact exhibits low semantic coherence and requires manual re-calibration.`,
    explanation: `Incorrect. The visual analysis concluded with high confidence and structured evidence.`
  };
  const q5Dist2 = {
    text: `Visual evidence disproves the identity of ${subject} and reclassifies it as synthetic noise.`,
    explanation: `Incorrect. The report confirms grounded identification and domain alignment.`
  };
  const q5Dist3 = {
    text: `Analysis was terminated prematurely due to unsupported file format encoding.`,
    explanation: `Incorrect. Complete multi-stage visual synthesis was executed.`
  };

  questions.push({
    id: qId++,
    topic: 'Executive Research Synthesis',
    difficulty: 'medium',
    sourceClaimId: 'EXEC-01',
    question: `What core visual intelligence conclusion is synthesized in the executive overview for ${subject}?`,
    options: buildShuffledOptions(q5Correct, q5Dist1, q5Dist2, q5Dist3)
  });

  return questions;
}

function renderQuizModalContent(modal, reportData) {
  const totalQ = currentQuizQuestions.length;

  if (totalQ === 0) {
    modal.innerHTML = `
      <div class="relative w-full max-w-lg p-6 rounded-2xl bg-[#090b10] border border-rose-500/30 text-slate-100 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <h3 class="font-serif font-bold text-lg text-slate-100">🎯 Test Your Understanding</h3>
          </div>
          <button onclick="window.closeReportQuizModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
        </div>

        <div class="p-6 text-center space-y-3 bg-slate-950/60 rounded-xl border border-white/5">
          <span class="material-symbols-outlined text-4xl text-amber-400">quiz</span>
          <p class="text-sm text-slate-200 font-sans font-semibold">Please analyze a visual image first.</p>
        </div>

        <div class="pt-2 flex justify-end">
          <button onclick="window.closeReportQuizModal()" class="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono cursor-pointer">
            Close
          </button>
        </div>
      </div>
    `;
    window.closeReportQuizModal = () => {
      const m = document.getElementById('modal-quiz-dialog');
      if (m) m.remove();
    };
    return;
  }

  modal.innerHTML = `
    <div class="relative w-full max-w-2xl p-6 rounded-2xl bg-[#090b10] border border-amber-500/30 text-slate-100 shadow-2xl space-y-5 my-8 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="material-symbols-outlined text-amber-300">quiz</span>
          <h3 id="quiz-title" class="font-serif font-bold text-lg text-slate-100">Test your understanding</h3>
          <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">${totalQ} Grounded Questions</span>
        </div>
        <button onclick="window.closeReportQuizModal()" aria-label="Close understanding test" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">Close</button>
      </div>

      <!-- Questions List -->
      <div class="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
        ${currentQuizQuestions.map((q, idx) => {
          const selectedKey = currentQuizAnswers[q.id];
          const isAnswered = Boolean(selectedKey);
          const selectedOption = q.options.find(o => o.key === selectedKey);

          return `
            <div class="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3 shadow-md">
              <div class="flex items-start justify-between gap-2">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-bold">Q${idx + 1}</span>
                    <span class="text-[11px] font-mono text-slate-400">${escapeHtml(q.topic || 'Visual Understanding')}</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-mono ${q.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'} uppercase">${escapeHtml(q.difficulty || 'medium')}</span>
                  </div>
                  <div class="font-serif font-bold text-slate-100 text-sm leading-snug">${escapeHtml(q.question)}</div>
                </div>
                ${q.sourceClaimId ? `<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 shrink-0 border border-white/5">${escapeHtml(q.sourceClaimId)}</span>` : ''}
              </div>
              
              <div class="grid grid-cols-1 gap-2 text-xs font-sans pt-1">
                ${q.options.map(opt => {
                  let btnStyle = 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10';
                  if (isAnswered) {
                    if (opt.isCorrect) {
                      btnStyle = 'bg-emerald-950/90 text-emerald-200 border-emerald-500/60 font-semibold shadow-md';
                    } else if (opt.key === selectedKey) {
                      btnStyle = 'bg-rose-950/90 text-rose-200 border-rose-500/60 font-semibold shadow-md';
                    } else {
                      btnStyle = 'bg-slate-950/40 text-slate-500 border-white/5 opacity-40';
                    }
                  }

                  return `
                    <button 
                      ${isAnswered ? 'disabled' : ''} 
                      onclick="window.selectQuizOption(${q.id}, '${opt.key}')" 
                      class="quiz-option p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer leading-relaxed ${btnStyle}">
                      <span class="font-mono font-bold text-xs shrink-0 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">${opt.key}</span>
                      <span class="flex-1">${escapeHtml(opt.text)}</span>
                    </button>
                  `;
                }).join('')}
              </div>

              ${isAnswered && selectedOption ? `
                <div class="p-3 rounded-xl text-xs font-sans border animate-fade-in ${selectedOption.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}">
                  <strong>${selectedOption.isCorrect ? '✓ Correct Answer!' : '✗ Incorrect Selection:'}</strong> ${escapeHtml(selectedOption.explanation)}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Action Footer -->
      <div class="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        ${!isQuizSubmitted ? `
          <button onclick="window.submitReportQuiz()" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs font-mono transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2">
            <span>📊</span> Submit &amp; Calculate Final Score
          </button>
        ` : `
          <div class="w-full p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div class="font-serif font-bold text-amber-300 text-base">Quiz Completed!</div>
              <p class="text-xs text-slate-300 font-sans">Final Score: <strong class="text-white text-sm">${calculateScore()} / ${totalQ}</strong></p>
            </div>
            <button onclick="window.openReportQuizModal(null)" class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-semibold cursor-pointer">
              Retry Quiz
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  window.closeReportQuizModal = () => {
    const m = document.getElementById('modal-quiz-dialog');
    if (m) m.remove();
  };

  window.selectQuizOption = (qId, optionKey) => {
    currentQuizAnswers[qId] = optionKey;
    renderQuizModalContent(modal, reportData);
  };

  window.submitReportQuiz = () => {
    const answeredCount = Object.keys(currentQuizAnswers).length;
    if (answeredCount < totalQ) {
      showToast(`Please answer all ${totalQ} questions before submitting.`, 'warning');
      return;
    }
    isQuizSubmitted = true;
    renderQuizModalContent(modal, reportData);
    showToast(`Quiz complete! Final Score: ${calculateScore()} / ${totalQ}`, 'success');
  };
}

function calculateScore() {
  let score = 0;
  currentQuizQuestions.forEach(q => {
    const userAns = currentQuizAnswers[q.id];
    const correctOpt = q.options.find(o => o.isCorrect);
    if (userAns && correctOpt && userAns === correctOpt.key) {
      score++;
    }
  });
  return score;
}
