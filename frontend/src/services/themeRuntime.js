// Theme & Extensibility Runtime Manager

import { showToast } from '../utils/toast.js';

const THEME_DEFINITIONS = {
  'midnight-research': {
    '--bg-main': '#0B0F19',
    '--bg-canvas': '#0E1322',
    '--bg-card': '#151C30',
    '--bg-card-subtle': '#1C253E',
    '--border-color': '#263354',
    '--text-primary': '#F1F5F9',
    '--text-secondary': '#94A3B8',
    '--text-muted': '#64748B',
    '--accent-color': '#6366F1',
    '--accent-emerald': '#10B981',
    '--accent-amber': '#F59E0B',
    '--accent-purple': '#8B5CF6',
    '--accent-link': '#38BDF8',
    'isDark': true
  },
  'neo-glass': {
    '--bg-main': '#070913',
    '--bg-canvas': '#0A0E1F',
    '--bg-card': 'rgba(20, 27, 50, 0.85)',
    '--bg-card-subtle': 'rgba(30, 41, 75, 0.75)',
    '--border-color': 'rgba(139, 92, 246, 0.35)',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#A5B4FC',
    '--text-muted': '#818CF8',
    '--accent-color': '#8B5CF6',
    '--accent-emerald': '#34D399',
    '--accent-amber': '#FBBF24',
    '--accent-purple': '#A855F7',
    '--accent-link': '#22D3EE',
    'isDark': true
  },
  'terminal': {
    '--bg-main': '#050709',
    '--bg-canvas': '#080C10',
    '--bg-card': '#0E141C',
    '--bg-card-subtle': '#151D28',
    '--border-color': '#1E293B',
    '--text-primary': '#E2E8F0',
    '--text-secondary': '#94A3B8',
    '--text-muted': '#64748B',
    '--accent-color': '#10B981',
    '--accent-emerald': '#10B981',
    '--accent-amber': '#F59E0B',
    '--accent-purple': '#06B6D4',
    '--accent-link': '#10B981',
    'isDark': true
  },
  'paper': {
    '--bg-main': '#FBFBF9',
    '--bg-canvas': '#FFFFFF',
    '--bg-card': '#F4F4F0',
    '--bg-card-subtle': '#ECECE6',
    '--border-color': '#D8D8CF',
    '--text-primary': '#18181B',
    '--text-secondary': '#52525B',
    '--text-muted': '#71717A',
    '--accent-color': '#2563EB',
    '--accent-emerald': '#059669',
    '--accent-amber': '#D97706',
    '--accent-purple': '#7C3AED',
    '--accent-link': '#2563EB',
    'isDark': false
  },
  'solarized-lab': {
    '--bg-main': '#002B36',
    '--bg-canvas': '#073642',
    '--bg-card': '#094251',
    '--bg-card-subtle': '#0E5062',
    '--border-color': '#186478',
    '--text-primary': '#93A1A1',
    '--text-secondary': '#839496',
    '--text-muted': '#586E75',
    '--accent-color': '#268BD2',
    '--accent-emerald': '#2AA198',
    '--accent-amber': '#B58900',
    '--accent-purple': '#6C71C4',
    '--accent-link': '#2AA198',
    'isDark': true
  }
};

let currentActiveTheme = 'default';
let currentActiveTypography = 'academic';
let currentActiveLayout = 'research-desk';

export function applyTheme(themeSlug) {
  const root = document.documentElement;
  const theme = THEME_DEFINITIONS[themeSlug];

  if (!theme) {
    // Reset to default theme
    root.removeAttribute('data-theme');
    currentActiveTheme = 'default';
    return;
  }

  currentActiveTheme = themeSlug;
  root.setAttribute('data-theme', themeSlug);

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply variables
  for (const [key, val] of Object.entries(theme)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, val);
    }
  }

  try {
    localStorage.setItem('insightlens_active_theme', themeSlug);
  } catch (e) {}

  showToast(`Applied Theme: ${themeSlug.replace(/-/g, ' ').toUpperCase()}`, 'info');
}

export function applyTypography(typoSlug) {
  const root = document.documentElement;
  root.setAttribute('data-typography', typoSlug);
  currentActiveTypography = typoSlug;

  try {
    localStorage.setItem('insightlens_active_typography', typoSlug);
  } catch (e) {}

  showToast(`Typography Pack updated: ${typoSlug.toUpperCase()}`, 'info');
}

export function applyLayoutMode(layoutSlug) {
  const root = document.documentElement;
  root.setAttribute('data-layout', layoutSlug);
  currentActiveLayout = layoutSlug;

  try {
    localStorage.setItem('insightlens_active_layout', layoutSlug);
  } catch (e) {}

  showToast(`UI Layout updated: ${layoutSlug.replace(/-/g, ' ').toUpperCase()}`, 'info');
}

export function togglePresentationMode(enable) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-presentation-mode', 'true');
    showToast('Entered Presentation & Review Mode', 'info');
  } else {
    root.removeAttribute('data-presentation-mode');
    showToast('Exited Presentation Mode', 'info');
  }
}

export function toggleFocusMode(enable) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-focus-mode', 'true');
    showToast('Entered Focus Mode (Zen Workspace)', 'info');
  } else {
    root.removeAttribute('data-focus-mode');
    showToast('Exited Focus Mode', 'info');
  }
}

export function toggleDeveloperMode(enable) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-developer-mode', 'true');
    showToast('Developer & Telemetry Mode Enabled', 'info');
  } else {
    root.removeAttribute('data-developer-mode');
    showToast('Developer Mode Disabled', 'info');
  }
}

export function toggleAcademicMode(enable) {
  const root = document.documentElement;
  if (enable) {
    root.setAttribute('data-academic-mode', 'true');
    showToast('Academic Mode Activated', 'info');
  } else {
    root.removeAttribute('data-academic-mode');
    showToast('Academic Mode Deactivated', 'info');
  }
}

export function initThemeRuntime() {
  try {
    const savedTheme = localStorage.getItem('insightlens_active_theme');
    if (savedTheme && THEME_DEFINITIONS[savedTheme]) {
      applyTheme(savedTheme);
    }
    const savedTypo = localStorage.getItem('insightlens_active_typography');
    if (savedTypo) {
      applyTypography(savedTypo);
    }
    const savedLayout = localStorage.getItem('insightlens_active_layout');
    if (savedLayout) {
      applyLayoutMode(savedLayout);
    }
  } catch (e) {}
}
