import { sendLiveVisionFrame } from '../../services/visualIntelligenceApi.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';

let stream = null;
let videoElement = null;
let canvasElement = null;
let isAnalyzing = false;
let isPaused = false;
let analysisTimer = null;
let currentFacingMode = 'environment'; // 'environment' (rear mobile) or 'user' (webcam)
let lastAnalyzedTime = null;
let activeObservation = null;
let frameCounter = 0;

export function isLiveVisionSupported() {
  return Boolean(navigator?.mediaDevices?.getUserMedia);
}

export function openLiveVisionModal() {
  let modal = document.getElementById('modal-live-vision');
  if (!modal) {
    createLiveVisionModalDom();
    modal = document.getElementById('modal-live-vision');
  }
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  startCamera();
}

export function closeLiveVisionModal() {
  stopLiveVision();
  const modal = document.getElementById('modal-live-vision');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export async function startCamera() {
  if (!isLiveVisionSupported()) {
    showToast('Live Vision is unavailable in this browser/device. You can still use image upload.', 'warning');
    renderCameraError('Live Vision is unavailable in this browser/device. Camera API (getUserMedia) not supported.');
    return;
  }

  stopTracks();

  const statusBadge = document.getElementById('live-vision-status');
  const video = document.getElementById('live-vision-video');
  if (!video) return;
  videoElement = video;

  if (statusBadge) {
    statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Connecting Camera...`;
    statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5';
  }

  try {
    const constraints = {
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();

    isPaused = false;
    if (statusBadge) {
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Vision Connected`;
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5';
    }

    startAnalysisLoop();
  } catch (err) {
    console.error('[LiveVision] Camera error:', err);
    let errorMsg = 'Failed to access camera.';
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMsg = 'Camera access denied by user. Please grant camera permissions to use Live Vision.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMsg = 'No camera hardware found on this device.';
    }
    showToast(errorMsg, 'error');
    renderCameraError(errorMsg);
  }
}

export function pauseLiveVision() {
  isPaused = !isPaused;
  const pauseBtn = document.getElementById('live-vision-pause-btn');
  const statusBadge = document.getElementById('live-vision-status');

  if (isPaused) {
    if (pauseBtn) pauseBtn.innerText = 'Resume';
    if (statusBadge) {
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> Live Vision Paused`;
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5';
    }
  } else {
    if (pauseBtn) pauseBtn.innerText = 'Pause';
    if (statusBadge) {
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Vision Connected`;
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5';
    }
  }
}

export function stopLiveVision() {
  if (analysisTimer) {
    clearInterval(analysisTimer);
    analysisTimer = null;
  }
  stopTracks();
  isAnalyzing = false;
  isPaused = false;
}

function stopTracks() {
  if (stream) {
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (e) {}
    });
    stream = null;
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
}

function startAnalysisLoop() {
  if (analysisTimer) clearInterval(analysisTimer);
  analysisTimer = setInterval(() => {
    if (!isPaused && !isAnalyzing) {
      captureAndAnalyzeFrame();
    }
  }, 1200); // 1.2s adaptive frame rate
}

async function captureAndAnalyzeFrame() {
  if (!videoElement || videoElement.readyState < 2 || isPaused) return;

  if (!canvasElement) {
    canvasElement = document.createElement('canvas');
  }

  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  canvasElement.width = width;
  canvasElement.height = height;

  const ctx = canvasElement.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, width, height);

  const imageDataUrl = canvasElement.toDataURL('image/jpeg', 0.6);
  frameCounter++;
  isAnalyzing = true;

  const telemetry = document.getElementById('live-vision-telemetry');
  if (telemetry) {
    telemetry.innerText = `Analyzing frame #${frameCounter}...`;
  }

  try {
    const result = await sendLiveVisionFrame({
      imageDataUrl,
      timestamp: Date.now(),
      frameIndex: frameCounter,
      cameraFacing: currentFacingMode
    });

    lastAnalyzedTime = Date.now();
    activeObservation = result;
    renderObservationOverlay(result, width, height);

    if (telemetry) {
      telemetry.innerText = `Last analyzed: Just now (${result.latencyMs}ms) • ${result.visualType || 'Scene'}`;
    }
  } catch (err) {
    if (telemetry) {
      telemetry.innerText = `Frame analysis notice: ${err.message}`;
    }
  } finally {
    isAnalyzing = false;
  }
}

function renderObservationOverlay(result, width, height) {
  const overlaySvg = document.getElementById('live-vision-overlay-svg');
  const detailsPanel = document.getElementById('live-vision-details');
  if (!overlaySvg) return;

  const regions = result.evidenceRegions || [];
  overlaySvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  overlaySvg.innerHTML = regions.map((r, idx) => {
    const coords = r.coordinates || { x: 0.1, y: 0.1, width: 0.4, height: 0.3 };
    const rx = coords.x * width;
    const ry = coords.y * height;
    const rw = coords.width * width;
    const rh = coords.height * height;

    return `
      <g class="cursor-pointer group" onclick="window.selectLiveVisionRegion('${escapeHtml(r.id)}')">
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" 
              fill="rgba(99, 102, 241, 0.1)" stroke="#818cf8" stroke-width="2" stroke-dasharray="4" rx="4"
              class="transition-all hover:fill-indigo-500/20 hover:stroke-indigo-400" />
        <rect x="${rx}" y="${Math.max(0, ry - 22)}" width="${Math.min(rw, 140)}" height="20" fill="#1e1b4b" rx="3" />
        <text x="${rx + 6}" y="${Math.max(14, ry - 8)}" fill="#c7d2fe" font-size="11" font-family="monospace" font-weight="bold">
          ${escapeHtml(r.label || `Region ${idx + 1}`)}
        </text>
      </g>
    `;
  }).join('');

  if (detailsPanel) {
    detailsPanel.innerHTML = `
      <div class="space-y-3 animate-fade-in">
        <div class="flex items-center justify-between pb-2 border-b border-white/5">
          <span class="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Live Observations</span>
          <span class="text-[10px] font-mono text-slate-400">${regions.length} Active Regions</span>
        </div>
        <p class="text-xs text-slate-200 font-sans leading-relaxed">${escapeHtml(result.observation || 'Scene tracked.')}</p>
        <div class="space-y-1.5">
          ${regions.map(r => `
            <div class="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
              <span class="font-serif font-bold text-slate-300">${escapeHtml(r.label)}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.status === 'OBSERVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'}">
                ${escapeHtml(r.status)}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function renderCameraError(message) {
  const container = document.getElementById('live-vision-feed-container');
  if (!container) return;
  container.innerHTML = `
    <div class="w-full h-72 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/80 rounded-2xl border border-rose-500/20">
      <svg class="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      <div class="text-xs font-mono font-bold text-rose-300">Camera Feed Notice</div>
      <p class="text-xs text-slate-400 max-w-sm">${escapeHtml(message)}</p>
      <button onclick="window.closeLiveVisionModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono cursor-pointer">
        Return to Workspace
      </button>
    </div>
  `;
}

function createLiveVisionModalDom() {
  const modal = document.createElement('div');
  modal.id = 'modal-live-vision';
  modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-[#0b0e14] border border-white/10 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <h3 class="font-serif font-bold text-slate-100 text-lg">Live Vision</h3>
            <p class="text-[11px] font-mono text-slate-400">Continuous real-time evidence-grounded visual observation</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span id="live-vision-status" class="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-white/5 flex items-center gap-1.5">
            Initializing...
          </span>
          <button onclick="window.closeLiveVisionModal()" class="text-slate-400 hover:text-white text-xl px-2 cursor-pointer">&times;</button>
        </div>
      </div>

      <!-- Main Layout: Feed Left, Observations Right -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow min-h-0 overflow-y-auto">
        <div id="live-vision-feed-container" class="md:col-span-2 relative bg-black/60 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[320px]">
          <video id="live-vision-video" playsinline muted class="w-full h-full object-contain"></video>
          <svg id="live-vision-overlay-svg" class="absolute inset-0 w-full h-full pointer-events-auto"></svg>
        </div>

        <!-- Details Panel -->
        <div id="live-vision-details" class="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3 overflow-y-auto max-h-[380px]">
          <div class="text-xs font-mono text-slate-500 text-center py-8">Analyzing scene telemetry...</div>
        </div>
      </div>

      <!-- Footer Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
        <div id="live-vision-telemetry" class="text-xs font-mono text-slate-400">
          Ready
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.toggleCameraFacing()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Switch Camera
          </button>
          <button id="live-vision-pause-btn" onclick="window.pauseLiveVision()" class="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono cursor-pointer">
            Pause
          </button>
          <button onclick="window.closeLiveVisionModal()" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  window.closeLiveVisionModal = closeLiveVisionModal;
  window.pauseLiveVision = pauseLiveVision;
  window.toggleCameraFacing = () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    showToast(`Switched camera to: ${currentFacingMode === 'environment' ? 'Rear / Environment' : 'Front / Webcam'}`, 'info');
    startCamera();
  };
  window.selectLiveVisionRegion = (regId) => {
    showToast(`Inspecting Live Region: ${regId}`, 'info');
  };
}
