import { 
  fetchExtensions, 
  installExtension, 
  enableExtension, 
  disableExtension, 
  uninstallExtension, 
  downloadExtensionPackage 
} from '../../services/extensionsApi.js';
import { 
  applyTheme, 
  applyTypography, 
  applyLayoutMode, 
  togglePresentationMode, 
  toggleFocusMode, 
  toggleDeveloperMode, 
  toggleAcademicMode 
} from '../../services/themeRuntime.js';
import { showToast } from '../../utils/toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { navigateTo } from '../../state.js';

let allExtensions = [];
let activeCategory = 'All';
let activeFilter = 'all'; // 'all', 'installed', 'enabled'
let searchQuery = '';

export async function renderExtensionManager() {
  const container = document.getElementById('extensions-catalog-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full py-12 flex flex-col items-center justify-center space-y-3">
      <div class="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
      <span class="text-xs font-mono text-slate-400">Loading extensions catalog...</span>
    </div>
  `;

  try {
    allExtensions = await fetchExtensions();
    updateExtensionsView();
  } catch (err) {
    container.innerHTML = `
      <div class="col-span-full p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
        <span class="material-symbols-outlined text-4xl text-rose-400">cloud_off</span>
        <h4 class="font-serif font-bold text-rose-200 text-base">Unable to load extensions</h4>
        <p class="text-xs text-rose-300 font-mono">${escapeHtml(err.message)}</p>
        <button onclick="window.renderExtensionManager()" class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-mono font-medium hover:bg-indigo-500 shadow-md cursor-pointer">Retry</button>
      </div>
    `;
  }
}

export function updateExtensionsView() {
  const container = document.getElementById('extensions-catalog-grid');
  if (!container) return;

  let filtered = [...allExtensions];

  // Category Filter
  if (activeCategory !== 'All') {
    filtered = filtered.filter(e => e.category?.toLowerCase() === activeCategory.toLowerCase());
  }

  // Status Filter
  if (activeFilter === 'installed') {
    filtered = filtered.filter(e => e.is_installed);
  } else if (activeFilter === 'enabled') {
    filtered = filtered.filter(e => e.is_enabled);
  }

  // Search Filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(e => 
      (e.name || '').toLowerCase().includes(q) || 
      (e.description || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  }

  // Update Category Badge Counters & Styles
  document.querySelectorAll('.ext-cat-pill').forEach(pill => {
    const cat = pill.getAttribute('data-category');
    if (cat === activeCategory) {
      pill.className = 'ext-cat-pill px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-mono text-xs font-medium cursor-pointer shadow-md transition-all';
    } else {
      pill.className = 'ext-cat-pill px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-mono text-xs font-medium cursor-pointer border border-white/5 transition-all';
    }
  });

  // Update Filter Tabs Counters
  const totalCount = allExtensions.length;
  const installedCount = allExtensions.filter(e => e.is_installed).length;
  const enabledCount = allExtensions.filter(e => e.is_enabled).length;

  document.querySelectorAll('.ext-filter-btn').forEach(btn => {
    const filter = btn.getAttribute('data-filter');
    let label = filter === 'installed' ? `Installed (${installedCount})` : (filter === 'enabled' ? `Enabled (${enabledCount})` : `All (${totalCount})`);
    btn.textContent = label;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-3 bg-surface-container/50 rounded-2xl border border-white/5 p-8">
        <span class="material-symbols-outlined text-4xl text-slate-500">search_off</span>
        <h4 class="font-serif font-bold text-slate-200 text-base">No matching extensions found</h4>
        <p class="text-xs text-slate-400 font-sans max-w-md mx-auto">
          ${activeFilter === 'installed' ? 'You do not have any extensions installed yet. Discover and install extensions from the catalog below.' : 'Try adjusting your category filter or search terms.'}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(ext => {
    const isInstalled = Boolean(ext.is_installed);
    const isEnabled = Boolean(ext.is_enabled);

    let statusBadge = '';
    let actionButtons = '';

    if (!isInstalled) {
      // 1. NOT INSTALLED STATE
      statusBadge = `
        <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[10px] font-mono text-slate-400">
          Not Installed
        </span>
      `;
      actionButtons = `
        <div class="flex items-center gap-2 w-full">
          <button onclick="window.handleDownloadExtension('${escapeHtml(ext.id)}')" title="Download extension .zip package" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[16px]">file_download</span>
          </button>
          <button onclick="window.handleInstallExtension('${escapeHtml(ext.id)}')" class="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium font-mono flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer">
            <span class="material-symbols-outlined text-[15px]">add_box</span>
            Install
          </button>
        </div>
      `;
    } else if (!isEnabled) {
      // 2. INSTALLED (DISABLED) STATE
      statusBadge = `
        <span class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300">
          Installed (Disabled)
        </span>
      `;
      actionButtons = `
        <div class="flex items-center gap-2 w-full">
          <button onclick="window.handleDownloadExtension('${escapeHtml(ext.id)}')" title="Download extension .zip package" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[16px]">file_download</span>
          </button>
          <button onclick="window.handleEnableExtension('${escapeHtml(ext.id)}')" class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer">
            <span class="material-symbols-outlined text-[15px]">power_settings_new</span>
            Enable
          </button>
          <button onclick="window.handleUninstallExtension('${escapeHtml(ext.id)}')" title="Uninstall Extension" class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      `;
    } else {
      // 3. ENABLED / ACTIVE STATE
      statusBadge = `
        <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Enabled
        </span>
      `;
      actionButtons = `
        <div class="flex items-center gap-2 w-full">
          <button onclick="window.handleDisableExtension('${escapeHtml(ext.id)}')" class="flex-1 py-2 px-2.5 rounded-xl bg-slate-800/90 text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 border border-white/10 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[15px]">pause_circle</span>
            Disable
          </button>
          
          <button onclick="window.handleConfigureExtension('${escapeHtml(ext.id)}')" title="Configure & Launch" class="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer flex items-center justify-center">
            <span class="material-symbols-outlined text-[16px]">tune</span>
          </button>

          <button onclick="window.handleUninstallExtension('${escapeHtml(ext.id)}')" title="Uninstall Extension" class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer flex items-center justify-center">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="report-card p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all group ${isEnabled ? 'border-indigo-500/30 bg-indigo-950/10' : ''}">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-[20px]">${escapeHtml(ext.icon || 'extension')}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              ${statusBadge}
              <span class="px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/5 text-[10px] font-mono text-slate-300">${escapeHtml(ext.category || 'General')}</span>
              <span class="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">v${escapeHtml(ext.version || '1.0.0')}</span>
            </div>
          </div>

          <div class="space-y-1">
            <h3 class="font-serif font-bold text-slate-100 text-sm sm:text-base group-hover:text-indigo-300 transition-colors">${escapeHtml(ext.name)}</h3>
            <p class="text-slate-400 text-xs font-sans leading-relaxed line-clamp-2">${escapeHtml(ext.description)}</p>
          </div>
        </div>

        <div class="pt-2 border-t border-white/5 space-y-3">
          <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>By ${escapeHtml(ext.author || 'InsightLens')}</span>
            ${ext.is_builtin ? '<span class="text-amber-400 font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">verified</span> Built-in</span>' : ''}
          </div>

          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
}

export function setupExtensionEvents() {
  window.renderExtensionManager = renderExtensionManager;

  // Category Pills
  document.querySelectorAll('.ext-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      activeCategory = pill.getAttribute('data-category') || 'All';
      updateExtensionsView();
    });
  });

  // Search Input
  const searchInput = document.getElementById('extension-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      updateExtensionsView();
    });
  }

  // Filter Buttons
  document.querySelectorAll('.ext-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.getAttribute('data-filter') || 'all';
      document.querySelectorAll('.ext-filter-btn').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white');
        b.classList.add('bg-slate-800', 'text-slate-400');
      });
      btn.classList.add('bg-indigo-600', 'text-white');
      btn.classList.remove('bg-slate-800', 'text-slate-400');
      updateExtensionsView();
    });
  });

  // Global Actions
  window.handleDownloadExtension = async (id) => {
    try {
      showToast(`Downloading package for "${id}"...`, 'info');
      await downloadExtensionPackage(id);
      showToast(`Extension package "${id}.zip" downloaded!`, 'success');
    } catch (err) {
      showToast(`Download error: ${err.message}`, 'error');
    }
  };

  window.handleInstallExtension = async (id) => {
    try {
      showToast(`Installing extension "${id}"...`, 'info');
      await installExtension(id);
      showToast(`Extension "${id}" installed! Click "Enable" to activate.`, 'success');
      await renderExtensionManager();
    } catch (err) {
      showToast(`Install error: ${err.message}`, 'error');
    }
  };

  window.handleEnableExtension = async (id) => {
    try {
      showToast(`Enabling extension "${id}"...`, 'info');
      await enableExtension(id);
      
      // Handle special runtime activations
      if (id === 'presentation-mode') togglePresentationMode(true);
      if (id === 'focus-mode') toggleFocusMode(true);
      if (id === 'developer-mode') toggleDeveloperMode(true);
      if (id === 'academic-mode') toggleAcademicMode(true);
      if (id === 'theme-studio') openThemeStudioModal();
      if (id === 'typography-lab') openTypographyLabModal();
      if (id === 'layout-packs') openLayoutsModal();
      if (id === 'prompt-playground') openPlaygroundModal();

      showToast(`Extension "${id}" enabled successfully!`, 'success');
      await renderExtensionManager();
    } catch (err) {
      showToast(`Enable error: ${err.message}`, 'error');
    }
  };

  window.handleDisableExtension = async (id) => {
    try {
      showToast(`Disabling extension "${id}"...`, 'info');
      await disableExtension(id);

      // Handle special runtime deactivations
      if (id === 'presentation-mode') togglePresentationMode(false);
      if (id === 'focus-mode') toggleFocusMode(false);
      if (id === 'developer-mode') toggleDeveloperMode(false);
      if (id === 'academic-mode') toggleAcademicMode(false);
      if (id === 'theme-studio') applyTheme('midnight-research');
      if (id === 'typography-lab') applyTypography('modern');
      if (id === 'layout-packs') applyLayoutMode('research-desk');

      showToast(`Extension "${id}" disabled and settings restored to default.`, 'info');
      await renderExtensionManager();
    } catch (err) {
      showToast(`Disable error: ${err.message}`, 'error');
    }
  };

  window.handleUninstallExtension = async (id) => {
    try {
      await uninstallExtension(id);

      // Revert runtime if needed
      if (id === 'presentation-mode') togglePresentationMode(false);
      if (id === 'focus-mode') toggleFocusMode(false);
      if (id === 'developer-mode') toggleDeveloperMode(false);
      if (id === 'academic-mode') toggleAcademicMode(false);
      if (id === 'theme-studio') applyTheme('midnight-research');
      if (id === 'typography-lab') applyTypography('modern');
      if (id === 'layout-packs') applyLayoutMode('research-desk');

      showToast(`Extension "${id}" uninstalled.`, 'info');
      await renderExtensionManager();
    } catch (err) {
      showToast(`Uninstall error: ${err.message}`, 'error');
    }
  };

  window.handleConfigureExtension = async (id) => {
    const ext = allExtensions.find(e => e.id === id);
    if (!ext) return;

    if (ext.id === 'theme-studio') {
      openThemeStudioModal();
    } else if (ext.id === 'typography-lab') {
      openTypographyLabModal();
    } else if (ext.id === 'layout-packs' || ext.id === 'ui-layouts') {
      openLayoutsModal();
    } else if (ext.id === 'prompt-playground' || ext.id === 'playground') {
      openPlaygroundModal();
    } else if (ext.id === 'academic-mode') {
      navigateTo('workspace');
    } else if (ext.id === 'research-mode') {
      navigateTo('desk');
    } else if (ext.id === 'hint-engine') {
      showToast('Contextual Hint Engine is active across all research screens.', 'info');
    } else {
      showToast(`Configuring settings for ${ext.name}`, 'info');
    }
  };
}

function openThemeStudioModal() {
  document.getElementById('theme-studio-modal')?.classList.add('show');
}

function openTypographyLabModal() {
  document.getElementById('typography-lab-modal')?.classList.add('show');
}

function openLayoutsModal() {
  document.getElementById('layouts-modal')?.classList.add('show');
}

function openPlaygroundModal() {
  document.getElementById('playground-modal')?.classList.add('show');
}
