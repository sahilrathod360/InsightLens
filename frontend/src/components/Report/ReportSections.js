// Report Sections Component with Collapsible Toggles, Highlighting & Callouts
import { renderMarkdownToHtml } from '../../utils/markdown.js';

export function renderReportSections(formatted) {
  if (!formatted) return '';
  const { sections, subject } = formatted;

  return `
    <div class="space-y-6 text-xs font-sans">
      
      <!-- 1. EXECUTIVE SUMMARY -->
      <section id="sec-exec-summary" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-[20px]">summarize</span>
            1. Executive Summary
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="p-4 bg-indigo-500/10 border-l-4 border-indigo-400 rounded-r-xl space-y-1">
            <strong class="text-indigo-300 font-semibold text-xs block">Key Insight Abstract</strong>
            <div class="text-slate-200 leading-relaxed text-xs">
              ${renderMarkdownToHtml(sections.executiveSummary)}
            </div>
          </div>
        </div>
      </section>

      <!-- 2. IDENTIFICATION -->
      <section id="sec-identification" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-sky-400 text-[20px]">fingerprint</span>
            2. Identification &amp; Taxonomy
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="text-slate-300 leading-relaxed">
            ${renderMarkdownToHtml(sections.identification)}
          </div>
          <div class="p-3.5 bg-surface-container rounded-xl border ghost-border font-mono text-[11px] text-slate-300 flex items-center gap-2">
            <span class="material-symbols-outlined text-sky-400 text-[18px]">verified</span>
            <span>Primary Subject Verified: <mark class="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold border border-indigo-500/30">${subject}</mark></span>
          </div>
        </div>
      </section>

      <!-- 3. OVERVIEW -->
      <section id="sec-overview" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-300 text-[20px]">visibility</span>
            3. Subject Overview
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="prose prose-invert max-w-none text-slate-300 leading-relaxed">
            ${renderMarkdownToHtml(sections.overview)}
          </div>
        </div>
      </section>

      <!-- 4. HISTORICAL BACKGROUND -->
      <section id="sec-history" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-emerald-400 text-[20px]">history</span>
            4. Historical &amp; Evolutionary Background
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="p-4 bg-emerald-500/10 border-l-4 border-emerald-400 rounded-r-xl space-y-1">
            <strong class="text-emerald-300 font-semibold text-xs block">Historical Timeline &amp; Origins</strong>
            <div class="text-slate-200 leading-relaxed text-xs">
              ${renderMarkdownToHtml(sections.historicalBackground)}
            </div>
          </div>
        </div>
      </section>

      <!-- 5. TECHNICAL / SCIENTIFIC DETAILS -->
      <section id="sec-technical" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-[20px]">biotech</span>
            5. Technical &amp; Scientific Specifications
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="text-slate-300 leading-relaxed">
            ${renderMarkdownToHtml(sections.technicalDetails)}
          </div>
        </div>
      </section>

      <!-- 6. APPLICATIONS -->
      <section id="sec-applications" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-sky-400 text-[20px]">apps</span>
            6. Practical &amp; Domain Applications
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-2.5">
          ${(Array.isArray(sections.applications) ? sections.applications : [sections.applications]).map((app, i) => `
            <div class="p-3 bg-surface-container rounded-xl border ghost-border flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${i + 1}</span>
              <span class="text-slate-200 text-xs leading-relaxed">${app}</span>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- 7. KEY FACTS -->
      <section id="sec-key-facts" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-300 text-[20px]">fact_check</span>
            7. Key Facts &amp; Specifications
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          ${(Array.isArray(sections.keyFacts) ? sections.keyFacts : [{ label: 'Domain', detail: sections.keyFacts }]).map(fact => `
            <div class="p-3.5 bg-surface-container rounded-xl border ghost-border space-y-1">
              <span class="text-[10px] text-slate-500 uppercase font-mono block">${fact.label || 'Feature'}</span>
              <strong class="text-slate-200 text-xs leading-tight block font-sans">${fact.detail || 'Details'}</strong>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- 8. INTERESTING FACTS -->
      <section id="sec-interesting-facts" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-amber-300 text-[20px]">lightbulb</span>
            8. Interesting Facts &amp; Insights
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-2.5">
          ${(Array.isArray(sections.interestingFacts) ? sections.interestingFacts : [sections.interestingFacts]).map(fact => `
            <div class="p-3 bg-surface-container rounded-xl border ghost-border flex items-start gap-2.5">
              <span class="material-symbols-outlined text-[16px] text-amber-400 mt-0.5 shrink-0">star</span>
              <span class="text-slate-200 text-xs leading-relaxed"><mark class="bg-amber-500/20 text-amber-200 px-1 py-0.5 rounded border border-amber-500/30 font-semibold">${fact}</mark></span>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- 9. LIMITATIONS -->
      <section id="sec-limitations" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-red-400 text-[20px]">warning</span>
            9. Analysis Limitations
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="p-4 bg-red-500/10 border-l-4 border-red-400 rounded-r-xl space-y-1">
            <strong class="text-red-300 font-semibold text-xs block">Visual Inference Boundaries</strong>
            <p class="text-slate-200 leading-relaxed text-xs">
              ${sections.limitations}
            </p>
          </div>
        </div>
      </section>

      <!-- 10. CONCLUSION -->
      <section id="sec-conclusion" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-emerald-400 text-[20px]">task_alt</span>
            10. Concluding Synthesis
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-3">
          <div class="p-4 bg-emerald-500/10 border-l-4 border-emerald-400 rounded-r-xl space-y-1">
            <strong class="text-emerald-300 font-semibold text-xs block">Synthesis Conclusion</strong>
            <p class="text-slate-200 leading-relaxed text-xs">
              ${sections.conclusion}
            </p>
          </div>
        </div>
      </section>

      <!-- 11. REFERENCES -->
      <section id="sec-references" class="report-collapsible-section bg-surface-container-lowest p-6 rounded-2xl border ghost-border space-y-4 shadow-md">
        <div class="flex items-center justify-between border-b ghost-border pb-3 cursor-pointer sec-header">
          <h2 class="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-indigo-400 text-[20px]">menu_book</span>
            11. Academic References &amp; Citations
          </h2>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-[20px] sec-toggle-icon">expand_less</span>
          </button>
        </div>

        <div class="sec-body space-y-2 font-mono text-[11px]">
          ${(Array.isArray(sections.references) ? sections.references : [sections.references]).map((ref, i) => `
            <div class="p-3 bg-surface-container rounded-xl border ghost-border text-slate-300 leading-relaxed">
              [${i + 1}] ${ref}
            </div>
          `).join('')}
        </div>
      </section>

    </div>
  `;
}

export function attachCollapsibleSectionEvents() {
  document.querySelectorAll('.report-collapsible-section .sec-header').forEach(header => {
    header.onclick = () => {
      const section = header.closest('.report-collapsible-section');
      if (!section) return;
      const body = section.querySelector('.sec-body');
      const icon = section.querySelector('.sec-toggle-icon');
      if (!body) return;

      if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        if (icon) icon.textContent = 'expand_less';
      } else {
        body.classList.add('hidden');
        if (icon) icon.textContent = 'expand_more';
      }
    };
  });
}
