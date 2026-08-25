// Backend API Integration

import { systemPreferences, loadPreferences } from './storage.js';
import { API_BASE } from '../utils/api.js';

export async function callGemini25Flash(dataUrl, researchLength, writingStyle, onAttemptModel = null, onRetryNotice = null) {
  const startMs = Date.now();
  
  if (!dataUrl) {
    throw new Error('No dataUrl provided for analysis.');
  }

  loadPreferences();
  const selectedProvider = systemPreferences.provider || 'auto';
  const lang = systemPreferences.language || 'en';

  const targetUrl = `${API_BASE}/api/analyze`;
  const payload = {
    dataUrl: dataUrl,
    promptObj: { researchLength, language: lang },
    preferredProvider: selectedProvider !== 'auto' ? selectedProvider : null
  };
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Backend Error ${response.status}`);
    }
    
    const json = await response.json();
    if (!json.success) {
      throw new Error(json.message || 'Analysis failed');
    }
    
    const elapsedMs = Date.now() - startMs;
    const finalData = json.data;
    finalData.processingTimeMs = elapsedMs;
    return finalData;
  } catch (err) {
    console.error('[InsightLens API] Analysis error:', err.message);
    throw err;
  }
}
