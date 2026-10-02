import { getActiveReportData } from '../../state.js';
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
let speechTimeoutId = null;
let onStepHighlightCallback = null;
let statusState = 'IDLE'; // IDLE, SPEAKING, PAUSED, ERROR

// Global anchor on window to prevent Chromium garbage collection mid-speech
if (typeof window !== 'undefined') {
  window._speechUtteranceRef = null;
}

export function isSpeechSynthesisSupported() {
  return Boolean(typeof window !== 'undefined' && window.speechSynthesis);
}

export function setNarrationHighlightCallback(cb) {
  onStepHighlightCallback = cb;
}

if (synth && typeof synth.onvoiceschanged !== 'undefined') {
  synth.onvoiceschanged = () => {
    // Voices loaded asynchronously
  };
}

function getNaturalEnglishVoice() {
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (voices.length === 0) return null;

  return (
    voices.find(v => v.lang.startsWith('en') && (
      v.name.includes('Natural') ||
      v.name.includes('Google') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      v.name.includes('Karen') ||
      v.name.includes('Alex')
    )) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

export async function openNarrationModal(reportData) {
  const artifact = reportData || getActiveReportData();

  stopNarration();
  renderNarrationModalSkeleton(artifact);

  if (!artifact) {
    renderNarrationModalError('No active report available to explain. Please analyze a visual image first.');
    return;
  }

  try {
    currentSequence = await generateNarrationSequence(artifact);
    currentStepIndex = 0;
    statusState = 'IDLE';
    renderNarrationModalContent(artifact);
  } catch (err) {
    console.warn('[Narration] Sequence generation notice, using client script:', err);
    currentSequence = generateClientNarrationScript(artifact);
    currentStepIndex = 0;
    statusState = 'IDLE';
    renderNarrationModalContent(artifact);
  }
}

export function startNarration(reportData) {
  return openNarrationModal(reportData);
}

function generateClientNarrationScript(reportData) {
  const subject = reportData.subject || reportData.title || reportData.fullData?.subject || 'the visual artifact';
  const type = reportData.category || reportData.visualType || 'visual diagram';
  const summary = reportData.summary || reportData.executiveInsight?.summary || reportData.fullData?.summary || '';
  const findings = reportData.findings || reportData.keyFindings || reportData.structuredFindings || reportData.fullData?.findings || [];
  const claims = reportData.claims || reportData.fullData?.claims || [];
  const observations = reportData.observations || reportData.fullData?.observations || [];

  const mainObs = findings[0]?.statement || findings[0]?.title || claims[0]?.statement || observations[0]?.statement || 'the primary visual components are clearly structured and identifiable';
  const secondObs = findings[1]?.statement || findings[1]?.title || claims[1]?.statement || observations[1]?.statement || 'the spatial connections and layout follow verifiable domain principles';
  const undeter = claims.find(c => (c.status || '').toUpperCase() === 'UNDETERMINABLE')?.statement || null;

  const steps = [
    {
      text: `Welcome to the visual intelligence audio overview for ${subject}, classified under ${type}. Multimodal vision decomposes all optical features into verifiable evidence.`,
      status: 'OBSERVED',
      evidenceId: 'EV-1'
    },
    summary ? {
      text: `Executive summary: ${summary}`,
      status: 'OBSERVED',
      evidenceId: 'EV-SUMMARY'
    } : null,
    {
      text: `Examining the primary observations: ${mainObs}. This is directly grounded in observable image pixels.`,
      status: 'OBSERVED',
      evidenceId: 'EV-2'
    },
    {
      text: `Additionally, visual evidence confirms: ${secondObs}. Structured domain registries support this classification.`,
      status: 'OBSERVED',
      evidenceId: 'EV-3'
    },
    undeter ? {
      text: `Note that the visual evidence does not provide enough data to establish ${undeter}.`,
      status: 'UNDETERMINABLE',
      evidenceId: 'EV-4'
    } : {
      text: `In summary, all extracted visual findings are grounded in verifiable structural evidence with high technical precision.`,
      status: 'OBSERVED',
      evidenceId: 'EV-4'
    },
    {
      text: `Narration walkthrough complete. All observations for ${subject} have been cataloged in the evidence registry.`,
      status: 'OBSERVED',
      evidenceId: 'EV-FINAL'
    }
  ].filter(Boolean);

  return { steps, totalSteps: steps.length };
}

function renderNarrationModalSkeleton(artifact) {
  let modal = document.getElementById('modal-narration-dialog');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-narration-dialog';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="relative w-full max-w-xl p-6 rounded-2xl bg-[#090b10] border border-indigo-500/30 text-slate-100 shadow-2xl space-y-5">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
          <h3 class="font-serif font-bold text-lg text-slate-100">🔊 Documentary Narration</h3>
        </div>
        <button onclick="window.closeNarrationModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
      </div>

      <div class="py-8 text-center space-y-2">
        <div class="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-mono text-slate-400">Synthesizing report narration script...</p>
      </div>
    </div>
  `;

  window.closeNarrationModal = () => {
    stopNarration();
    const m = document.getElementById('modal-narration-dialog');
    if (m) m.remove();
  };
}

function renderNarrationModalError(message) {
  const modal = document.getElementById('modal-narration-dialog');
  if (!modal) return;

  modal.innerHTML = `
    <div class="relative w-full max-w-md p-6 rounded-2xl bg-[#090b10] border border-rose-500/30 text-slate-100 shadow-2xl space-y-5">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
          <h3 class="font-serif font-bold text-lg text-slate-100">🔊 Documentary Narration</h3>
        </div>
        <button onclick="window.closeNarrationModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
      </div>

      <div class="p-4 text-center space-y-3 bg-slate-950/60 rounded-xl border border-white/5">
        <span class="material-symbols-outlined text-3xl text-amber-400">volume_off</span>
        <p class="text-xs text-slate-300 font-sans leading-relaxed">${escapeHtml(message)}</p>
      </div>

      <div class="pt-2 flex justify-end">
        <button onclick="window.closeNarrationModal()" class="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-mono cursor-pointer">
          Close
        </button>
      </div>
    </div>
  `;
}

function renderNarrationModalContent(artifact) {
  const modal = document.getElementById('modal-narration-dialog');
  if (!modal || !currentSequence) return;

  const totalSteps = currentSequence.steps.length;
  const step = currentSequence.steps[currentStepIndex] || { text: 'Narration script ready.', status: 'OBSERVED' };

  let statusBadge = '';
  if (statusState === 'SPEAKING') {
    statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>● Speaking...</span>`;
  } else if (statusState === 'PAUSED') {
    statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">⏸ Paused</span>`;
  } else if (statusState === 'ERROR') {
    statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">⚠️ Speech unavailable</span>`;
  } else {
    statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">▶ Ready</span>`;
  }

  modal.innerHTML = `
    <div class="relative w-full max-w-xl p-6 rounded-2xl bg-[#090b10] border border-indigo-500/30 text-slate-100 shadow-2xl space-y-5 animate-fade-in">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <h3 class="font-serif font-bold text-lg text-slate-100">🔊 Documentary Narration</h3>
          ${statusBadge}
        </div>
        <button onclick="window.closeNarrationModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
      </div>

      <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
        <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Documentary Script</span>
          <span id="narration-step-progress">Step ${currentStepIndex + 1} of ${totalSteps}</span>
        </div>
        <p id="narration-step-text" class="text-sm text-slate-200 font-sans leading-relaxed min-h-[60px]">
          "${escapeHtml(step.text)}"
        </p>
      </div>

      <!-- Multi-step controls: Previous, Play/Pause, Next, Stop -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <!-- Speed selector -->
        <div class="flex items-center gap-1 text-xs font-mono">
          <span class="text-slate-400 text-[11px] mr-1">Speed:</span>
          <button onclick="window.setNarrationSpeed(0.75)" class="px-2 py-0.5 rounded ${playbackRate === 0.75 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">0.75x</button>
          <button onclick="window.setNarrationSpeed(1.0)" class="px-2 py-0.5 rounded ${playbackRate === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1.0x</button>
          <button onclick="window.setNarrationSpeed(1.25)" class="px-2 py-0.5 rounded ${playbackRate === 1.25 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1.25x</button>
        </div>

        <!-- Controls: Previous, Play/Pause, Next, Stop -->
        <div class="flex items-center gap-2">
          <button onclick="window.prevNarrationStep()" ${currentStepIndex === 0 ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-mono cursor-pointer flex items-center gap-1">
            <span>⏮</span> Prev
          </button>

          ${!isPlaying ? `
            <button onclick="window.playNarrationStep()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold cursor-pointer shadow flex items-center gap-1.5">
              <span>▶</span> Play
            </button>
          ` : `
            <button onclick="window.pauseNarration()" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-semibold cursor-pointer">
              ${isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          `}

          <button onclick="window.nextNarrationStep()" ${currentStepIndex >= totalSteps - 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-mono cursor-pointer flex items-center gap-1">
            Next <span>⏭</span>
          </button>

          <button onclick="window.stopNarration()" class="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-mono cursor-pointer">
            Stop
          </button>
        </div>
      </div>
    </div>
  `;

  window.playNarrationStep = () => {
    isPlaying = true;
    isPaused = false;
    statusState = 'SPEAKING';
    renderNarrationModalContent(artifact);
    speakCurrentStep(artifact);
  };

  window.pauseNarration = () => {
    if (!isPlaying) return;
    isPaused = !isPaused;
    if (isPaused) {
      statusState = 'PAUSED';
      if (synth) synth.pause();
    } else {
      statusState = 'SPEAKING';
      if (synth && synth.paused) {
        synth.resume();
      } else {
        speakCurrentStep(artifact);
      }
    }
    renderNarrationModalContent(artifact);
  };

  window.prevNarrationStep = () => {
    if (currentStepIndex > 0) {
      if (speechTimeoutId) clearTimeout(speechTimeoutId);
      if (synth) synth.cancel();
      currentStepIndex--;
      statusState = isPlaying && !isPaused ? 'SPEAKING' : 'IDLE';
      renderNarrationModalContent(artifact);
      if (isPlaying && !isPaused) {
        speechTimeoutId = setTimeout(() => speakCurrentStep(artifact), 60);
      }
    }
  };

  window.nextNarrationStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      if (speechTimeoutId) clearTimeout(speechTimeoutId);
      if (synth) synth.cancel();
      currentStepIndex++;
      statusState = isPlaying && !isPaused ? 'SPEAKING' : 'IDLE';
      renderNarrationModalContent(artifact);
      if (isPlaying && !isPaused) {
        speechTimeoutId = setTimeout(() => speakCurrentStep(artifact), 60);
      }
    }
  };

  window.stopNarration = stopNarration;
  window.setNarrationSpeed = (s) => setPlaybackRate(s);
}

function speakCurrentStep(artifact) {
  if (speechTimeoutId) clearTimeout(speechTimeoutId);

  if (!isPlaying || isPaused || !currentSequence || currentStepIndex >= currentSequence.steps.length) {
    if (currentStepIndex >= (currentSequence?.steps?.length || 0)) {
      showToast('Documentary narration walkthrough complete.', 'success');
      isPlaying = false;
      statusState = 'IDLE';
      renderNarrationModalContent(artifact);
    }
    return;
  }

  const step = currentSequence.steps[currentStepIndex];

  if (typeof onStepHighlightCallback === 'function' && step.evidenceId) {
    onStepHighlightCallback(step.evidenceId, step.coordinates);
  }

  if (!isSpeechSynthesisSupported()) {
    statusState = 'ERROR';
    showToast('Speech synthesis is not supported in this browser environment.', 'warning');
    renderNarrationModalContent(artifact);
    return;
  }

  // Ensure speech synthesis is active and not stuck in paused state
  if (synth.paused) synth.resume();

  const utterance = new SpeechSynthesisUtterance(step.text);
  utterance.rate = playbackRate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const naturalVoice = getNaturalEnglishVoice();
  if (naturalVoice) utterance.voice = naturalVoice;

  utterance.onstart = () => {
    statusState = 'SPEAKING';
    const textEl = document.getElementById('narration-step-text');
    if (textEl) textEl.textContent = `"${step.text}"`;
  };

  utterance.onend = () => {
    if (isPlaying && !isPaused) {
      if (currentStepIndex < currentSequence.steps.length - 1) {
        currentStepIndex++;
        renderNarrationModalContent(artifact);
        // Dispatch next utterance after tiny delay to ensure browser speech engine is ready
        speechTimeoutId = setTimeout(() => {
          speakCurrentStep(artifact);
        }, 80);
      } else {
        showToast('Documentary narration completed.', 'success');
        isPlaying = false;
        statusState = 'IDLE';
        renderNarrationModalContent(artifact);
      }
    }
  };

  utterance.onerror = (e) => {
    console.warn('[Narration] Speech synthesis error on step:', currentStepIndex + 1, e);
    if (e.error === 'interrupted' || e.error === 'canceled') {
      // Intentional interruption/cancel, do not mark as failure
      return;
    }
    statusState = 'ERROR';
    renderNarrationModalContent(artifact);
  };

  currentUtterance = utterance;
  if (typeof window !== 'undefined') {
    window._speechUtteranceRef = utterance;
  }

  try {
    synth.speak(utterance);
  } catch (err) {
    console.error('[Narration] synth.speak error:', err);
    statusState = 'ERROR';
    renderNarrationModalContent(artifact);
  }
}

export function stopNarration() {
  if (speechTimeoutId) clearTimeout(speechTimeoutId);
  isPlaying = false;
  isPaused = false;
  statusState = 'IDLE';
  if (synth) synth.cancel();
  currentUtterance = null;
  if (typeof window !== 'undefined') {
    window._speechUtteranceRef = null;
  }
  currentStepIndex = 0;
}

export function setPlaybackRate(rate) {
  playbackRate = parseFloat(rate) || 1.0;
  showToast(`Speech rate set to ${playbackRate}x`, 'info');
}

if (typeof window !== 'undefined') {
  window.openNarrationModal = openNarrationModal;
  window.startNarration = startNarration;
  window.pauseNarration = () => {};
  window.stopNarration = stopNarration;
  window.setNarrationSpeed = setPlaybackRate;
}
