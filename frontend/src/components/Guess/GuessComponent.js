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

function generateValidatedMCQsFromReport(data) {
  if (!data) return [];

  const subject = data.subject || data.title || data.fullData?.subject || data.full_data?.subject;
  const claims = data.claims || data.fullData?.claims || data.full_data?.claims || [];
  const findings = data.findings || data.keyFindings || data.fullData?.findings || data.full_data?.keyFindings || [];
  const nodes = data.diagramStructure?.nodes || data.fullData?.diagramStructure?.nodes || data.full_data?.diagramStructure?.nodes || [];
  const chartData = data.chartStructure || data.fullData?.chartStructure;
  const summary = data.summary || data.fullData?.summary;

  if (!subject && claims.length === 0 && findings.length === 0 && nodes.length === 0) {
    return [];
  }

  const candidateQuestions = [];
  let qId = 1;

  // 1. Finding Observation Question
  if (findings.length > 0) {
    const f1 = typeof findings[0] === 'string' ? findings[0] : (findings[0].title || findings[0].text || findings[0].claim);
    if (f1 && f1.length > 5) {
      candidateQuestions.push({
        id: qId++,
        sourceClaimId: findings[0].sourceClaimId || `CLAIM-${qId}`,
        question: `Based on the visual evidence of ${subject || 'the visual artifact'}, which finding was explicitly observed?`,
        options: [
          { key: 'A', text: f1, isCorrect: true, explanation: `Correct. Grounded visual evidence explicitly observed: "${f1}".` },
          { key: 'B', text: `Unrelated visual entity not found in ${subject || 'the image'}`, isCorrect: false, explanation: 'Incorrect. This was not detected in the visual evidence.' },
          { key: 'C', text: `Contradicted layout assumption`, isCorrect: false, explanation: 'Incorrect. No visual contradiction was observed.' },
          { key: 'D', text: `Unverified background noise`, isCorrect: false, explanation: 'Incorrect. The observed finding is structured and verified.' }
        ]
      });
    }
  }

  // 2. Claim Evidence Verification Question
  if (claims.length > 0) {
    const c1 = typeof claims[0] === 'string' ? claims[0] : (claims[0].text || claims[0].claim || '');
    const c1Status = (claims[0].status || 'OBSERVED').toUpperCase();
    const c1Id = claims[0].id || claims[0].claimId || `CLAIM-01`;

    if (c1 && c1.length > 5) {
      candidateQuestions.push({
        id: qId++,
        sourceClaimId: c1Id,
        question: `What is the verified evidence status for claim [${c1Id}]: "${c1.slice(0, 60)}${c1.length > 60 ? '...' : ''}"?`,
        options: [
          { key: 'A', text: `Status: ${c1Status}`, isCorrect: true, explanation: `Correct. Claim ${c1Id} is classified as ${c1Status} based on strict visual evidence.` },
          { key: 'B', text: `Status: ${c1Status === 'OBSERVED' ? 'CONTRADICTED' : 'OBSERVED'}`, isCorrect: false, explanation: `Incorrect. Grounded report evidence confirms status is ${c1Status}.` },
          { key: 'C', text: 'Status: UNCHECKED', isCorrect: false, explanation: 'Incorrect. InsightLens verified this claim during extraction.' },
          { key: 'D', text: 'Status: REJECTED', isCorrect: false, explanation: 'Incorrect. The claim was not rejected.' }
        ]
      });
    }
  }

  // 3. Topology Component Question
  if (nodes.length >= 2) {
    const n1 = nodes[0].label || 'Primary Component';
    const n2 = nodes[1].label || 'Secondary Component';
    const n3 = nodes[2]?.label || 'External Boundary';

    candidateQuestions.push({
      id: qId++,
      sourceClaimId: `TOPOLOGY-01`,
      question: `In the visual structural topology of ${subject || 'the image'}, which node directly connects to "${n1}"?`,
      options: [
        { key: 'A', text: n2, isCorrect: true, explanation: `Correct. Topological graph links "${n1}" to "${n2}".` },
        { key: 'B', text: n3, isCorrect: false, explanation: `Incorrect. "${n3}" is downstream or disconnected.` },
        { key: 'C', text: 'Unobserved External System', isCorrect: false, explanation: 'Incorrect. No connection to unobserved external system exists.' },
        { key: 'D', text: 'Isolated Orphan Node', isCorrect: false, explanation: 'Incorrect. The component is connected in the graph.' }
      ]
    });
  }

  // 4. Second Claim or Finding Question
  if (claims.length >= 2) {
    const c2 = typeof claims[1] === 'string' ? claims[1] : (claims[1].text || claims[1].claim || '');
    const c2Id = claims[1].id || claims[1].claimId || `CLAIM-02`;

    if (c2 && c2.length > 5) {
      candidateQuestions.push({
        id: qId++,
        sourceClaimId: c2Id,
        question: `According to evidence claim [${c2Id}], which statement about ${subject || 'the subject'} is correct?`,
        options: [
          { key: 'A', text: c2, isCorrect: true, explanation: `Correct. Grounded evidence [${c2Id}] explicitly asserts: "${c2}".` },
          { key: 'B', text: `Inverted statement: Opposite of ${c2.slice(0, 30)}...`, isCorrect: false, explanation: 'Incorrect. This directly contradicts report evidence.' },
          { key: 'C', text: `Speculative hypothesis not grounded in the image`, isCorrect: false, explanation: 'Incorrect. InsightLens requires grounded evidence.' },
          { key: 'D', text: `Unrelated domain assertion`, isCorrect: false, explanation: 'Incorrect. Assertion is unrelated to report.' }
        ]
      });
    }
  } else if (findings.length >= 2) {
    const f2 = typeof findings[1] === 'string' ? findings[1] : (findings[1].title || findings[1].text);
    if (f2 && f2.length > 5) {
      candidateQuestions.push({
        id: qId++,
        sourceClaimId: `FINDING-02`,
        question: `Which key finding regarding ${subject || 'the image'} was documented in the analysis?`,
        options: [
          { key: 'A', text: f2, isCorrect: true, explanation: `Correct. Grounded report finding: "${f2}".` },
          { key: 'B', text: 'Visual artifact distorted beyond recognition', isCorrect: false, explanation: 'Incorrect. The artifact was successfully extracted.' },
          { key: 'C', text: 'Unverified random noise pattern', isCorrect: false, explanation: 'Incorrect. Structural features were confirmed.' },
          { key: 'D', text: 'Conflicting light source direction', isCorrect: false, explanation: 'Incorrect. Not listed in findings.' }
        ]
      });
    }
  }

  // 5. Summary / Chart Question
  if (chartData && chartData.series && chartData.series.length > 0) {
    const sName = chartData.series[0].name || 'Primary Metric';
    candidateQuestions.push({
      id: qId++,
      sourceClaimId: `CHART-01`,
      question: `In the visual data chart structure, what metric does "${sName}" represent?`,
      options: [
        { key: 'A', text: `Extracted quantitative metric: ${sName}`, isCorrect: true, explanation: `Correct. Chart series data measures ${sName}.` },
        { key: 'B', text: 'Qualitative color swatch', isCorrect: false, explanation: 'Incorrect. Represents numerical chart data.' },
        { key: 'C', text: 'Uncalibrated measurement axis', isCorrect: false, explanation: 'Incorrect. Metric is calibrated.' },
        { key: 'D', text: 'Randomly generated sequence', isCorrect: false, explanation: 'Incorrect. Extracted from actual visual chart.' }
      ]
    });
  } else if (summary && summary.length > 20) {
    candidateQuestions.push({
      id: qId++,
      sourceClaimId: `SUMMARY-01`,
      question: `What is the core visual insight summarized for ${subject || 'this report'}?`,
      options: [
        { key: 'A', text: summary.slice(0, 90) + (summary.length > 90 ? '...' : ''), isCorrect: true, explanation: `Correct. Grounded report summary: "${summary.slice(0, 100)}..."` },
        { key: 'B', text: 'The visual artifact contains no extractable features or structure', isCorrect: false, explanation: 'Incorrect. Full structural model was generated.' },
        { key: 'C', text: 'The analysis inconclusive due to low resolution', isCorrect: false, explanation: 'Incorrect. Analysis was successfully concluded.' },
        { key: 'D', text: 'Standard placeholder description', isCorrect: false, explanation: 'Incorrect. Summary is specific to the uploaded visual.' }
      ]
    });
  }

  // Strict validation filter: Only questions with valid options & evidence references
  return candidateQuestions.filter(q => q.question && q.options && q.options.length === 4 && q.options.some(o => o.isCorrect));
}

function renderQuizModalContent(modal, reportData) {
  const totalQ = currentQuizQuestions.length;

  if (totalQ === 0) {
    modal.innerHTML = `
      <div class="relative w-full max-w-lg p-6 rounded-2xl bg-[#090b10] border border-rose-500/30 text-slate-100 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <h3 class="font-serif font-bold text-lg text-slate-100">🎯 Post-Report Quiz</h3>
          </div>
          <button onclick="window.closeReportQuizModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
        </div>

        <div class="p-6 text-center space-y-3 bg-slate-950/60 rounded-xl border border-white/5">
          <span class="material-symbols-outlined text-4xl text-amber-400">quiz</span>
          <p class="text-sm text-slate-200 font-sans font-semibold">Not enough report-specific evidence to generate a reliable question.</p>
          <p class="text-xs text-slate-400 font-sans leading-relaxed">
            Please analyze a visual image first to generate grounded evidence questions.
          </p>
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
    <div class="relative w-full max-w-2xl p-6 rounded-2xl bg-[#090b10] border border-amber-500/30 text-slate-100 shadow-2xl space-y-5 my-8 animate-fade-in">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <h3 class="font-serif font-bold text-lg text-slate-100">🎯 Grounded Evidence Quiz</h3>
          <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Report-Grounded</span>
        </div>
        <button onclick="window.closeReportQuizModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
      </div>

      <!-- Questions List -->
      <div class="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        ${currentQuizQuestions.map(q => {
          const selectedKey = currentQuizAnswers[q.id];
          const isAnswered = Boolean(selectedKey);
          const selectedOption = q.options.find(o => o.key === selectedKey);

          return `
            <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(q.question)}</div>
                ${q.sourceClaimId ? `<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400 shrink-0">${escapeHtml(q.sourceClaimId)}</span>` : ''}
              </div>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                ${q.options.map(opt => {
                  let btnStyle = 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10';
                  if (isAnswered) {
                    if (opt.isCorrect) {
                      btnStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 font-bold';
                    } else if (opt.key === selectedKey) {
                      btnStyle = 'bg-rose-950/80 text-rose-300 border-rose-500/50 font-bold';
                    } else {
                      btnStyle = 'bg-slate-950/40 text-slate-500 border-white/5 opacity-50';
                    }
                  }

                  return `
                    <button 
                      ${isAnswered ? 'disabled' : ''} 
                      onclick="window.selectQuizOption(${q.id}, '${opt.key}')" 
                      class="p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${btnStyle}">
                      <span class="font-mono font-bold text-xs opacity-75">${opt.key}.</span>
                      <span>${escapeHtml(opt.text)}</span>
                    </button>
                  `;
                }).join('')}
              </div>

              ${isAnswered && selectedOption ? `
                <div class="p-3 rounded-xl text-xs font-sans border ${selectedOption.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}">
                  <strong>${selectedOption.isCorrect ? '✓ Correct!' : '✗ Incorrect:'}</strong> ${escapeHtml(selectedOption.explanation)}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Action Footer -->
      <div class="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        ${!isQuizSubmitted ? `
          <button onclick="window.submitReportQuiz()" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs font-mono transition-all cursor-pointer shadow-lg">
            Calculate Final Score
          </button>
        ` : `
          <div class="w-full p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div class="font-serif font-bold text-amber-300 text-base">Quiz Completed!</div>
              <p class="text-xs text-slate-300 font-sans">Final Score: <strong class="text-white text-sm">${calculateScore()} / ${totalQ}</strong></p>
            </div>
            <button onclick="window.openReportQuizModal(null)" class="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-mono font-semibold cursor-pointer">
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
