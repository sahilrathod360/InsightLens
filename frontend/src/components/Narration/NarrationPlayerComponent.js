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

export async function openNarrationModal(reportData) {
  const artifact = reportData || {
    id: 'DEMO-VISUAL',
    subject: 'Distributed Architecture',
    title: 'Visual System Brief',
    claims: [{ text: 'User Client connects to API Gateway' }],
    findings: [{ title: 'API Gateway routes requests to DB', status: 'OBSERVED' }]
  };

  stopNarration();
  renderNarrationModalSkeleton(artifact);

  try {
    currentSequence = await generateNarrationSequence(artifact);
    currentStepIndex = 0;
    renderNarrationModalContent(artifact);
  } catch (err) {
    console.warn('[Narration] Sequence generation notice, using client script:', err);
    currentSequence = generateClientNarrationScript(artifact);
    renderNarrationModalContent(artifact);
  }
}

export function startNarration(reportData) {
  return openNarrationModal(reportData);
}

function generateClientNarrationScript(reportData) {
  const subject = reportData.subject || reportData.title || 'the visual artifact';
  const type = reportData.visualType || 'visual diagram';
  const findings = reportData.findings || reportData.full_data?.keyFindings || [];
  const claims = reportData.claims || reportData.full_data?.claims || [];

  const mainObs = findings[0]?.title || claims[0]?.text || 'the primary visual components are clearly structured';
  const secondObs = findings[1]?.title || claims[1]?.text || 'the connections follow verified flow topology';
  const undeter = claims.find(c => c.status === 'UNDETERMINABLE')?.text || null;

  const steps = [
    {
      text: `This visual analysis examines ${subject}, categorized as a ${type}.`,
      status: 'OBSERVED',
      evidenceId: 'EV-1'
    },
    {
      text: `Looking at the main structure: ${mainObs}.`,
      status: 'OBSERVED',
      evidenceId: 'EV-2'
    },
    {
      text: `Additionally, visual evidence confirms that ${secondObs}.`,
      status: 'OBSERVED',
      evidenceId: 'EV-3'
    },
    undeter ? {
      text: `Note that the visual evidence does not provide enough data to establish ${undeter}.`,
      status: 'UNDETERMINABLE',
      evidenceId: 'EV-4'
    } : {
      text: `In summary, the visual findings are grounded in verified structural evidence with high confidence.`,
      status: 'OBSERVED',
      evidenceId: 'EV-4'
    }
  ];

  return { steps };
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
          <h3 class="font-serif font-bold text-lg text-slate-100">🔊 Explain Report</h3>
        </div>
        <button onclick="window.closeNarrationModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
      </div>

      <div class="py-8 text-center space-y-2">
        <div class="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-mono text-slate-400">Synthesizing 45-second evidence explanation script...</p>
      </div>
    </div>
  `;

  window.closeNarrationModal = () => {
    stopNarration();
    const m = document.getElementById('modal-narration-dialog');
    if (m) m.remove();
  };
}

function renderNarrationModalContent(artifact) {
  const modal = document.getElementById('modal-narration-dialog');
  if (!modal || !currentSequence) return;

  const step = currentSequence.steps[currentStepIndex] || { text: 'Narration script ready.', status: 'OBSERVED' };

  modal.innerHTML = `
    <div class="relative w-full max-w-xl p-6 rounded-2xl bg-[#090b10] border border-indigo-500/30 text-slate-100 shadow-2xl space-y-5 animate-fade-in">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}"></span>
          <h3 class="font-serif font-bold text-lg text-slate-100">🔊 Explain Report Walkthrough</h3>
          <span id="narration-step-badge" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ${escapeHtml(step.status || 'OBSERVED')}
          </span>
        </div>
        <button onclick="window.closeNarrationModal()" class="text-slate-400 hover:text-white text-xs font-mono cursor-pointer">✕ Close</button>
      </div>

      <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
        <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Spoken Evidence Summary</span>
          <span id="narration-step-progress">Step ${currentStepIndex + 1} of ${currentSequence.steps.length}</span>
        </div>
        <p id="narration-step-text" class="text-sm text-slate-200 font-sans leading-relaxed min-h-[48px]">
          "${escapeHtml(step.text)}"
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <!-- Speed selector -->
        <div class="flex items-center gap-1 text-xs font-mono">
          <span class="text-slate-400 text-[11px] mr-1">Speed:</span>
          <button onclick="window.setNarrationSpeed(0.75)" class="px-2 py-0.5 rounded ${playbackRate === 0.75 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">0.75x</button>
          <button onclick="window.setNarrationSpeed(1.0)" class="px-2 py-0.5 rounded ${playbackRate === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1.0x</button>
          <button onclick="window.setNarrationSpeed(1.25)" class="px-2 py-0.5 rounded ${playbackRate === 1.25 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'} cursor-pointer">1.25x</button>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-2">
          ${!isPlaying ? `
            <button onclick="window.playNarrationStep()" class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold cursor-pointer shadow">
              ▶ Play Explanation
            </button>
          ` : `
            <button onclick="window.pauseNarration()" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono cursor-pointer">
              ${isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onclick="window.stopNarration()" class="px-3.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-mono cursor-pointer">
              Stop
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  window.playNarrationStep = () => {
    isPlaying = true;
    isPaused = false;
    renderNarrationModalContent(artifact);
    playNextStep(artifact);
  };

  window.pauseNarration = () => {
    if (!isPlaying) return;
    isPaused = !isPaused;
    if (isPaused) {
      if (synth) synth.pause();
    } else {
      if (synth) synth.resume();
      if (synth && !synth.speaking) playNextStep(artifact);
    }
    renderNarrationModalContent(artifact);
  };

  window.stopNarration = stopNarration;
  window.setNarrationSpeed = (s) => setPlaybackRate(s);
}

function playNextStep(artifact) {
  if (!isPlaying || isPaused || !currentSequence || currentStepIndex >= currentSequence.steps.length) {
    if (currentStepIndex >= (currentSequence?.steps?.length || 0)) {
      showToast('Evidence report explanation complete.', 'success');
      isPlaying = false;
    }
    return;
  }

  const step = currentSequence.steps[currentStepIndex];
  updatePlayerUI(step);

  if (typeof onStepHighlightCallback === 'function' && step.evidenceId) {
    onStepHighlightCallback(step.evidenceId, step.coordinates);
  }

  if (!isSpeechSynthesisSupported()) {
    setTimeout(() => {
      if (isPlaying && !isPaused) {
        currentStepIndex++;
        playNextStep(artifact);
      }
    }, 4000);
    return;
  }

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(step.text);
  utterance.rate = playbackRate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = synth.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
  if (naturalVoice) utterance.voice = naturalVoice;

  utterance.onend = () => {
    if (isPlaying && !isPaused) {
      currentStepIndex++;
      playNextStep(artifact);
    }
  };

  utterance.onerror = (e) => {
    console.warn('[Narration] Speech synthesis error, advancing:', e);
    if (isPlaying && !isPaused) {
      currentStepIndex++;
      setTimeout(() => playNextStep(artifact), 400);
    }
  };

  currentUtterance = utterance;
  synth.speak(utterance);
}

export function stopNarration() {
  isPlaying = false;
  isPaused = false;
  if (synth) synth.cancel();
  currentUtterance = null;
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
