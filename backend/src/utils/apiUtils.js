export class APIError extends Error {
  constructor(message, statusCode = 500, provider = 'API', type = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.provider = provider;
    this.type = type;
  }
}

export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

export function sendError(res, message = 'Error occurred', statusCode = 500, errors = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  });
}

export async function fetchWithRetry(url, options, maxRetries = 2, timeoutMs = 10000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(id);

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = JSON.stringify(errData);
        } catch (e) {}

        const err = new Error(`Request failed with status ${response.status}: ${errorMsg}`);
        err.status = response.status;
        throw err;
      }

      return response;
    } catch (err) {
      clearTimeout(id);

      // Do not retry on 401 Unauthorized or 403 Forbidden or 400 Bad Request
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404) {
        throw err;
      }

      if (attempt === maxRetries) {
        throw err;
      }

      console.log(`[API] Retry ${attempt + 1}/${maxRetries} after error: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // exponential backoff
    }
  }
}
