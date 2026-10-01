import { evaluateUserGuess } from '../../services/visualIntelligenceApi.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let currentLockedGuess = null;
let currentEvaluationResult = null;

export function renderGuessMode(containerId, visualArtifact) {
  const mount = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!mount) return;

  if (!visualArtifact) {
    mount.innerHTML = `
      <div class="p-8 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-white/5">
        <svg class="w-10 h-10 mx-auto text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        <div class="font-serif font-bold text-slate-100 text-base">Guess Before You See</div>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Upload or load an image into the workspace to challenge your audience and predict findings before revealing InsightLens' analysis.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <h3 class="font-serif font-bold text-slate-100 text-lg">Guess Before You See</h3>
          <p class="text-xs text-slate-400">Hypothesize about the visual structure before revealing grounded AI findings.</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Interactive Demo Mode
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Input Form -->
        <div class="space-y-4 p-5 rounded-2xl bg-slate-950/60 border border-white/5">
          <div class="space-y-2">
            <label class="text-xs font-mono text-slate-300 block">1. What do you think this visual contains?</label>
            <input type="text" id="guess-input-target" placeholder="e.g. Microservices architecture with API Gateway and PostgreSQL" class="w-full bg-[#05060a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono text-slate-300 block">2. What specific interaction or claim are you predicting?</label>
            <textarea id="guess-input-interaction" rows="3" placeholder="e.g. Frontend client connects directly to database without authentication" class="w-full bg-[#05060a] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"></textarea>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button onclick="window.handleLockGuess()" class="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-semibold transition-all cursor-pointer">
              🔒 Lock My Guess &amp; Reveal InsightLens
            </button>
          </div>
        </div>

        <!-- Reveal & Comparison Output -->
        <div id="guess-comparison-mount" class="p-5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-center items-center text-center">
          <div class="text-xs font-mono text-slate-500">Lock your guess on the left to reveal comparative alignment with verified visual evidence.</div>
        </div>
      </div>
    </div>
  `;

  window.handleLockGuess = async () => {
    const target = document.getElementById('guess-input-target')?.value.trim() || '';
    const interaction = document.getElementById('guess-input-interaction')?.value.trim() || '';
    const fullGuess = `${target} ${interaction}`.trim();

    if (!fullGuess) {
      showToast('Please enter your prediction before locking guess.', 'warning');
      return;
    }

    currentLockedGuess = fullGuess;
    const compMount = document.getElementById('guess-comparison-mount');
    if (compMount) {
      compMount.innerHTML = `<div class="py-8 text-xs font-mono text-slate-400 animate-pulse">Evaluating guess against visual evidence...</div>`;
    }

    try {
      const result = await evaluateUserGuess(fullGuess, visualArtifact);
      currentEvaluationResult = result;
      renderGuessResult(compMount, result, fullGuess);
    } catch (err) {
      if (compMount) {
        compMount.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs font-mono">${escapeHtml(err.message)}</div>`;
      }
    }
  };
}

function renderGuessResult(mount, result, guessText) {
  if (!mount) return;

  const verdict = result.verdict || 'NOT SUPPORTED';
  const badgeClass = verdict === 'MATCHED'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : (verdict === 'PARTIALLY MATCHED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : (verdict === 'NOT ENOUGH EVIDENCE' ? 'bg-slate-800 text-slate-300 border-white/10' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'));

  mount.className = 'p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4 text-left animate-fade-in';
  mount.innerHTML = `
    <div class="flex items-center justify-between pb-3 border-b border-white/5">
      <span class="text-xs font-mono text-slate-400">Guess vs Grounded Evidence</span>
      <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${badgeClass}">
        ${escapeHtml(verdict)}
      </span>
    </div>

    <div class="space-y-2">
      <div class="text-[11px] font-mono text-slate-400">Your Locked Prediction:</div>
      <div class="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200 font-sans italic">
        "${escapeHtml(guessText)}"
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-[11px] font-mono text-slate-400">InsightLens Analysis Verdict:</div>
      <div class="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 font-sans">
        ${escapeHtml(result.rationale || 'Analysis complete.')}
      </div>
    </div>

    ${result.matchedElements && result.matchedElements.length > 0 ? `
      <div class="pt-2 border-t border-white/5 space-y-1.5">
        <span class="text-[11px] font-mono text-slate-400">Observed Matching Tokens:</span>
        <div class="flex flex-wrap gap-1.5">
          ${result.matchedElements.map(e => `
            <span class="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10 text-[10px] font-mono">
              ${escapeHtml(e)}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}
