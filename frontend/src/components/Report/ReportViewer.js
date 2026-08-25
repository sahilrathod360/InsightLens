// Comprehensive Report Canvas Component with Header Metadata, Thumbnail, TOC, 11 Collapsible Sections, & Explain Panel

import { formatReportPayload } from '../../services/report.js';
import { renderReportHeader } from './ReportHeader.js';
import { renderTableOfContents, attachTocEvents } from './TableOfContents.js';
import { renderReportSections, attachCollapsibleSectionEvents } from './ReportSections.js';
import { createExplainReportSection, attachExplainPanelEvents } from '../ExplainReport/ExplainPanel.js';

export function mountInlineExplainPanel(data) {
  const container = document.getElementById('inline-explain-container');
  if (container) {
    container.innerHTML = createExplainReportSection(data);
    attachExplainPanelEvents();
  }
}

export function renderUpgradedReportCanvas(data) {
  const paperCanvas = document.getElementById('paper-canvas');
  if (!paperCanvas) return;

  const formatted = formatReportPayload(data);
  if (!formatted) return;

  paperCanvas.innerHTML = `
    <!-- 1. ENHANCED REPORT HEADER WITH THUMBNAIL & METADATA -->
    ${renderReportHeader(formatted)}

    <!-- 2. MAIN LAYOUT: SIDE TOC (4 COLS) + 11 SECTIONS (8 COLS) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4">
      
      <!-- SIDE TABLE OF CONTENTS (4 COLS) -->
      <aside class="lg:col-span-4 hidden lg:block">
        ${renderTableOfContents()}
      </aside>

      <!-- 11 COLLAPSIBLE SECTIONS (8 COLS) -->
      <main class="lg:col-span-8 space-y-6">
        ${renderReportSections(formatted)}
      </main>
    </div>

    <!-- 3. INLINE EXPLAIN THIS REPORT PANEL -->
    <div id="inline-explain-container" class="pt-6">
      ${createExplainReportSection(data)}
    </div>
  `;

  attachTocEvents();
  attachCollapsibleSectionEvents();
  attachExplainPanelEvents();
}
