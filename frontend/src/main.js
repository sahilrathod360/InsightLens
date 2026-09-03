import './style.css';
import { registerRenderCallbacks } from './state.js';
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

window.exportCleanPDF = exportCleanPDF;
window.getActiveReportData = getActiveReportData;
window.setActiveReportData = setActiveReportData;
window.renderResultScreen = renderResultScreen;

document.addEventListener('DOMContentLoaded', async () => {
  // Register render callbacks to resolve cross-module calls without circular dependencies
  registerRenderCallbacks({
    renderArchivePage,
    renderDashboard,
    renderProfilePage,
    renderSettingsPage,
    updateAuthUI,
    setAuthModeUI: setAuthMode
  });

  loadPreferences();
  setupTheme();
  setupNavigation();
  setupMobileDrawer();
  setupUploadEvents(startAnalysisPipeline);
  setupAuthEvents(renderArchivePage, renderDashboard);
  setupProfileEvents();
  setupSettingsEvents();
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
  }
});
