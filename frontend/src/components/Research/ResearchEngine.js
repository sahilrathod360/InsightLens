// Research Engine Component Module

import { callGemini25Flash } from '../../services/api.js';

export async function executeResearchTask(dataUrl, researchLength, writingStyle, onAttemptModel, onRetryNotice) {
  return await callGemini25Flash(dataUrl, researchLength, writingStyle, onAttemptModel, onRetryNotice);
}
