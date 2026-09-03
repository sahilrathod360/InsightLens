// Universal Markdown to HTML Renderer for Research Reports
// Handles tables, headings, bold/italics, bullet lists, code blocks, and callouts

export function renderMarkdownToHtml(md) {
  if (!md || typeof md !== 'string') return '';

  const lines = md.trim().split('\n');
  const out = [];
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];
  let inList = false;
  let listItems = [];

  const flushTable = () => {
    if (!inTable) return;
    let html = '<div class="overflow-x-auto my-3 rounded-xl border ghost-border shadow-sm"><table class="w-full text-xs text-left border-collapse">';
    if (tableHeader.length > 0) {
      html += '<thead class="bg-surface-container-highest/60 text-slate-200 font-semibold uppercase text-[10px] tracking-wider border-b ghost-border"><tr>';
      tableHeader.forEach(cell => {
        html += `<th class="p-3 font-mono">${cell}</th>`;
      });
      html += '</tr></thead>';
    }
    html += '<tbody class="divide-y ghost-border">';
    tableRows.forEach(row => {
      html += '<tr class="hover:bg-white/5 transition-colors">';
      row.forEach(cell => {
        html += `<td class="p-3 text-slate-300">${formatInline(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    out.push(html);
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  const flushList = () => {
    if (!inList) return;
    let html = '<ul class="space-y-1.5 my-2.5 pl-4 text-slate-300">';
    listItems.forEach(item => {
      html += `<li class="list-disc">${formatInline(item)}</li>`;
    });
    html += '</ul>';
    out.push(html);
    inList = false;
    listItems = [];
  };

  const formatInline = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-slate-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-container-highest font-mono text-[11px] text-indigo-300 border ghost-border">$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      // Check if separator line (e.g. |---|---|)
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Check for Bullet List Item
    if (/^[-*•]\s+/.test(trimmed)) {
      flushTable();
      inList = true;
      listItems.push(trimmed.replace(/^[-*•]\s+/, ''));
      continue;
    } else if (inList) {
      flushList();
    }

    // Empty line
    if (!trimmed) {
      continue;
    }

    // Headers
    if (trimmed.startsWith('#### ')) {
      out.push(`<h5 class="font-sans font-bold text-slate-200 text-xs mt-3 mb-1 uppercase tracking-wider">${formatInline(trimmed.slice(5))}</h5>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      out.push(`<h4 class="font-serif font-bold text-indigo-300 text-sm mt-4 mb-2 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>${formatInline(trimmed.slice(4))}</h4>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      out.push(`<h3 class="font-serif font-bold text-slate-100 text-base mt-5 mb-2 border-b ghost-border pb-1">${formatInline(trimmed.slice(3))}</h3>`);
      continue;
    }

    // Standard Paragraph
    out.push(`<p class="leading-relaxed mb-3 text-slate-300">${formatInline(trimmed)}</p>`);
  }

  flushTable();
  flushList();

  return out.join('');
}
