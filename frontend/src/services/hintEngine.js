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
      message = 'Tip: Inspect extracted visual evidence regions and verify grounded claims in the Visual Workspace.';
      actionLabel = 'Inspect Evidence';
      actionCallback = () => {
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('workspace');
        }
      };
      break;

    case 'unsubstantiated_claims':
      message = 'InsightLens detected claims requiring evidence. Ground claims to visual coordinates in the Evidence Viewer.';
      actionLabel = 'Ground Claims';
      actionCallback = () => {
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('workspace');
        }
      };
      break;

    case 'version_comparison':
      message = 'Tracking revisions? Run Visual Comparison to inspect topological deltas and visual differences.';
      actionLabel = 'Compare Visuals';
      actionCallback = () => {
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('workspace');
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
