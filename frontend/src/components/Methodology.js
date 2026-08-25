// Methodology & Pipeline Architecture Component

import { navigateTo } from '../state.js';

export function setupMethodologyEvents() {
  document.getElementById('methodology-try-btn')?.addEventListener('click', () => {
    navigateTo('desk');
  });

  const stageBtns = document.querySelectorAll('.pipeline-tab-btn');
  const detailTitle = document.getElementById('stage-detail-title');
  const detailBadge = document.getElementById('stage-detail-badge');
  const detailDesc = document.getElementById('stage-detail-desc');
  const detailInput = document.getElementById('stage-detail-input');
  const detailLatency = document.getElementById('stage-detail-latency');
  const detailOutput = document.getElementById('stage-detail-output');

  const STAGE_SPECS = {
    '1': {
      title: 'Stage 1: Image Ingestion & Data Normalization',
      badge: 'Client-Side Reader',
      desc: 'The pipeline receives binary file inputs via Drag-and-Drop or File API. FileReader converts visual payloads into Base64 Data URL strings under 25MB while verifying PNG, JPEG, WEBP, and SVG format signatures.',
      input: 'File Blob / Data URL',
      latency: '< 50 ms Instant',
      output: 'Clean Base64 Stream'
    },
    '2': {
      title: 'Stage 2: Canvas Telemetry & Pixel Matrix Analysis',
      badge: 'Canvas 2D Engine',
      desc: 'Constructs an offscreen HTML5 Canvas to inspect pixel Luma values, calculate image contrast ratios, estimate structural edge density using Sobel gradient approximations, and extract dominant RGB color distributions.',
      input: 'Base64 Image Payload',
      latency: '~ 120 ms',
      output: 'Telemetry Feature Object'
    },
    '3': {
      title: 'Stage 3: Dynamic Prompt Matrix Assembly',
      badge: 'Prompt Compiler',
      desc: 'Combines target language, research depth (long/short), writing style (classic/creative/minimal), citation style (APA/MLA/IEEE), and focal subject grounding directives into a structured multi-part Gemini system prompt.',
      input: 'User Preferences + Telemetry',
      latency: '< 5 ms Instant',
      output: 'Multimodal System Prompt'
    },
    '4': {
      title: 'Stage 4: Gemini Vision Model Inference & Failover',
      badge: 'AI Cloud Neural Inference',
      desc: 'Dispatches REST HTTPS POST requests to Google Gemini. Executes auto-failover across Gemini 2.5 Flash, Flash Lite, and Pro models if HTTP 429 quota exceptions or rate limit bounds are encountered.',
      input: 'Prompt Payload + Base64',
      latency: '2.5s - 4.5s',
      output: 'Structured JSON Payload'
    },
    '5': {
      title: 'Stage 5: Academic Paper Synthesis & PDF Export',
      badge: 'Document Compiler',
      desc: 'Renders 14 detailed academic report sections onto the DOM canvas, compiles downloadable standalone Letter PDF files via html2pdf.js, formats Markdown briefs, and commits metrics to LocalStorage.',
      input: 'JSON Research Data',
      latency: '~ 300 ms',
      output: 'PDF, MD & JSON Artifacts'
    }
  };

  stageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stageBtns.forEach(b => {
        b.className = 'pipeline-tab-btn bg-surface-container-lowest hover:bg-surface-container-high text-slate-300 p-3.5 rounded-xl border ghost-border text-left cursor-pointer transition-all flex flex-col justify-between h-20';
      });
      btn.className = 'pipeline-tab-btn active bg-indigo-600 text-white p-3.5 rounded-xl border border-indigo-500/30 text-left cursor-pointer transition-all flex flex-col justify-between h-20 shadow-lg shadow-indigo-600/20';

      const stageKey = btn.getAttribute('data-stage') || '1';
      const spec = STAGE_SPECS[stageKey];
      if (spec && detailTitle) {
        detailTitle.textContent = spec.title;
        if (detailBadge) detailBadge.textContent = spec.badge;
        if (detailDesc) detailDesc.textContent = spec.desc;
        if (detailInput) detailInput.textContent = spec.input;
        if (detailLatency) detailLatency.textContent = spec.latency;
        if (detailOutput) detailOutput.textContent = spec.output;
      }
    });
  });
}
