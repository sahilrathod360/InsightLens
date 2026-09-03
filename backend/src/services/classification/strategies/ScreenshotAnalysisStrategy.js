import { BaseAnalysisStrategy } from './BaseAnalysisStrategy.js';

export class ScreenshotAnalysisStrategy extends BaseAnalysisStrategy {
  constructor() {
    super('screenshot', 'ScreenshotAnalysisStrategy', 'Screenshot Analysis Pipeline');
  }

  getInstructions() {
    return `SPECIALIZED SCREENSHOT & UI PIPELINE GUIDELINES:
- Identify the software interface context if visually apparent (e.g., web application, mobile UI, desktop operating system, IDE code editor, administrative dashboard, terminal/CLI, game interface).
- Catalog key visible UI/UX components: navigation headers, breadcrumbs, sidebars, active tabs, modal overlays, input forms, interactive buttons.
- Document system status, visible notifications, alerts, toast banners, or explicit error codes/messages.
- Transcribe code snippets, console logs, or tabular data views that are clearly legible.
- Evaluate the apparent user workflow or operational state represented by the capture (e.g., checkout flow, configuration panel, authentication barrier, diagnostic trace).
- STRICT PROHIBITION: Do NOT assert or speculate on unobservable backend architecture, hidden database state, or private internal system logic not visually evidenced in the UI capture.`;
  }
}

export default ScreenshotAnalysisStrategy;
