// Research Desk Workbench Component (File Uploads & Sample Selector)

import { setActiveFile, navigateTo, clearTimeouts, incrementAnalysisId } from '../state.js';
import { formatBytes, showToast } from '../utils/toast.js';
import { fetchUrlAsDataUrl } from '../utils/canvas.js';

export function setupUploadEvents(startAnalysisPipeline) {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');

  browseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone?.addEventListener('click', () => fileInput.click());

  dropZone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0], startAnalysisPipeline);
      e.target.value = ''; // Reset input to allow selecting the same file again
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    dropZone?.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone?.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone?.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0], startAnalysisPipeline);
    }
  });

  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const sampleKey = chip.getAttribute('data-sample');
      handleSampleSelected(sampleKey, startAnalysisPipeline);
    });
  });

  document.getElementById('cancel-analysis-btn')?.addEventListener('click', () => {
    incrementAnalysisId();
    clearTimeouts();
    navigateTo('desk');
    showToast('Analysis cancelled.', 'info');
  });

  document.getElementById('new-analysis-btn')?.addEventListener('click', () => {
    navigateTo('desk');
  });
}

export function extractSuggestedSubjectFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';
  // Strip extension
  let base = filename.replace(/\.[^/.]+$/, '').trim();
  
  // Strip copy indicators like (1), (2), [1], _copy, -copy, etc.
  base = base.replace(/[\(\[\{]\s*\d+\s*[\)\]\}]/g, '').replace(/[-_]?(copy|duplicate|edit|cropped|resized)/gi, '').trim();

  // If pure numbers, hex, UUIDs, or timestamps (e.g. 1787759819925, 20260903_123456, 8fc4849)
  if (/^[0-9a-f_\-\s]+$/i.test(base) && (!/[a-z]/i.test(base) || /^[0-9a-f]{8,}$/i.test(base.replace(/[-_\s]/g, '')))) {
    return '';
  }

  // Split into words
  const words = base.split(/[-_\s.]+/).filter(Boolean);
  if (words.length === 0) return '';

  const genericStopwords = new Set([
    'image', 'images', 'img', 'imgs', 'photo', 'photos', 'pic', 'pics', 'picture', 'pictures',
    'screenshot', 'screenshots', 'screen', 'shot', 'capture', 'scan', 'scans', 'document', 'documents',
    'doc', 'docs', 'file', 'files', 'download', 'downloads', 'upload', 'uploads', 'asset', 'assets',
    'untitled', 'camera', 'cam', 'frame', 'clip', 'wallpaper', 'avatar', 'temp', 'tmp', 'raw',
    'thumbnail', 'thumb', 'preview', 'dsc', 'dcim', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'
  ]);

  // Check if ALL non-numeric words are generic stopwords
  const meaningfulWords = words.filter(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean.length >= 2 && !genericStopwords.has(clean) && !/^\d+$/.test(clean);
  });

  if (meaningfulWords.length === 0) {
    return '';
  }

  // Format as Title Case
  return meaningfulWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function handleFileSelected(file, startAnalysisPipeline) {
  if (!file) return;

  // Validate supported image MIME and extensions (Strictly JPEG, PNG, WebP)
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = (file.name || '').split('.').pop().toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

  const isMimeOk = file.type ? allowedMimes.includes(file.type.toLowerCase()) : false;
  const isExtOk = allowedExts.includes(ext);

  if (!isMimeOk && !isExtOk) {
    showToast('Unsupported image format. Please upload JPG, PNG or WebP.', 'warning');
    return;
  }

  if (file.size === 0) {
    showToast('The selected file is empty (0 bytes). Please choose a valid image.', 'warning');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showToast('File size exceeds the 20MB limit. Please choose a smaller image.', 'warning');
    return;
  }

  // Suggest context from filename if subject input is empty
  const subjectInput = document.getElementById('input-subject-context');
  if (subjectInput && !subjectInput.value.trim()) {
    const suggested = extractSuggestedSubjectFromFilename(file.name);
    if (suggested) {
      subjectInput.value = suggested;
    }
  }

  setActiveFile(file);
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result;
    if (dataUrl && typeof startAnalysisPipeline === 'function') {
      startAnalysisPipeline(dataUrl, file.name, formatBytes(file.size));
    } else {
      showToast('Could not process image data. Please try another image.', 'warning');
    }
  };
  reader.onerror = () => {
    showToast('Error reading image file from this device. Please try again.', 'warning');
  };
  reader.readAsDataURL(file);
}

export async function handleSampleSelected(key, startAnalysisPipeline) {
  const samples = {
    urban: { url: '/images/urban-analysis.jpg', name: 'urban_scene_analysis.jpg', size: '2.8 MB' },
    mountain: { url: '/images/mountain-analysis.jpg', name: 'mountain_landscape_observation.jpg', size: '3.1 MB' },
    milkyway: { url: '/images/milky-way-analysis.jpg', name: 'milky_way_astronomical_imaging.jpg', size: '2.4 MB' },
    comet: { url: '/images/comet-analysis.jpg', name: 'comet_deep_space_analysis.jpg', size: '3.3 MB' }
  };

  const sample = samples[key];
  if (sample) {
    showToast('Loading sample image...', 'info');
    try {
      const dataUrl = await fetchUrlAsDataUrl(sample.url);
      if (typeof startAnalysisPipeline === 'function') {
        startAnalysisPipeline(dataUrl, sample.name, sample.size);
      }
    } catch (err) {
      showToast('Failed to load sample image data.', 'warning');
    }
  }
}
