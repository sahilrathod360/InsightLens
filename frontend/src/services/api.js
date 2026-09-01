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
      if (response.status === 429) {
        throw new Error('Analysis rate limit reached. Please wait a moment before trying again.');
      }
      if (response.status === 413) {
        throw new Error('Image size is too large. Please select an image under 20MB.');
      }
      throw new Error(errJson.message || `Analysis temporarily unavailable (Server response ${response.status}). Please try again.`);
    }
    
    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.message || 'Analysis could not be completed. Please try again.');
    }
    
    const elapsedMs = Date.now() - startMs;
    const finalData = json.data;
    finalData.processingTimeMs = elapsedMs;
    return finalData;
  } catch (err) {
    console.error('[InsightLens API] Analysis error:', err.message);
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the analysis service. Please check your internet connection or try again.');
    }
    throw err;
  }
}
