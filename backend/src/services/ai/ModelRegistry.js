// Centralized, Extensible AI Vision Model Registry for InsightLens
// Only vision-capable models with structured output support are registered.

export const MODEL_REGISTRY = [
  // --- GOOGLE GEMINI MULTIMODAL FLASH MODELS ---
  {
    id: 'gemini-3.7-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.7 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 16000,
    speedTier: 'FAST',
    priority: 100,
    enabled: true,
    thinkingConfig: { thinking_budget: 0 } // Zero thinking budget for lowest latency
  },
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 18000,
    speedTier: 'FAST',
    priority: 95,
    enabled: true,
    thinkingConfig: undefined // Flash Lite default (thinking_budget not supported)
  },
  {
    id: 'gemini-3.6-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.6 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 18000,
    speedTier: 'BALANCED',
    priority: 85,
    enabled: true,
    thinkingConfig: { thinking_budget: 0 }
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 18000,
    speedTier: 'BALANCED',
    priority: 80,
    enabled: true,
    thinkingConfig: { thinking_budget: 0 }
  },

  // --- OPENROUTER VISION MODELS ---
  {
    id: 'google/gemini-3.8-flash',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 12000,
    speedTier: 'FAST',
    priority: 90,
    enabled: true
  },
  {
    id: 'google/gemini-3.5-flash-lite',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 3.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 12000,
    speedTier: 'FAST',
    priority: 88,
    enabled: true
  },
  {
    id: 'qwen/qwen3.8-flash',
    provider: 'openrouter',
    displayName: 'OpenRouter: Qwen 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 14000,
    speedTier: 'BALANCED',
    priority: 75,
    enabled: true
  },
  {
    id: 'meta/muse-spark-1.3',
    provider: 'openrouter',
    displayName: 'OpenRouter: Muse Spark 1.3',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 14000,
    speedTier: 'BALANCED',
    priority: 70,
    enabled: true
  }
];

class ModelRegistry {
  constructor() {
    this.models = new Map();
    MODEL_REGISTRY.forEach(m => this.models.set(m.id, { ...m }));
  }

  getModel(modelId) {
    return this.models.get(modelId);
  }

  getAllModels() {
    return Array.from(this.models.values());
  }

  registerModel(modelConfig) {
    if (!modelConfig.id || !modelConfig.provider) {
      throw new Error('Model configuration requires id and provider');
    }
    this.models.set(modelConfig.id, {
      vision: true,
      structuredJson: true,
      maxOutputTokens: 6000,
      timeoutMs: 15000,
      speedTier: 'BALANCED',
      priority: 50,
      enabled: true,
      ...modelConfig
    });
  }

  getVisionCandidates({ maxCandidates = 4, hasGeminiKey = true, hasOpenRouterKey = true } = {}) {
    const candidates = Array.from(this.models.values())
      .filter(m => m.enabled && m.vision)
      .filter(m => {
        if (m.provider === 'gemini') return hasGeminiKey;
        if (m.provider === 'openrouter') return hasOpenRouterKey;
        return false;
      })
      .sort((a, b) => b.priority - a.priority);

    return candidates.slice(0, maxCandidates);
  }
}

export default new ModelRegistry();
