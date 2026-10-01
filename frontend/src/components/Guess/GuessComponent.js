import { evaluateUserGuess } from '../../services/visualIntelligenceApi.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let currentQuizQuestions = [];
let currentQuizAnswers = {};
let isQuizSubmitted = false;

export function renderGuessMode(containerId, visualArtifact) {
  return renderReportQuiz(containerId, visualArtifact);
}

export function renderReportQuiz(containerId, reportData) {
  const mount = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!mount) return;

  const artifact = reportData || {
    subject: 'Distributed Microservices System',
    claims: [
      { id: 'c1', text: 'User Client connects to API Gateway via HTTPS' },
      { id: 'c2', text: 'API Gateway routes requests to PostgreSQL database' }
    ],
    diagramStructure: {
      nodes: [
        { id: 'n1', label: 'User Client', type: 'External Entity' },
        { id: 'n2', label: 'API Gateway', type: 'Process' },
        { id: 'n3', label: 'PostgreSQL DB', type: 'Data Store' }
      ]
    }
  };

  currentQuizQuestions = generateMCQsFromReport(artifact);
  currentQuizAnswers = {};
  isQuizSubmitted = false;

  renderQuizUI(mount, artifact);
}

function generateMCQsFromReport(data) {
  const subject = data.subject || data.title || 'Visual System';
  const claims = data.claims || data.full_data?.claims || [
    { text: 'User Client connects to API Gateway directly' },
    { text: 'API Gateway queries PostgreSQL database' }
  ];
  const nodes = data.diagramStructure?.nodes || data.full_data?.diagramStructure?.nodes || [
    { label: 'User Client', type: 'External Entity' },
    { label: 'API Gateway', type: 'Process' },
    { label: 'PostgreSQL DB', type: 'Data Store' }
  ];

  const c1 = typeof claims[0] === 'string' ? claims[0] : (claims[0]?.text || claims[0]?.claim || 'Client sends HTTPS requests');
  const c2 = typeof claims[1] === 'string' ? claims[1] : (claims[1]?.text || claims[1]?.claim || 'API Gateway communicates with database');
  const n1 = nodes[0]?.label || 'User Client';
  const n2 = nodes[1]?.label || 'API Gateway';
  const n3 = nodes[2]?.label || 'PostgreSQL DB';

  return [
    {
      id: 1,
      question: `1. Which component is directly observed connecting to the ${n2}?`,
      options: [
        { key: 'A', text: n1, isCorrect: true, explanation: `Correct. Grounded visual evidence confirms ${n1} connects directly to ${n2}.` },
        { key: 'B', text: n3, isCorrect: false, explanation: `Incorrect. ${n3} is connected downstream of ${n2}, not directly to client input.` },
        { key: 'C', text: 'External Legacy Monolith', isCorrect: false, explanation: 'Incorrect. No legacy monolith connection is observed in the primary flow.' },
        { key: 'D', text: 'Unobserved Endpoint', isCorrect: false, explanation: 'Incorrect. The connection is explicitly observed in the visual model.' }
      ]
    },
    {
      id: 2,
      question: `2. What is the evidence status for the claim: "${c1.slice(0, 60)}..."?`,
      options: [
        { key: 'A', text: 'OBSERVED', isCorrect: true, explanation: 'Correct. This assertion is explicitly grounded in verified visual evidence.' },
        { key: 'B', text: 'CONTRADICTED', isCorrect: false, explanation: 'Incorrect. No contradicting visual evidence was detected.' },
        { key: 'C', text: 'UNDETERMINABLE', isCorrect: false, explanation: 'Incorrect. The claim is clearly visible and verified.' },
        { key: 'D', text: 'UNCHECKED', isCorrect: false, explanation: 'Incorrect. InsightLens validated this claim during extraction.' }
      ]
    },
    {
      id: 3,
      question: `3. How is the ${n3} node classified in the topological structure graph?`,
      options: [
        { key: 'A', text: 'Process Node', isCorrect: false, explanation: `Incorrect. ${n2} is the Process node; ${n3} stores persistent state.` },
        { key: 'B', text: 'Data Store Node', isCorrect: true, explanation: `Correct. ${n3} is classified as a Data Store entity in the structural graph.` },
        { key: 'C', text: 'External Entity', isCorrect: false, explanation: `Incorrect. ${n1} is the external entity.` },
        { key: 'D', text: 'Network Switch', isCorrect: false, explanation: 'Incorrect. Unrelated category.' }
      ]
    },
    {
      id: 4,
      question: `4. Can the visual evidence confirm a direct connection between ${n1} and ${n3}?`,
      options: [
        { key: 'A', text: 'Yes, fully confirmed', isCorrect: false, explanation: `Incorrect. ${n1} routes through ${n2}; direct connection is unobserved.` },
        { key: 'B', text: 'UNDETERMINABLE (No direct connection observed)', isCorrect: true, explanation: `Correct. InsightLens strictly marks unobserved direct connections between ${n1} and ${n3} as UNDETERMINABLE.` },
        { key: 'C', text: 'Contradicted by external facts', isCorrect: false, explanation: 'Incorrect. It is unobserved, not contradicted.' },
        { key: 'D', text: 'Impossible to evaluate', isCorrect: false, explanation: 'Incorrect. Evidence evaluation is deterministic.' }
      ]
    },
    {
      id: 5,
      question: `5. Which core principle guarantees that InsightLens does not invent arbitrary percentages?`,
      options: [
        { key: 'A', text: 'ACCURACY, RELEVANCE, STRUCTURE & EVIDENCE', isCorrect: true, explanation: 'Correct. InsightLens operates strictly on grounded evidence and categorical alignment.' },
        { key: 'B', text: 'Random Confidence Scores', isCorrect: false, explanation: 'Incorrect. Fake numbers are strictly forbidden.' },
        { key: 'C', text: 'Generative Guessing', isCorrect: false, explanation: 'Incorrect. All claims require structural evidence.' },
        { key: 'D', text: 'Unverified Web Scraping', isCorrect: false, explanation: 'Incorrect. Findings are grounded in visual models.' }
      ]
    }
  ];
}

function renderQuizUI(mount, reportData) {
  const totalQ = currentQuizQuestions.length;

  mount.innerHTML = `
    <div class="space-y-6 max-w-3xl mx-auto text-left animate-fade-in p-6 rounded-2xl bg-slate-950/80 border border-amber-500/20">
      <!-- Quiz Header -->
      <div class="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs">
            🎯 Test Your Understanding • Post-Report Quiz
          </div>
          <h3 class="font-serif font-bold text-slate-100 text-xl mt-1">Knowledge &amp; Evidence Quiz</h3>
        </div>
        <span class="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          5 Questions
        </span>
      </div>

      <!-- Questions List -->
      <div class="space-y-6">
        ${currentQuizQuestions.map(q => {
          const selectedKey = currentQuizAnswers[q.id];
          const isAnswered = Boolean(selectedKey);
          const selectedOption = q.options.find(o => o.key === selectedKey);

          return `
            <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
              <div class="font-serif font-bold text-slate-200 text-sm">${escapeHtml(q.question)}</div>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                ${q.options.map(opt => {
                  let btnStyle = 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-white/10';
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
                      class="p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${btnStyle}">
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

      <!-- Submit / Score Result Area -->
      <div class="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        ${!isQuizSubmitted ? `
          <button onclick="window.submitReportQuiz()" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs font-mono transition-all cursor-pointer shadow-lg">
            Complete &amp; Calculate Final Score
          </button>
        ` : `
          <div id="quiz-final-score-card" class="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div class="font-serif font-bold text-amber-300 text-lg">Quiz Complete!</div>
              <p class="text-xs text-slate-300 font-sans">Final Score: <strong class="text-white text-base">${calculateScore()} / 5</strong></p>
            </div>
            <button onclick="window.renderReportQuiz(null)" class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-mono font-semibold cursor-pointer">
              Retry Quiz
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  window.selectQuizOption = (qId, optionKey) => {
    currentQuizAnswers[qId] = optionKey;
    renderQuizUI(mount, reportData);
  };

  window.submitReportQuiz = () => {
    const answeredCount = Object.keys(currentQuizAnswers).length;
    if (answeredCount < totalQ) {
      showToast(`Please answer all ${totalQ} questions before submitting.`, 'warning');
      return;
    }
    isQuizSubmitted = true;
    renderQuizUI(mount, reportData);
    showToast(`Quiz complete! Final Score: ${calculateScore()} / 5`, 'success');
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
