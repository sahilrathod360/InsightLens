// AI Provider & Model Candidates Configuration
// Easily extensible to add new providers or models in the future

export const PROVIDER_CONFIG = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini AI',
    enabled: true,
    candidates: [
      { id: 'gemini-3.5-flash', timeoutMs: 16000 },
      { id: 'gemini-3.5-flash-lite', timeoutMs: 25000 }
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    enabled: true,
    candidates: [
      { id: 'google/gemini-3.5-flash-lite', timeoutMs: 12000 },
      { id: 'google/gemini-3.7-flash', timeoutMs: 14000 }
    ]
  }
};
