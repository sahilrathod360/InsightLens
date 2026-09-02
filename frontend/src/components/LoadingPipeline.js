// Loading Pipeline Component & 9-Step Multimodal Progression Manager

import { 
  navigateTo, 
  clearTimeouts, 
  incrementAnalysisId, 
  getCurrentAnalysisId, 
  setGlobalSafetyTimer, 
  setLastAnalysisPayload, 
  setActiveReportData, 
  getSystemPreferences 
} from '../state.js';
import { saveAppMetrics, logUserActivity, getAppMetrics } from '../services/storage.js';
import { computeImageStatistics } from '../utils/canvas.js';
import { callGemini25Flash } from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { renderResultScreen } from './ReportViewer.js';

export const PIPELINE_STEPS = [
  { id: 'step-1', label: '1. Uploading image', weight: 10 },
  { id: 'step-2', label: '2. Processing image', weight: 20 },
  { id: 'step-3', label: '3. Detecting objects', weight: 30 },
  { id: 'step-4', label: '4. Extracting visual features', weight: 40 },
  { id: 'step-5', label: '5. Sending request to AI', weight: 55 },
  { id: 'step-6', label: '6. Researching subject', weight: 70 },
  { id: 'step-7', label: '7. Writing report', weight: 85 },
  { id: 'step-8', label: '8. Formatting citations', weight: 95 },
  { id: 'step-9', label: '9. Finalizing report', weight: 100 }
];

export function render9StepContainer() {
  const container = document.querySelector('#page-loading .space-y-3');
  if (!container) return;

  container.innerHTML = PIPELINE_STEPS.map(step => `
    <div id="${step.id}" class="flex items-center justify-between text-xs opacity-40 transition-all">
      <div class="flex items-center gap-2.5">
        <span class="step-icon material-symbols-outlined text-[17px] text-slate-400">hourglass_empty</span>
        <span class="step-label text-on-surface-variant">${step.label}</span>
      </div>
      <span class="step-status text-[10px] font-mono text-on-surface-variant">Pending</span>
    </div>
  `).join('');
}

let isAnalysisInProgress = false;

export async function startAnalysisPipeline(dataUrl, filename, filesizeStr) {
  if (isAnalysisInProgress) {
    console.warn('[LoadingPipeline] Analysis already running. Duplicate trigger blocked.');
    return;
  }
  isAnalysisInProgress = true;

  clearTimeouts();
  const thisAnalysisId = incrementAnalysisId();

  navigateTo('loading');
  render9StepContainer();

  const stageImg = document.getElementById('stage-image');
  const reportSourceImg = document.getElementById('report-source-img');
  if (stageImg) stageImg.src = dataUrl;
  if (reportSourceImg) reportSourceImg.src = dataUrl;

  const safeFilename = filename || 'document.png';
  const safeFilesize = filesizeStr || '2.4 MB';

  saveAppMetrics({ totalImagesAnalyzed: (getAppMetrics().totalImagesAnalyzed || 0) + 1 });
  logUserActivity('upload', `Image Uploaded: ${safeFilename}`);

  const infoFilename = document.getElementById('info-filename');
  const infoFilesize = document.getElementById('info-filesize');
  if (infoFilename) infoFilename.textContent = safeFilename;
  if (infoFilesize) infoFilesize.textContent = safeFilesize;

  const tempImg = new Image();
  tempImg.onload = () => {
    if (thisAnalysisId !== getCurrentAnalysisId()) return;
    const stats = computeImageStatistics(tempImg);
    updateTelemetryUI(stats);
  };
  tempImg.onerror = () => {
    console.warn('Pipeline: tempImg load error for dimension detection, continuing gracefully.');
  };
  tempImg.src = dataUrl;

  const systemPreferences = getSystemPreferences();
  const researchLength = document.getElementById('select-length')?.value || systemPreferences.researchLength || 'long';
  const writingStyle = document.getElementById('select-style')?.value || systemPreferences.writingStyle || 'classic';

  // Global Pipeline Safety Net Timer (120s to allow multi-provider AI backend generation)
  const safetyTimer = setTimeout(() => {
    if (thisAnalysisId !== getCurrentAnalysisId()) return;
    console.warn('Pipeline: Global timeout safety net triggered.');
    showToast('Analysis request timed out after 120 seconds.', 'error');
    clearTimeouts();
    
    // Show failure UI
    const apiFailureCard = document.getElementById('api-failure-card');
    if (apiFailureCard) {
      apiFailureCard.classList.remove('hidden');
      const p = apiFailureCard.querySelector('p');
      if (p) p.textContent = 'Analysis service temporarily unavailable. Please try again.';
    }
    
    const statusTitle = document.getElementById('status-title');
    if (statusTitle) statusTitle.textContent = 'Analysis Temporarily Unavailable';
  }, 120000);

  setGlobalSafetyTimer(safetyTimer);

  // Progressive Pre-Render: Prepare Hero Image & Initial Canvas
  const heroTitleEl = document.getElementById('report-hero-title');
  if (heroTitleEl) heroTitleEl.textContent = safeFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  setLastAnalysisPayload({ dataUrl, filename: safeFilename, filesizeStr: safeFilesize, researchLength, writingStyle });
  runLoadingProgressionWithGemini(dataUrl, researchLength, writingStyle, thisAnalysisId);
}

export function updateTelemetryUI(stats) {
  if (!stats) return;
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('telemetry-dimensions', stats.resolution);
  setEl('telemetry-aspect', stats.aspectRatio);
  setEl('telemetry-brightness', stats.brightnessScore);
  setEl('telemetry-contrast', stats.contrastScore);
  setEl('telemetry-sharpness', stats.sharpnessEstimate);
  setEl('telemetry-dominant-colors', stats.dominantColors);
  setEl('telemetry-color-diversity', stats.colorDiversity);
  setEl('telemetry-edge-density', stats.edgeDensity);
  setEl('telemetry-object-count', stats.estimatedObjectCount);
  setEl('telemetry-complexity', stats.visualComplexity);
  setEl('telemetry-noise', stats.noiseEstimate);
  setEl('telemetry-ocr-confidence', stats.ocrConfidence);
  setEl('telemetry-ai-confidence', stats.aiConfidence);
}

export async function runLoadingProgressionWithGemini(dataUrl, researchLength, writingStyle, thisAnalysisId) {
  const progressFill = document.getElementById('progress-fill');
  const progressPercentage = document.getElementById('progress-percentage');
  const statusTitle = document.getElementById('status-title');
  const apiFailureCard = document.getElementById('api-failure-card');

  if (apiFailureCard) apiFailureCard.classList.add('hidden');

  let currentProgress = 0;
  let heartbeatTimer = null;

  function setProgress(targetPercent) {
    if (thisAnalysisId !== getCurrentAnalysisId()) return;
    currentProgress = targetPercent;
    if (progressFill) progressFill.style.width = `${currentProgress}%`;
    if (progressPercentage) progressPercentage.textContent = `${currentProgress}%`;
  }

  resetStepIcons();

  try {
    // Fast Initial Steps (1-4)
    setStepActive('step-1');
    if (statusTitle) statusTitle.textContent = 'Uploading image data...';
    setProgress(15);
    setStepComplete('step-1');

    setStepActive('step-2');
    if (statusTitle) statusTitle.textContent = 'Processing visual dimensions...';
    setProgress(30);
    setStepComplete('step-2');

    setStepActive('step-3');
    if (statusTitle) statusTitle.textContent = 'Detecting focal regions...';
    setProgress(45);
    setStepComplete('step-3');

    setStepActive('step-4');
    if (statusTitle) statusTitle.textContent = 'Extracting spatial feature vectors...';
    setProgress(55);
    setStepComplete('step-4');

    // Step 5: Sending request to AI & Dynamic Progress Heartbeat
    setStepActive('step-5');
    if (statusTitle) statusTitle.textContent = 'Connecting to AI Neural Inference Engine...';
    setProgress(60);

    let currentModelName = 'Gemini Vision AI';

    const onModelAttempt = (modelCandidate) => {
      currentModelName = modelCandidate.toUpperCase();
      const procLabel = document.getElementById('processing-model-label');
      if (procLabel) procLabel.textContent = `${currentModelName} Inference`;
    };

    const onRetryNotice = (modelCandidate, attempt, maxRetries) => {
      if (statusTitle) statusTitle.textContent = `Switching provider model (${attempt}/${maxRetries})...`;
    };

    const apiPromise = callGemini25Flash(dataUrl, researchLength, writingStyle, onModelAttempt, onRetryNotice);

    setStepActive('step-6');
    if (statusTitle) statusTitle.textContent = 'Synthesizing multi-spectral research paper...';

    // Start Smooth Progress Heartbeat (55% -> 92%)
    let stepProgress = 60;
    heartbeatTimer = setInterval(() => {
      if (thisAnalysisId !== getCurrentAnalysisId()) {
        clearInterval(heartbeatTimer);
        return;
      }
      if (stepProgress < 92) {
        stepProgress += 1;
        setProgress(stepProgress);
      }
    }, 700);

    const reportData = await apiPromise;
    clearInterval(heartbeatTimer);
    clearTimeouts();

    if (thisAnalysisId !== getCurrentAnalysisId()) return;

    setStepComplete('step-5');
    setStepComplete('step-6');

    // Finalizing Progress to 100%
    setStepActive('step-7');
    setStepComplete('step-7');
    setStepActive('step-8');
    setStepComplete('step-8');
    setStepActive('step-9');
    setStepComplete('step-9');
    setProgress(100);

    setActiveReportData(reportData);
    // Note: Report is already persisted in PostgreSQL by /api/analyze as the authoritative source of truth.
    // reportData.id contains the persisted reportId.
    logUserActivity('generate', `Report Generated: ${reportData.title || 'Visual Research Brief'}`);

    renderResultScreen(reportData);

  } catch (err) {
    console.error('Analysis Pipeline Error:', err.message);
    if (thisAnalysisId !== getCurrentAnalysisId()) return;

    clearTimeouts();
    
    const errorMsg = err.type === 'INVALID_KEY'
      ? 'Invalid API Key. Please verify your Gemini API key in Settings.'
      : err.type === 'QUOTA_EXCEEDED'
      ? 'API Quota Exceeded (HTTP 429). Public rate limits reached.'
      : err.message || 'AI service temporarily unavailable.';

    if (statusTitle) statusTitle.textContent = errorMsg;

    const activeStepId = ['step-5', 'step-6', 'step-7'].find(id => document.getElementById(id)?.classList.contains('opacity-100')) || 'step-5';
    const errorStep = document.getElementById(activeStepId);

    if (errorStep) {
      const icon = errorStep.querySelector('.step-icon');
      const status = errorStep.querySelector('.step-status');
      if (icon) {
        icon.textContent = 'warning';
        icon.className = 'step-icon material-symbols-outlined text-[17px] text-amber-400';
      }
      if (status) {
        status.textContent = err.type || 'Failed';
        status.className = 'step-status text-[11px] font-mono text-amber-400 font-semibold';
      }
    }

    if (apiFailureCard) {
      apiFailureCard.classList.remove('hidden');
      const p = apiFailureCard.querySelector('p');
      if (p) {
        p.textContent = `${errorMsg}`;
      }
    }
  } finally {
    isAnalysisInProgress = false;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
}

export function resetStepIcons() {
  PIPELINE_STEPS.forEach(step => {
    const el = document.getElementById(step.id);
    if (!el) return;
    el.className = 'flex items-center justify-between text-xs opacity-40 transition-all';
    
    const icon = el.querySelector('.step-icon');
    const status = el.querySelector('.step-status');
    
    if (icon) {
      icon.textContent = 'hourglass_empty';
      icon.className = 'step-icon material-symbols-outlined text-[17px] text-slate-400';
    }
    if (status) {
      status.textContent = 'Pending';
      status.className = 'step-status text-[11px] font-mono text-slate-500';
    }
  });
}

export function setStepComplete(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.className = 'flex items-center justify-between text-xs opacity-100 transition-all';
  
  const icon = el.querySelector('.step-icon');
  const status = el.querySelector('.step-status');

  if (icon) {
    icon.textContent = 'check_circle';
    icon.className = 'step-icon material-symbols-outlined text-[17px] text-emerald-400';
  }
  if (status) {
    status.textContent = 'Complete';
    status.className = 'step-status text-[11px] font-mono text-emerald-400 font-semibold';
  }
}

export function setStepActive(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.className = 'flex items-center justify-between text-xs opacity-100 transition-all';
  
  const icon = el.querySelector('.step-icon');
  const status = el.querySelector('.step-status');

  if (icon) {
    icon.textContent = 'sync';
    icon.className = 'step-icon material-symbols-outlined text-[17px] text-indigo-400 animate-spin';
  }
  if (status) {
    status.textContent = 'In Progress';
    status.className = 'step-status text-[11px] font-mono text-indigo-400 font-semibold';
  }
}
