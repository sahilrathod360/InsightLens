import { sendLiveVisionFrame } from '../services/visualIntelligenceApi.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/sanitize.js';

let liveStreamTrack = null;
let liveAnalysisInterval = null;
let isAnalyzingFrame = false;
let currentFrameRegions = [];
let currentFacingMode = 'environment';
let isLiveVisionPaused = false;

export function renderLiveVisionPage() {
  const container = document.getElementById('page-livevision');
  if (!container) return;

  container.innerHTML = `
    <div class="live-workspace px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
            <span class="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
            Real-Time Visual Discovery • Live Stream Camera
          </div>
          <h1 class="font-serif font-bold text-3xl text-slate-100 tracking-tight">
            Live Vision Discovery
          </h1>
          <p class="text-xs text-slate-400 font-sans">
            Point your camera at the real world and watch InsightLens discover, annotate, and evaluate visual evidence in real time.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button id="start-camera-btn" onclick="window.startLiveCameraStream()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs font-mono shadow-lg flex items-center gap-2 cursor-pointer transition-all">
            <span class="material-symbols-outlined text-[18px]">videocam</span>
            Start Camera
          </button>
          <button id="switch-camera-btn" onclick="window.switchLiveCameraStream()" class="hidden px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold text-xs font-mono flex items-center gap-2 cursor-pointer transition-all">
            <span class="material-symbols-outlined text-[18px]">flip_camera_ios</span>
            Switch Camera
          </button>
          <button id="pause-camera-btn" onclick="window.toggleLiveVisionPause()" class="hidden px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold text-xs font-mono flex items-center gap-2 cursor-pointer transition-all">
            <span class="material-symbols-outlined text-[18px]">pause</span>
            Pause
          </button>
          <button id="stop-camera-btn" onclick="window.stopLiveCameraStream()" class="hidden px-4 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-semibold text-xs font-mono flex items-center gap-2 cursor-pointer transition-all">
            <span class="material-symbols-outlined text-[18px]">videocam_off</span>
            Stop Camera
          </button>
        </div>
      </div>

      <!-- Main Camera Viewport Area -->
      <div class="live-camera-shell relative w-full rounded-2xl bg-black border border-purple-500/20 overflow-hidden shadow-2xl flex flex-col justify-center items-center">
        <!-- Error & Fallback Container -->
        <div id="live-camera-error-container" class="hidden p-6 max-w-md text-center space-y-4">
          <span id="live-camera-error-icon" class="material-symbols-outlined text-[48px] text-amber-400">videocam_off</span>
          <h3 id="live-camera-error-title" class="font-serif font-bold text-slate-100 text-lg">Camera Access Needed</h3>
          <p id="live-camera-error-desc" class="text-xs text-slate-300 font-sans leading-relaxed"></p>
          <div class="pt-2">
            <button onclick="window.startLiveCameraStream()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono cursor-pointer border border-white/10">
              🔄 Retry Camera Connection
            </button>
          </div>
        </div>

        <!-- Camera Placeholder State -->
        <div id="live-camera-placeholder" class="p-8 text-center space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-[36px] text-purple-400">photo_camera</span>
          </div>
          <div>
            <h3 class="font-serif font-bold text-slate-100 text-base">Camera Is Offline</h3>
            <p class="text-xs text-slate-400 font-sans max-w-sm mx-auto mt-1">
              Click <strong>Start Camera</strong> to launch your laptop webcam or mobile camera for real-time visual discovery.
            </p>
          </div>
        </div>

        <!-- Active Video Element & Overlay Stream Container -->
        <div id="live-video-wrapper" class="live-video-shell hidden relative w-full h-full flex items-center justify-center overflow-hidden">
          <video id="live-camera-feed" autoplay playsinline muted class="w-full h-full object-cover"></video>
          
          <!-- Live Real-Time Bounding Box Overlay Layer -->
          <div id="live-bounding-box-layer" class="absolute inset-0 pointer-events-auto">
            <!-- Bounding boxes rendered dynamically -->
          </div>

          <!-- Scanner Laser Effect -->
          <div class="scanner-laser pointer-events-none"></div>

          <!-- Top Status Bar Overlay -->
          <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-emerald-400">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE DISCOVERY ACTIVE
            </div>
            <div id="live-frame-latency" class="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
              Latency: --ms
            </div>
          </div>

          <!-- Floating Clickable Region Popover Mount -->
          <div id="live-region-popover" class="hidden absolute z-30 max-w-xs p-3.5 rounded-xl bg-slate-950/90 border border-purple-500/30 text-xs shadow-2xl backdrop-blur-md">
            <!-- Rendered on region click -->
          </div>
        </div>
      </div>

      <!-- Action Footer: Analyze This Scene -->
      <div id="live-scene-actions" class="hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/60 border border-purple-500/30">
        <div class="space-y-1">
          <span class="font-serif font-bold text-slate-100 text-sm">Scene ready for analysis</span>
          <p class="text-xs text-slate-400 font-sans">
            Capture the current frame and send it through the full visual intelligence pipeline.
          </p>
        </div>

        <button onclick="window.analyzeCurrentSceneFrame()" class="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold text-xs font-mono shadow-xl flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap">
          <span class="material-symbols-outlined text-[18px]">travel_explore</span>
          Analyze This Scene
        </button>
      </div>
    </div>
  `;

  setupLiveVisionEvents();
}

function setupLiveVisionEvents() {
  window.startLiveCameraStream = async (facingMode = null) => {
    if (facingMode) {
      currentFacingMode = facingMode;
    }

    const errorContainer = document.getElementById('live-camera-error-container');
    const placeholder = document.getElementById('live-camera-placeholder');
    const wrapper = document.getElementById('live-video-wrapper');
    const sceneActions = document.getElementById('live-scene-actions');
    const video = document.getElementById('live-camera-feed');
    const startBtn = document.getElementById('start-camera-btn');
    const switchBtn = document.getElementById('switch-camera-btn');
    const pauseBtn = document.getElementById('pause-camera-btn');
    const stopBtn = document.getElementById('stop-camera-btn');

    if (errorContainer) errorContainer.classList.add('hidden');

    // 1. Check Browser Media Devices & Secure Context Support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError(
        'Browser Unsupported',
        'Camera API (getUserMedia) is not available in your current browser context. Please use Chrome, Firefox, Safari, or Edge over HTTPS or localhost.'
      );
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      showCameraError(
        'Insecure Context',
        'Camera access requires a secure connection (HTTPS). Please open InsightLens over HTTPS.'
      );
      return;
    }

    showToast('Initializing camera stream...', 'info');

    // Detect mobile vs desktop camera options with facingMode toggle
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const videoConstraints = isMobile
      ? { video: { facingMode: { ideal: currentFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } }
      : { video: { facingMode: { ideal: currentFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } };

    try {
      if (liveStreamTrack) {
        liveStreamTrack.getTracks().forEach(track => track.stop());
        liveStreamTrack = null;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      } catch (errFirst) {
        console.warn('[LiveVision] Preferred constraints failed, falling back to basic video:', errFirst);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      liveStreamTrack = stream;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      placeholder?.classList.add('hidden');
      wrapper?.classList.remove('hidden');
      sceneActions?.classList.remove('hidden');
      startBtn?.classList.add('hidden');
      switchBtn?.classList.remove('hidden');
      pauseBtn?.classList.remove('hidden');
      stopBtn?.classList.remove('hidden');
      isLiveVisionPaused = false;
      updatePauseButton();

      showToast(`Camera active (${currentFacingMode}). Real-time visual discovery engaged.`, 'success');
      startLightweightFrameLoop();
    } catch (err) {
      console.error('[LiveVision] getUserMedia Error:', err);
      let errorTitle = 'Camera Access Failed';
      let errorDesc = err.message || 'Unable to access camera device.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorTitle = 'Camera Permission Denied';
        errorDesc = 'InsightLens needs camera permission to discover visual scenes. Please click the camera icon in your browser address bar and select "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorTitle = 'No Camera Found';
        errorDesc = 'No camera device was detected on your system. Please connect a webcam and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorTitle = 'Camera Already In Use';
        errorDesc = 'Your camera is currently being used by another application (e.g. Zoom, Teams, Meet). Please close that app and retry.';
      }

      showCameraError(errorTitle, errorDesc);
    }
  };

  window.switchLiveCameraStream = () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    showToast(`Switching camera to ${currentFacingMode}...`, 'info');
    window.startLiveCameraStream(currentFacingMode);
  };

  window.toggleLiveVisionPause = () => {
    const video = document.getElementById('live-camera-feed');
    if (!video || !liveStreamTrack) return;

    isLiveVisionPaused = !isLiveVisionPaused;
    if (isLiveVisionPaused) {
      video.pause();
      if (liveAnalysisInterval) {
        clearInterval(liveAnalysisInterval);
        liveAnalysisInterval = null;
      }
    } else {
      video.play().catch(() => {});
      startLightweightFrameLoop();
    }
    updatePauseButton();
  };

  window.stopLiveCameraStream = () => {
    if (liveAnalysisInterval) {
      clearInterval(liveAnalysisInterval);
      liveAnalysisInterval = null;
    }

    if (liveStreamTrack) {
      liveStreamTrack.getTracks().forEach(track => track.stop());
      liveStreamTrack = null;
    }

    const placeholder = document.getElementById('live-camera-placeholder');
    const wrapper = document.getElementById('live-video-wrapper');
    const sceneActions = document.getElementById('live-scene-actions');
    const startBtn = document.getElementById('start-camera-btn');
    const switchBtn = document.getElementById('switch-camera-btn');
    const pauseBtn = document.getElementById('pause-camera-btn');
    const stopBtn = document.getElementById('stop-camera-btn');

    wrapper?.classList.add('hidden');
    sceneActions?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
    startBtn?.classList.remove('hidden');
    switchBtn?.classList.add('hidden');
    pauseBtn?.classList.add('hidden');
    stopBtn?.classList.add('hidden');
    isLiveVisionPaused = false;

    showToast('Camera stream stopped.', 'info');
  };

  window.analyzeCurrentSceneFrame = async () => {
    const video = document.getElementById('live-camera-feed');
    if (!video || !video.videoWidth) {
      showToast('Camera feed is not ready.', 'warning');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    window.stopLiveCameraStream();

    showToast('Locking camera scene... Launching visual intelligence pipeline!', 'info');
    if (typeof window.startAnalysisWithDataUrl === 'function') {
      window.startAnalysisWithDataUrl(frameDataUrl);
    } else {
      if (typeof window.navigateTo === 'function') {
        window.navigateTo('desk');
      }
    }
  };
}

function updatePauseButton() {
  const button = document.getElementById('pause-camera-btn');
  if (!button) return;
  button.innerHTML = `<span class="material-symbols-outlined text-[18px]">${isLiveVisionPaused ? 'play_arrow' : 'pause'}</span>${isLiveVisionPaused ? 'Resume' : 'Pause'}`;
  button.setAttribute('aria-label', isLiveVisionPaused ? 'Resume live vision' : 'Pause live vision');
}

function showCameraError(title, desc) {
  const container = document.getElementById('live-camera-error-container');
  const titleEl = document.getElementById('live-camera-error-title');
  const descEl = document.getElementById('live-camera-error-desc');
  const placeholder = document.getElementById('live-camera-placeholder');
  const wrapper = document.getElementById('live-video-wrapper');

  if (titleEl) titleEl.innerText = title;
  if (descEl) descEl.innerText = desc;
  placeholder?.classList.add('hidden');
  wrapper?.classList.add('hidden');
  container?.classList.remove('hidden');
}

function startLightweightFrameLoop() {
  if (liveAnalysisInterval) clearInterval(liveAnalysisInterval);

  liveAnalysisInterval = setInterval(async () => {
    if (isAnalyzingFrame) return;

    const video = document.getElementById('live-camera-feed');
    if (!video || !video.videoWidth || video.paused) return;

    isAnalyzingFrame = true;
    const startTime = performance.now();

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbUrl = canvas.toDataURL('image/jpeg', 0.6);

      const data = await sendLiveVisionFrame({ imageFrame: thumbUrl });
      const latency = Math.round(performance.now() - startTime);

      const latEl = document.getElementById('live-frame-latency');
      if (latEl) latEl.innerText = `Latency: ${latency}ms`;

      if (data && data.regions) {
        currentFrameRegions = data.regions;
        renderLiveBoundingBoxes(data.regions);
      }
    } catch (err) {
      console.warn('[LiveVision] Frame analysis notice:', err.message);
    } finally {
      isAnalyzingFrame = false;
    }
  }, 2500);
}

function getVideoDisplayRect(video) {
  if (!video || !video.videoWidth || !video.videoHeight) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const container = video.parentElement;
  if (!container) return { left: 0, top: 0, width: video.clientWidth || 640, height: video.clientHeight || 480 };

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  const containerAspect = containerWidth / containerHeight;
  const videoAspect = videoWidth / videoHeight;

  let renderWidth, renderHeight, offsetLeft, offsetTop;

  // object-cover calculation
  if (containerAspect > videoAspect) {
    renderWidth = containerWidth;
    renderHeight = containerWidth / videoAspect;
    offsetLeft = 0;
    offsetTop = (containerHeight - renderHeight) / 2;
  } else {
    renderWidth = containerHeight * videoAspect;
    renderHeight = containerHeight;
    offsetLeft = (containerWidth - renderWidth) / 2;
    offsetTop = 0;
  }

  return { left: offsetLeft, top: offsetTop, width: renderWidth, height: renderHeight };
}

function renderLiveBoundingBoxes(regions = []) {
  const layer = document.getElementById('live-bounding-box-layer');
  const video = document.getElementById('live-camera-feed');
  if (!layer || !video) return;

  const rect = getVideoDisplayRect(video);
  const useAbsoluteRect = rect.width > 0 && rect.height > 0;

  layer.innerHTML = regions.map((r, idx) => {
    const coords = r.coordinates || { x: 0.1 + idx * 0.25, y: 0.2, width: 0.22, height: 0.35 };
    
    let styleStr = '';
    if (useAbsoluteRect) {
      const boxLeft = rect.left + coords.x * rect.width;
      const boxTop = rect.top + coords.y * rect.height;
      const boxWidth = coords.width * rect.width;
      const boxHeight = coords.height * rect.height;
      styleStr = `left: ${boxLeft}px; top: ${boxTop}px; width: ${boxWidth}px; height: ${boxHeight}px;`;
    } else {
      const left = (coords.x * 100).toFixed(1);
      const top = (coords.y * 100).toFixed(1);
      const width = (coords.width * 100).toFixed(1);
      const height = (coords.height * 100).toFixed(1);
      styleStr = `left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%;`;
    }

    return `
      <div 
        onclick="window.showLiveRegionDetails(${idx})"
        style="${styleStr}"
        class="absolute border-2 border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all cursor-pointer rounded-lg group shadow-lg flex items-start p-1"
      >
        <span class="px-1.5 py-0.5 rounded bg-purple-600 text-white font-mono font-bold text-[10px] tracking-wider uppercase shadow">
          ${escapeHtml(r.label || `Region ${idx + 1}`)}
        </span>
      </div>
    `;
  }).join('');

  window.showLiveRegionDetails = (index) => {
    const r = currentFrameRegions[index];
    if (!r) return;

    const popover = document.getElementById('live-region-popover');
    if (!popover) return;

    popover.classList.remove('hidden');
    popover.style.left = '50%';
    popover.style.top = '70%';
    popover.style.transform = 'translate(-50%, -50%)';

    popover.innerHTML = `
      <div class="space-y-2 text-left">
        <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span class="font-serif font-bold text-slate-100">${escapeHtml(r.label || 'Region Observation')}</span>
          <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ${escapeHtml(r.status || 'OBSERVED')}
          </span>
        </div>
        <div class="text-[11px] text-slate-300 font-sans">${escapeHtml(r.observation || r.type || 'Detected visual element')}</div>
        <div class="flex justify-end pt-1">
          <button onclick="document.getElementById('live-region-popover').classList.add('hidden')" class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-[10px] font-mono cursor-pointer">
            Close
          </button>
        </div>
      </div>
    `;
  };
}

