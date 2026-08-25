// Researcher Dashboard Component Module Bridge

import { renderRealDashboard } from './Dashboard/DashboardComponent.js';

export function setupDashboardEvents() {
  renderRealDashboard();
}

export function renderDashboard() {
  renderRealDashboard();
}

export { saveReportToHistory } from './Dashboard/DashboardComponent.js';
