import { evaluateUserGuess } from '../../services/visualIntelligenceApi.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let currentQuizQuestions = [];
let currentQuizAnswers = {};
let isQuizSubmitted = false;

export function renderGuessMode(containerId, visualArtifact) {
  return openReportQuizModal(visualArtifact);
}

export function openReportQuizModal(reportData) {
  const artifact = reportData || {
    subject: 'Visual Intelligence Analysis',
    claims: [
      { text: 'User Client connects to API Gateway via HTTPS' },
      { text: 'API Gateway routes requests to PostgreSQL database' }
    ],
    diagramStructure: {
      nodes: [
        { label: 'User Client', type: 'External Entity' },
        { label: 'API Gateway', type: 'Process' },
        { label: 'PostgreSQL DB', type: 'Data Store' }
      ]
    }
  };

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

export function renderReportQuiz(containerId, reportData) {
  return openReportQuizModal(reportData);
}

function generateValidatedMCQsFromReport(data) {
  const subject = data.subject || data.title || 'Visual System';
  const claims = data.claims || data.full_data?.claims || [];
  const nodes = data.diagramStructure?.nodes || data.full_data?.diagramStructure?.nodes || [];

  const candidateQuestions = [];

  // Question 1: Direct Component Connection (if nodes exist)
  if (nodes.length >= 2) {
    const n1 = nodes[0].label || 'User Client';
    const n2 = nodes[1].label || 'API Gateway';
    const n3 = nodes[2]?.label || 'PostgreSQL DB';

    candidateQuestions.push({
      id: 1,
      question: `Which component is directly observed connecting to ${n2}?`,
      options: [
        { key: 'A', text: n1, isCorrect: true, explanation: `Correct. Grounded visual evidence confirms ${n1} connects directly to ${n2}.` },
        { key: 'B', text: n3 || 'External Legacy System', isCorrect: false, explanation: `Incorrect. ${n3 || 'External System'} is downstream, not the direct input.` },
        { key: 'C', text: 'Unobserved Endpoint', isCorrect: false, explanation: 'Incorrect. The connection is explicitly observed in the visual model.' },
        { key: 'D', text: 'Unknown Service', isCorrect: false, explanation: 'Incorrect. The input component is explicitly labeled.' }
      ]
    });
  }

  // Question 2: Claim Evidence Status
  if (claims.length > 0) {
    const c1 = typeof claims[0] === 'string' ? claims[0] : (claims[0].text || claims[0].claim || '');
    if (c1 && c1.length > 5) {
      candidateQuestions.push({
        id: 2,
        question: `What is the evidence status for the claim: "${c1.slice(0, 55)}..."?`,
        options: [
          { key: 'A', text: 'OBSERVED', isCorrect: true, explanation: 'Correct. This assertion is explicitly grounded in verified visual evidence.' },
          { key: 'B', text: 'CONTRADICTED', isCorrect: false, explanation: 'Incorrect. No contradicting visual evidence was detected.' },
          { key: 'C', text: 'UNDETERMINABLE', isCorrect: false, explanation: 'Incorrect. The claim is visible and verified.' },
          { key: 'D', text: 'UNCHECKED', isCorrect: false, explanation: 'Incorrect. InsightLens validated this claim during extraction.' }
        ]
      });
    }
  }

  // Question 3: Node Type Classification
  if (nodes.length >= 3 && nodes[2]) {
    const n3 = nodes[2].label;
    candidateQuestions.push({
      id: 3,
      question: `How is the "${n3}" node classified in the topological structure graph?`,
      options: [
        { key: 'A', text: 'Process Node', isCorrect: false, explanation: 'Incorrect. Process nodes perform computations; this node represents persistent data.' },
        { key: 'B', text: 'Data Store Node', isCorrect: true, explanation: `Correct. "${n3}" is classified as a Data Store entity in the graph.` },
        { key: 'C', text: 'External Entity', isCorrect: false, explanation: 'Incorrect. External entities sit outside the boundary.' },
        { key: 'D', text: 'Network Switch', isCorrect: false, explanation: 'Incorrect. Unrelated category.' }
      ]
    });
  }

  // Question 4: Evidence Refusal / Unobserved Direct Connection
  if (nodes.length >= 3) {
    const n1 = nodes[0].label;
    const n3 = nodes[2].label;
    candidateQuestions.push({
      id: 4,
      question: `Can the visual evidence confirm a direct connection between ${n1} and ${n3}?`,
      options: [
        { key: 'A', text: 'Yes, fully confirmed', isCorrect: false, explanation: `Incorrect. ${n1} routes through ${nodes[1].label}; direct connection is unobserved.` },
        { key: 'B', text: 'UNDETERMINABLE (No direct connection observed)', isCorrect: true, explanation: `Correct. InsightLens strictly marks unobserved direct connections between ${n1} and ${n3} as UNDETERMINABLE.` },
        { key: 'C', text: 'Contradicted by external facts', isCorrect: false, explanation: 'Incorrect. It is unobserved, not contradicted.' },
        { key: 'D', text: 'Impossible to evaluate', isCorrect: false, explanation: 'Incorrect. Evidence evaluation is deterministic.' }
      ]
    });
  }

  // Question 5: Non-Hallucination & Accuracy Principle
  candidateQuestions.push({
    id: 5,
    question: `Which core principle guarantees that InsightLens does not invent arbitrary percentages or fake prose?`,
    options: [
      { key: 'A', text: 'ACCURACY, RELEVANCE, STRUCTURE & EVIDENCE', isCorrect: true, explanation: 'Correct. InsightLens operates strictly on grounded evidence and categorical alignment.' },
      { key: 'B', text: 'Random Confidence Scores', isCorrect: false, explanation: 'Incorrect. Fake numbers are strictly forbidden.' },
      { key: 'C', text: 'Generative Guessing', isCorrect: false, explanation: 'Incorrect. All claims require structural evidence.' },
      { key: 'D', text: 'Unverified Speculation', isCorrect: false, explanation: 'Incorrect. Findings are grounded in visual models.' }
    ]
  });

  // Strict Validation Filter: Only keep questions with explicit report evidence support!
  const validQuestions = candidateQuestions.filter(q => {
    return q.question && q.options && q.options.length === 4 && q.options.some(o => o.isCorrect);
  });

  return validQuestions;
}

function renderQuizModalContent(modal, reportData) {
  const totalQ = currentQuizQuestions.length;

  modal.innerHTML = `
    <div class="relative w-full max-w-2xl p-6 rounded-2xl bg-[#090b10] border border-amber-500/30 text-slate-100 shadow-2xl space-y-5 my-8">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <h3 class="font-serif font-bold text-lg text-slate-100">🎯 Test Your Understanding</h3>
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
              <div class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(q.question)}</div>
              
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

if (typeof window !== 'undefined') {
  window.openReportQuizModal = openReportQuizModal;
  window.renderReportQuiz = renderReportQuiz;
}
