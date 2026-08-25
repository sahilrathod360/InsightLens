// Table of Contents Side Panel Component

export const TOC_SECTIONS = [
  { id: 'sec-exec-summary', label: 'Executive Summary', icon: 'summarize' },
  { id: 'sec-identification', label: 'Identification', icon: 'fingerprint' },
  { id: 'sec-overview', label: 'Overview', icon: 'visibility' },
  { id: 'sec-history', label: 'Historical Background', icon: 'history' },
  { id: 'sec-technical', label: 'Technical / Scientific Details', icon: 'biotech' },
  { id: 'sec-applications', label: 'Applications', icon: 'apps' },
  { id: 'sec-key-facts', label: 'Key Facts', icon: 'fact_check' },
  { id: 'sec-interesting-facts', label: 'Interesting Facts', icon: 'lightbulb' },
  { id: 'sec-limitations', label: 'Limitations', icon: 'warning' },
  { id: 'sec-conclusion', label: 'Conclusion', icon: 'task_alt' },
  { id: 'sec-references', label: 'References', icon: 'menu_book' }
];

export function renderTableOfContents() {
  return `
    <nav aria-label="Table of contents" class="sticky top-24 bg-surface-container p-5 rounded-2xl border ghost-border space-y-4 shadow-lg text-xs font-mono">
      <div class="border-b ghost-border pb-3 flex items-center justify-between">
        <h3 class="font-serif font-bold text-slate-100 text-xs flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-400 text-[18px]">toc</span>
          Table of Contents
        </h3>
        <span class="text-[10px] text-slate-500 font-bold">11 SECTIONS</span>
      </div>

      <ul class="space-y-1.5">
        ${TOC_SECTIONS.map((sec, i) => `
          <li>
            <button 
              type="button" 
              class="toc-nav-link w-full text-left p-2 rounded-lg hover:bg-surface-container-lowest text-slate-300 hover:text-indigo-300 transition-colors flex items-center gap-2 cursor-pointer text-[11px]"
              data-target="${sec.id}"
            >
              <span class="material-symbols-outlined text-[15px] text-indigo-400 shrink-0">${sec.icon}</span>
              <span class="truncate font-sans font-medium">${i + 1}. ${sec.label}</span>
            </button>
          </li>
        `).join('')}
      </ul>
    </nav>
  `;
}

export function attachTocEvents() {
  document.querySelectorAll('.toc-nav-link').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        // Expand section if collapsed
        const body = targetEl.querySelector('.sec-body');
        const icon = targetEl.querySelector('.sec-toggle-icon');
        if (body && body.classList.contains('hidden')) {
          body.classList.remove('hidden');
          if (icon) icon.textContent = 'expand_less';
        }
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  });
}
