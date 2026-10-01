import { generateNarrationSequence } from '../../services/visualIntelligenceApi.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let isPlaying = false;
let isPaused = false;
let currentSequence = null;
let currentStepIndex = 0;
let playbackRate = 1.0;
let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let onStepHighlightCallback = null;

export function isSpeechSynthesisSupported() {
  return Boolean(typeof window !== 'undefined' && window.speechSynthesis);
}

export function setNarrationHighlightCallback(cb) {
  onStepHighlightCallback = cb;
}

export async function startNarration(reportData) {
  if (!reportData) {
    showToast('Open an analysis with evidence-backed findings to begin narration.', 'warning');
    return;
  }

  stopNarration();

  showToast('Preparing evidence-grounded narration sequence...', 'info');
  try {
    currentSequence = await generateNarrationSequence(reportData);
    currentStepIndex = 0;
    isPlaying = true;
    isPaused = false;

    renderNarrationPlayerBar();
    playNextStep();
  } catch (err) {
    console.error('[Narration] Error generating sequence:', err);
    showToast(`Narration notice: ${err.message}`, 'error');
  }
}

function playNextStep() {
  if (!isPlaying || isPaused || !currentSequence || currentStepIndex >= currentSequence.steps.length) {
    if (currentStepIndex >= (currentSequence?.steps?.length || 0)) {
      finishNarration();
    }
    return;
  }

  const step = currentSequence.steps[currentStepIndex];
  updatePlayerUI(step);

  // Trigger region highlight on visual canvas
  if (typeof onStepHighlightCallback === 'function' && step.evidenceId) {
    onStepHighlightCallback(step.evidenceId, step.coordinates);
  } else if (typeof window.handleSelectEvidenceRegion === 'function' && step.evidenceId) {
    window.handleSelectEvidenceRegion(step.evidenceId);
  }

  if (!isSpeechSynthesisSupported()) {
    // Visual-only simulation if SpeechSynthesis is disabled/unavailable
    setTimeout(() => {
      if (isPlaying && !isPaused) {
        currentStepIndex++;
        playNextStep();
      }
    }, 4000);
    return;
  }

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(step.text);
  utterance.rate = playbackRate;
  utterance.pitch = 1.0;

  const voices = synth.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
  if (naturalVoice) utterance.voice = naturalVoice;

  utterance.onend = () => {
    if (isPlaying && !isPaused) {
      currentStepIndex++;
      playNextStep();
    }
  };

  utterance.onerror = (e) => {
    console.warn('[Narration] Speech error, advancing step:', e);
    if (isPlaying && !isPaused) {
      currentStepIndex++;
      setTimeout(playNextStep, 500);
    }
  };

  currentUtterance = utterance;
  synth.speak(utterance);
}

export function pauseNarration() {
  if (!isPlaying) return;
  isPaused = !isPaused;
  if (isPaused) {
    if (synth) synth.pause();
    showToast('Narration Paused', 'info');
  } else {
    if (synth) synth.resume();
    showToast('Narration Resumed', 'info');
    if (synth && !synth.speaking) {
      playNextStep();
    }
  }
  renderNarrationPlayerBar();
}

export function stopNarration() {
  isPlaying = false;
  isPaused = false;
  if (synth) synth.cancel();
  currentUtterance = null;
  currentStepIndex = 0;
  const bar = document.getElementById('narration-player-bar');
  if (bar) bar.remove();

  if (typeof onStepHighlightCallback === 'function') {
    onStepHighlightCallback(null, null);
  }
}

function finishNarration() {
  showToast('Evidence narration walkthrough complete.', 'success');
  stopNarration();
}

export function setPlaybackRate(rate) {
  playbackRate = parseFloat(rate) || 1.0;
  showToast(`Narration speed set to ${playbackRate}x`, 'info');
  if (isPlaying && !isPaused) {
    playNextStep(); // restart current step with new rate
  }
}

function updatePlayerUI(step) {
  const stepTextEl = document.getElementById('narration-step-text');
  const stepProgressEl = document.getElementById('narration-step-progress');
  const stepBadgeEl = document.getElementById('narration-step-badge');

  if (stepTextEl) stepTextEl.innerText = step.text;
  if (stepProgressEl && currentSequence) {
    stepProgressEl.innerText = `Step ${currentStepIndex + 1} of ${currentSequence.steps.length}`;
  }
  if (stepBadgeEl) {
    stepBadgeEl.innerText = step.status || 'OBSERVED';
    stepBadgeEl.className = `px-2 py-0.5 rounded text-[10px] font-mono font-bold ${step.status === 'OBSERVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (step.status === 'UNDETERMINABLE' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-300')}`;
  }
}

function renderNarrationPlayerBar() {
  let bar = document.getElementById('narration-player-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'narration-player-bar';
    bar.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#090b10]/95 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-2xl w-[92%] flex flex-col gap-3 animate-fade-in';
    document.body.appendChild(bar);
  }

  const step = currentSequence?.steps[currentStepIndex] || { text: 'Starting narration...', status: 'OBSERVED' };

  bar.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-white/5">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}"></span>
        <span class="font-serif font-bold text-slate-100 text-xs">Spoken Evidence Narration</span>
        <span id="narration-step-badge" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ${escapeHtml(step.status || 'OBSERVED')}
        </span>
      </div>
      <span id="narration-step-progress" class="text-[11px] font-mono text-slate-400">
        Step ${currentStepIndex + 1} of ${currentSequence?.steps?.length || 1}
      </span>
    </div>

    <p id="narration-step-text" class="text-xs text-slate-200 font-sans leading-relaxed line-clamp-2 min-h-[32px]">
      ${escapeHtml(step.text)}
    </p>

    <div class="flex items-center justify-between gap-3 pt-1">
      <!-- Speed selector -->
      <div class="flex items-center gap-1.5 text-xs font-mono">
        <span class="text-slate-400 text-[11px]">Speed:</span>
        <button onclick="window.setNarrationSpeed(0.75)" class="px-2 py-0.5 rounded ${playbackRate === 0.75 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">0.75x</button>
        <button onclick="window.setNarrationSpeed(1.0)" class="px-2 py-0.5 rounded ${playbackRate === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1x</button>
        <button onclick="window.setNarrationSpeed(1.25)" class="px-2 py-0.5 rounded ${playbackRate === 1.25 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1.25x</button>
        <button onclick="window.setNarrationSpeed(1.5)" class="px-2 py-0.5 rounded ${playbackRate === 1.5 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1.5x</button>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <button onclick="window.pauseNarration()" class="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono cursor-pointer">
          ${isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onclick="window.stopNarration()" class="px-3 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-mono cursor-pointer">
          Stop
        </button>
      </div>
    </div>
  `;

  window.pauseNarration = pauseNarration;
  window.stopNarration = stopNarration;
  window.setNarrationSpeed = (s) => setPlaybackRate(s);
}
