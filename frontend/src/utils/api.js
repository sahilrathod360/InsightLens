// API Utility Functions: Error Handling, Classification & Retry Logic
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, type, isRetryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type; // 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'MODEL_UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR' | 'UNKNOWN'
    this.isRetryable = isRetryable;
  }
}

export function classifyApiError(status, messageStr = '') {
  const lowerMsg = messageStr.toLowerCase();

  if (status === 400 || status === 401 || status === 403 || lowerMsg.includes('api_key_invalid') || lowerMsg.includes('unauthorized') || lowerMsg.includes('invalid api key')) {
    return new ApiError(
      'Invalid API Key. Please verify your API key in Settings.',
      status,
      'INVALID_KEY',
      false
    );
  }

  if (status === 429 || lowerMsg.includes('quota') || lowerMsg.includes('rate limit') || lowerMsg.includes('resource_exhausted')) {
    return new ApiError(
      'API Quota Exceeded (HTTP 429). The system rate limit has been reached for this key.',
      status,
      'QUOTA_EXCEEDED',
      false
    );
  }

  if (status === 503 || status === 500 || lowerMsg.includes('unavailable') || lowerMsg.includes('overloaded')) {
    return new ApiError(
      'Model service temporarily unavailable or overloaded (HTTP ' + status + ').',
      status,
      'MODEL_UNAVAILABLE',
      true
    );
  }

  return new ApiError(
    messageStr || `API Error (HTTP ${status || 'Unknown'})`,
    status || 0,
    'UNKNOWN',
    status >= 500
  );
}

export async function fetchWithRetry(url, options, maxRetries = 2, timeoutMs = 8000, onRetry = null) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok) {
        return response;
      }

      const status = response.status;
      const errorText = await response.text().catch(() => '');
      const classifiedError = classifyApiError(status, errorText);

      if (!classifiedError.isRetryable || attempt > maxRetries) {
        throw classifiedError;
      }

      lastError = classifiedError;
      if (typeof onRetry === 'function') {
        onRetry(attempt, maxRetries, classifiedError);
      }

      const backoffMs = Math.pow(2, attempt) * 500;
      await new Promise(res => setTimeout(res, backoffMs));

    } catch (err) {
      clearTimeout(timer);

      if (err.name === 'AbortError') {
        const timeoutErr = new ApiError(`Request timed out after ${timeoutMs / 1000}s`, 408, 'TIMEOUT', true);
        if (attempt <= maxRetries) {
          lastError = timeoutErr;
          if (typeof onRetry === 'function') {
            onRetry(attempt, maxRetries, timeoutErr);
          }
          await new Promise(res => setTimeout(res, 1000));
          continue;
        }
        throw timeoutErr;
      }

      if (err instanceof ApiError) {
        if (!err.isRetryable || attempt > maxRetries) {
          throw err;
        }
        lastError = err;
      } else {
        const netErr = new ApiError(err.message || 'Network communication failure', 0, 'NETWORK_ERROR', true);
        if (attempt > maxRetries) {
          throw netErr;
        }
        lastError = netErr;
      }

      if (typeof onRetry === 'function') {
        onRetry(attempt, maxRetries, lastError);
      }
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw lastError || new ApiError('API request failed after retries', 0, 'UNKNOWN', false);
}
