import './style.css';
import { registerRenderCallbacks, navigateTo } from './state.js';
import { loadPreferences, initPersistentSession } from './services/storage.js';

import { setupNavigation, setupMobileDrawer, setupGlobalKeyboardEvents, setupTheme, setupAuthEvents, setupLogoutModal, setupUserDropdownMenu, setAuthMode, updateAuthUI } from './components/Navbar.js';
import { setupUploadEvents } from './components/ResearchDesk.js';
import { startAnalysisPipeline, setupLoadingFailureActions } from './components/LoadingPipeline.js';
import { setupReportActions } from './components/ReportViewer.js';
import { setupDashboardEvents, renderDashboard } from './components/Dashboard.js';
import { renderArchivePage } from './components/Archive.js';
import { setupSettingsEvents, renderSettingsPage } from './components/Settings.js';
import { setupProfileEvents, renderProfilePage } from './pages/Profile.js';
import { setupMethodologyEvents } from './components/Methodology.js';
import { setupLandingPageEvents } from './pages/Landing.js';
import { exportCleanPDF } from './utils/export.js';
import { getActiveReportData, setActiveReportData } from './state.js';
import { renderResultScreen } from './components/ReportViewer.js';

import { setupExtensionEvents, renderExtensionManager } from './components/Extensions/ExtensionManagerComponent.js';
import { setupKnowledgeEvents, renderKnowledgePage } from './components/Knowledge/KnowledgeComponent.js';
import { initThemeRuntime, applyTheme, applyTypography, applyLayoutMode } from './services/themeRuntime.js';
import { initHintEngine } from './services/hintEngine.js';

window.exportCleanPDF = exportCleanPDF;
window.getActiveReportData = getActiveReportData;
window.setActiveReportData = setActiveReportData;
window.renderResultScreen = renderResultScreen;
window.applyTheme = applyTheme;
window.applyTypography = applyTypography;
window.applyLayoutMode = applyLayoutMode;

// Global helper routes for contextual intelligence actions
window.openKnowledgeAssumptions = (data) => {
  navigateTo('knowledge');
  if (typeof window.switchKnowledgeTab === 'function') window.switchKnowledgeTab('assumptions');
  if (data && document.getElementById('assumptions-doc-input')) {
    document.getElementById('assumptions-doc-input').value = data.text || '';
  }
};

window.openDevilsAdvocate = (data) => {
  navigateTo('knowledge');
  if (typeof window.switchKnowledgeTab === 'function') window.switchKnowledgeTab('adversarial');
  if (data && document.getElementById('adversarial-input')) {
    document.getElementById('adversarial-input').value = data.text || '';
  }
};

window.openKnowledgeEvolution = () => {
  navigateTo('knowledge');
  if (typeof window.switchKnowledgeTab === 'function') window.switchKnowledgeTab('evolution');
};

document.addEventListener('DOMContentLoaded', async () => {
  // Register render callbacks to resolve cross-module calls without circular dependencies
  registerRenderCallbacks({
    renderArchivePage,
    renderDashboard,
    renderProfilePage,
    renderSettingsPage,
    renderExtensionManager,
    renderKnowledgePage,
    updateAuthUI,
    setAuthModeUI: setAuthMode
  });

  loadPreferences();
  initThemeRuntime();
  initHintEngine();
  setupTheme();
  setupNavigation();
  setupMobileDrawer();
  setupUploadEvents(startAnalysisPipeline);
  setupAuthEvents(renderArchivePage, renderDashboard);
  setupProfileEvents();
  setupSettingsEvents();
  setupExtensionEvents();
  setupKnowledgeEvents();
  setupLogoutModal(renderArchivePage);
  setupReportActions(startAnalysisPipeline);
  setupLoadingFailureActions();
  setupUserDropdownMenu();
  setupDashboardEvents();
  setupGlobalKeyboardEvents();
  setupLandingPageEvents();
  setupMethodologyEvents();

  // Authoritatively restore session from PostgreSQL via backend /api/auth/me in background
  initPersistentSession(updateAuthUI);

  // If user directly opened or bookmarked a specific protected hash/view, render on demand
  if (window.location.hash === '#archive' || document.getElementById('page-archive')?.classList.contains('active')) {
    renderArchivePage();
  } else if (window.location.hash === '#dashboard' || document.getElementById('page-dashboard')?.classList.contains('active')) {
    renderDashboard();
  } else if (window.location.hash === '#extensions' || document.getElementById('page-extensions')?.classList.contains('active')) {
    renderExtensionManager();
  } else if (window.location.hash === '#knowledge' || document.getElementById('page-knowledge')?.classList.contains('active')) {
    renderKnowledgePage();
  }
});

