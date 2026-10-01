// Contextual Hint Engine Service

import { showToast } from '../utils/toast.js';

let hintsEnabled = true;
let hintFrequency = 'medium'; // 'low', 'medium', 'high'
let dismissedHints = new Set();

export function initHintEngine() {
  try {
    const raw = localStorage.getItem('insightlens_hint_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      hintsEnabled = parsed.enabled ?? true;
      hintFrequency = parsed.frequency || 'medium';
      if (Array.isArray(parsed.dismissed)) {
        dismissedHints = new Set(parsed.dismissed);
      }
    }
  } catch (e) {}
}

export function triggerContextualHint(triggerType, contextData = {}) {
  if (!hintsEnabled) return;
  if (hintFrequency === 'low' && Math.random() > 0.3) return;

  const hintId = `hint-${triggerType}`;
  if (dismissedHints.has(hintId)) return;

  let message = null;
  let actionLabel = null;
  let actionCallback = null;

  switch (triggerType) {
    case 'upload_completed':
      message = 'Tip: You can now stress-test implicit assumptions and run adversarial analysis on this document.';
      actionLabel = 'Stress Test';
      actionCallback = () => {
        if (typeof window.openKnowledgeAssumptions === 'function') {
          window.openKnowledgeAssumptions(contextData);
        }
      };
      break;

    case 'unsubstantiated_claims':
      message = 'InsightLens detected claims requiring evidence. Would you like to run AI Devil\'s Advocate?';
      actionLabel = 'Run Devil\'s Advocate';
      actionCallback = () => {
        if (typeof window.openDevilsAdvocate === 'function') {
          window.openDevilsAdvocate(contextData);
        }
      };
      break;

    case 'version_comparison':
      message = 'Tracking revisions? Run Knowledge Evolution to inspect semantic deltas and downstream impacts.';
      actionLabel = 'Compare Versions';
      actionCallback = () => {
        if (typeof window.openKnowledgeEvolution === 'function') {
          window.openKnowledgeEvolution();
        }
      };
      break;

    default:
      break;
  }

  if (message) {
    showToast(message, 'info');
  }
}

export function dismissHint(hintId) {
  dismissedHints.add(hintId);
  try {
    localStorage.setItem('insightlens_hint_settings', JSON.stringify({
      enabled: hintsEnabled,
      frequency: hintFrequency,
      dismissed: Array.from(dismissedHints)
    }));
  } catch (e) {}
}

export function setHintSettings(enabled, frequency = 'medium') {
  hintsEnabled = Boolean(enabled);
  hintFrequency = frequency;
  try {
    localStorage.setItem('insightlens_hint_settings', JSON.stringify({
      enabled: hintsEnabled,
      frequency: hintFrequency,
      dismissed: Array.from(dismissedHints)
    }));
  } catch (e) {}
}
