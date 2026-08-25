// Report Header Component with Metadata & Thumbnail

export function renderReportHeader(formatted) {
  if (!formatted) return '';
  const { header, title, category, thumbnailUrl } = formatted;

  return `
    <!-- ENHANCED REPORT HEADER WITH THUMBNAIL & METADATA -->
    <header class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border ghost-border space-y-6 shadow-xl">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        <!-- LEFT: THUMBNAIL PREVIEW -->
        <div class="md:col-span-4 shrink-0">
          <div class="relative h-48 md:h-52 bg-black/40 rounded-xl overflow-hidden border ghost-border flex items-center justify-center p-2">
            <img src="${thumbnailUrl}" alt="Report Visual Source" class="max-h-full max-w-full object-contain rounded-lg shadow-md" />
            <div class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs px-2.5 py-0.5 rounded text-[10px] font-mono text-indigo-300 border border-white/10 font-bold">
              Visual Source
            </div>
          </div>
        </div>

        <!-- RIGHT: TITLE & METADATA GRID -->
        <div class="md:col-span-8 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono font-bold border border-indigo-500/20">
              ${category.toUpperCase()}
            </span>
            <span class="text-xs font-mono text-slate-400">
              Generated: <strong class="text-slate-200">${header.date}</strong>
            </span>
          </div>

          <h1 class="font-serif text-2xl md:text-3xl text-slate-100 font-bold leading-tight">
            ${title}
          </h1>

          <!-- 5 METADATA CARDS -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-mono">
            <div class="p-2.5 bg-surface-container rounded-xl border ghost-border space-y-0.5">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">AI Provider</span>
              <strong class="text-indigo-400 text-[11px] block truncate">${header.aiProvider}</strong>
            </div>

            <div class="p-2.5 bg-surface-container rounded-xl border ghost-border space-y-0.5">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Model Used</span>
              <strong class="text-purple-300 text-[11px] block truncate">${header.modelUsed}</strong>
            </div>

            <div class="p-2.5 bg-surface-container rounded-xl border ghost-border space-y-0.5">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Processing Time</span>
              <strong class="text-sky-300 text-[11px] block">${header.processingTime}</strong>
            </div>

            <div class="p-2.5 bg-surface-container rounded-xl border ghost-border space-y-0.5">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Confidence</span>
              <strong class="text-emerald-400 text-[11px] block">${header.confidence}</strong>
            </div>

            <div class="p-2.5 bg-surface-container rounded-xl border ghost-border space-y-0.5 col-span-2 sm:col-span-2">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Timestamp</span>
              <strong class="text-slate-300 text-[11px] block truncate">${header.date}</strong>
            </div>
          </div>
        </div>

      </div>
    </header>
  `;
}
