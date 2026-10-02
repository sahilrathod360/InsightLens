import { sendLiveVisionFrame } from '../services/visualIntelligenceApi.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/sanitize.js';

let liveStreamTrack = null;
let detectionLoopTimer = null;
let isDetecting = false;
let detectorModel = null;
let isModelLoading = false;
let currentFrameDetections = [];
let smoothedDetections = [];
let currentFacingMode = 'environment';
let isLiveVisionPaused = false;
let lastServerSyncTime = 0;

/**
 * Loads the client-side lightweight COCO-SSD object detector lazily.
 */
async function getOrLoadDetector() {
  if (detectorModel) return detectorModel;
  if (isModelLoading) {
    while (isModelLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return detectorModel;
  }

  isModelLoading = true;
  try {
    const statusEl = document.getElementById('live-detector-status');
    if (statusEl) statusEl.innerText = 'Loading AI Object Detector...';
    
    await import('@tensorflow/tfjs');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    
    detectorModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    console.log('[LiveVision] COCO-SSD lightweight model loaded successfully');
    if (statusEl) statusEl.innerText = 'OBJECT DETECTION ACTIVE';
  } catch (err) {
    console.warn('[LiveVision] Local COCO-SSD load failed, will rely on backend vision:', err.message);
  } finally {
    isModelLoading = false;
  }
  return detectorModel;
}

function formatClassLabel(rawClass) {
  if (!rawClass) return 'Object';
  const mapping = {
    'tv': 'TV',
    'tvmonitor': 'TV / Monitor',
    'cell phone': 'Phone',
    'laptop': 'Laptop',
    'couch': 'Sofa',
    'dining table': 'Table',
    'potted plant': 'Plant',
    'sports ball': 'Ball',
    'wine glass': 'Wine Glass',
    'hair drier': 'Hair Dryer',
    'teddy bear': 'Teddy Bear',
    'refrigerator': 'Fridge',
    'microwave': 'Microwave',
    'traffic light': 'Traffic Light',
    'fire hydrant': 'Fire Hydrant',
    'stop sign': 'Stop Sign',
    'parking meter': 'Parking Meter'
  };

  const key = rawClass.toLowerCase().trim();
  if (mapping[key]) return mapping[key];
  return rawClass.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

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
            Real-Time Visual Object Detection • Live Camera
          </div>
          <h1 class="font-serif font-bold text-3xl text-slate-100 tracking-tight">
            Live Vision Discovery
          </h1>
          <p class="text-xs text-slate-400 font-sans">
            Point your camera at the real world to continuously detect objects (TV, Person, Bed, Table, Laptop, Phone) with live bounding boxes.
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
      <div class="live-camera-shell relative w-full rounded-2xl bg-black border border-purple-500/20 overflow-hidden shadow-2xl flex flex-col justify-center items-center min-h-[420px] sm:min-h-[520px]">
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
              Click <strong>Start Camera</strong> to activate your camera for real-time visual object detection and bounding box discovery.
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

          <!-- Subtle Scan Laser Bar -->
          <div class="scanner-laser pointer-events-none"></div>

          <!-- Top Status Bar Overlay -->
          <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-emerald-400">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span id="live-detector-status">OBJECT DETECTION ACTIVE</span>
            </div>
            <div class="flex items-center gap-2">
              <div id="live-detected-count" class="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-indigo-300">
                Objects: 0
              </div>
              <div id="live-frame-latency" class="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
                Latency: --ms
              </div>
            </div>
          </div>

          <!-- Empty Detection Prompt -->
          <div id="live-no-detection-msg" class="hidden absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/80 border border-white/10 text-[11px] font-mono text-slate-400 pointer-events-none z-20">
            Scanning scene... (No objects currently detected)
          </div>

          <!-- Floating Clickable Region Popover Mount -->
          <div id="live-region-popover" class="hidden absolute z-30 max-w-xs p-3.5 rounded-xl bg-slate-950/95 border border-purple-500/40 text-xs shadow-2xl backdrop-blur-md">
            <!-- Rendered on region click -->
          </div>
        </div>
      </div>

      <!-- Action Footer: Analyze This Scene -->
      <div id="live-scene-actions" class="hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/60 border border-purple-500/30">
        <div class="space-y-1">
          <span class="font-serif font-bold text-slate-100 text-sm">Scene ready for full report</span>
          <p class="text-xs text-slate-400 font-sans">
            Capture the current frame and send it through the full visual intelligence pipeline for in-depth analysis.
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
  // Pre-load detector in background
  getOrLoadDetector().catch(() => {});
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

      showToast(`Camera active (${currentFacingMode}). Real-time object detection engaged.`, 'success');
      startRealtimeDetectionLoop();
    } catch (err) {
      console.error('[LiveVision] getUserMedia Error:', err);
      let errorTitle = 'Camera Access Failed';
      let errorDesc = err.message || 'Unable to access camera device.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorTitle = 'Camera Permission Denied';
        errorDesc = 'InsightLens needs camera permission to detect visual objects. Please click the camera icon in your browser address bar and select "Allow".';
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
      if (detectionLoopTimer) {
        clearTimeout(detectionLoopTimer);
        detectionLoopTimer = null;
      }
    } else {
      video.play().catch(() => {});
      startRealtimeDetectionLoop();
    }
    updatePauseButton();
  };

  window.stopLiveCameraStream = () => {
    if (detectionLoopTimer) {
      clearTimeout(detectionLoopTimer);
      detectionLoopTimer = null;
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
    const layer = document.getElementById('live-bounding-box-layer');

    if (layer) layer.innerHTML = '';
    currentFrameDetections = [];
    smoothedDetections = [];

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

/**
 * Continuous real-time detection loop with throttled interval (300ms cadence).
 */
function startRealtimeDetectionLoop() {
  if (detectionLoopTimer) clearTimeout(detectionLoopTimer);

  const runDetectionTick = async () => {
    if (isLiveVisionPaused || !liveStreamTrack) return;

    const video = document.getElementById('live-camera-feed');
    if (!video || !video.videoWidth || video.paused) {
      detectionLoopTimer = setTimeout(runDetectionTick, 200);
      return;
    }

    if (!isDetecting) {
      isDetecting = true;
      const startTime = performance.now();

      try {
        const model = await getOrLoadDetector();
        let rawDetections = [];

        if (model) {
          // Real-time object detection directly on HTML5 video element
          const predictions = await model.detect(video, 12, 0.40);
          const vWidth = video.videoWidth || 1280;
          const vHeight = video.videoHeight || 720;

          rawDetections = predictions.map((pred, idx) => {
            const [bx, by, bw, bh] = pred.bbox;
            const normX = Math.max(0, Math.min(1, bx / vWidth));
            const normY = Math.max(0, Math.min(1, by / vHeight));
            const normW = Math.max(0.02, Math.min(1 - normX, bw / vWidth));
            const normH = Math.max(0.02, Math.min(1 - normY, bh / vHeight));
            const label = formatClassLabel(pred.class);
            const score = Math.round((pred.score || 0.85) * 100);

            return {
              id: `DET-${idx + 1}`,
              label,
              confidence: score,
              status: 'OBSERVED',
              coordinates: {
                x: normX,
                y: normY,
                width: normW,
                height: normH,
                normalized: true
              },
              observation: `Detected ${label} (${score}% confidence) in active visual field.`
            };
          });
        }

        const latency = Math.round(performance.now() - startTime);

        const latEl = document.getElementById('live-frame-latency');
        if (latEl) latEl.innerText = `Latency: ${latency}ms`;

        const countEl = document.getElementById('live-detected-count');
        if (countEl) countEl.innerText = `Objects: ${rawDetections.length}`;

        const emptyMsg = document.getElementById('live-no-detection-msg');
        if (emptyMsg) {
          if (rawDetections.length === 0) {
            emptyMsg.classList.remove('hidden');
          } else {
            emptyMsg.classList.add('hidden');
          }
        }

        // Apply temporal smoothing to eliminate bounding box jitter
        const smoothed = applyTemporalSmoothing(rawDetections);
        currentFrameDetections = smoothed;
        renderLiveBoundingBoxes(smoothed);

        // Periodically sync telemetry frame with backend (every 4 seconds)
        const now = Date.now();
        if (now - lastServerSyncTime > 4000 && video.videoWidth > 0) {
          lastServerSyncTime = now;
          syncBackendFrameTelemetry(video, smoothed).catch(() => {});
        }
      } catch (err) {
        console.warn('[LiveVision] Object detection tick notice:', err.message);
      } finally {
        isDetecting = false;
      }
    }

    // Schedule next detection frame (300ms cadence)
    if (!isLiveVisionPaused && liveStreamTrack) {
      detectionLoopTimer = setTimeout(runDetectionTick, 300);
    }
  };

  detectionLoopTimer = setTimeout(runDetectionTick, 100);
}

/**
 * Smooths bounding boxes between consecutive frames to prevent jitter.
 */
function applyTemporalSmoothing(newDetections) {
  const ALPHA = 0.65;
  const now = Date.now();

  const smoothed = newDetections.map(det => {
    const prev = smoothedDetections.find(p => 
      p.label === det.label &&
      Math.abs(p.coordinates.x - det.coordinates.x) < 0.15 &&
      Math.abs(p.coordinates.y - det.coordinates.y) < 0.15
    );

    if (prev) {
      return {
        ...det,
        coordinates: {
          x: prev.coordinates.x * (1 - ALPHA) + det.coordinates.x * ALPHA,
          y: prev.coordinates.y * (1 - ALPHA) + det.coordinates.y * ALPHA,
          width: prev.coordinates.width * (1 - ALPHA) + det.coordinates.width * ALPHA,
          height: prev.coordinates.height * (1 - ALPHA) + det.coordinates.height * ALPHA,
          normalized: true
        },
        lastSeen: now
      };
    }

    return {
      ...det,
      lastSeen: now
    };
  });

  smoothedDetections = smoothed;
  return smoothed;
}

async function syncBackendFrameTelemetry(video, detections) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const thumbUrl = canvas.toDataURL('image/jpeg', 0.5);

    await sendLiveVisionFrame({
      imageDataUrl: thumbUrl,
      detections
    });
  } catch (e) {
    // Non-fatal telemetry sync
  }
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

function renderLiveBoundingBoxes(detections = []) {
  const layer = document.getElementById('live-bounding-box-layer');
  const video = document.getElementById('live-camera-feed');
  if (!layer || !video) return;

  const rect = getVideoDisplayRect(video);
  const useAbsoluteRect = rect.width > 0 && rect.height > 0;

  layer.innerHTML = detections.map((r, idx) => {
    const coords = r.coordinates || { x: 0.1 + idx * 0.2, y: 0.2, width: 0.25, height: 0.35 };
    
    let styleStr = '';
    if (useAbsoluteRect) {
      const boxLeft = Math.round(rect.left + coords.x * rect.width);
      const boxTop = Math.round(rect.top + coords.y * rect.height);
      const boxWidth = Math.round(coords.width * rect.width);
      const boxHeight = Math.round(coords.height * rect.height);
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
        class="absolute border-2 border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer rounded-lg group shadow-xl flex items-start p-1 pointer-events-auto"
      >
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-600/90 text-white font-mono font-bold text-[10px] tracking-wider uppercase shadow backdrop-blur-sm">
          <span>${escapeHtml(r.label || `Object ${idx + 1}`)}</span>
          <span class="text-[9px] text-emerald-200 font-normal opacity-90">${r.confidence}%</span>
        </div>
      </div>
    `;
  }).join('');

  window.showLiveRegionDetails = (index) => {
    const r = currentFrameDetections[index];
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
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="font-serif font-bold text-slate-100 text-sm">${escapeHtml(r.label || 'Detected Object')}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
            ${r.confidence}% CONFIDENCE
          </span>
        </div>
        <div class="text-[11px] text-slate-300 font-sans">${escapeHtml(r.observation || `Visual detection of ${r.label} in camera frame.`)}</div>
        <div class="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
          <span>Status: <strong class="text-emerald-400">${escapeHtml(r.status || 'OBSERVED')}</strong></span>
          <button onclick="document.getElementById('live-region-popover').classList.add('hidden')" class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono cursor-pointer border border-white/10">
            Close
          </button>
        </div>
      </div>
    `;
  };
}
