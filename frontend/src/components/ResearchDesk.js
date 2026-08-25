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

export function handleFileSelected(file, startAnalysisPipeline) {
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    showToast('Please select a valid file (PNG, JPG, WEBP, SVG, PDF)', 'warning');
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    showToast('File size exceeds the 25MB maximum limit.', 'warning');
    return;
  }

  setActiveFile(file);
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    if (typeof startAnalysisPipeline === 'function') {
      startAnalysisPipeline(dataUrl, file.name, formatBytes(file.size));
    }
  };
  reader.onerror = () => {
    showToast('Error reading image file.', 'warning');
  };
  reader.readAsDataURL(file);
}

export async function handleSampleSelected(key, startAnalysisPipeline) {
  const samples = {
    blueprint: { url: '/samples/blueprint.jpg', name: 'gothic_revival_blueprint.jpg', size: '3.1 MB' },
    chart: { url: '/samples/chart.jpg', name: 'financial_saas_metrics.jpg', size: '2.4 MB' },
    infographic: { url: '/samples/infographic.jpg', name: 'clean_energy_decarbonization.jpg', size: '1.8 MB' }
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
