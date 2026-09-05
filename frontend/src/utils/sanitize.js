import DOMPurifyModule from 'dompurify';

/**
 * Escapes raw strings for safe insertion into HTML.
 * Converts special characters (&, <, >, ", ') to HTML entities.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes URLs to reject dangerous protocols (javascript:, vbscript:, data: text/html, etc.).
 * Strictly permits safe web protocols: http: and https: (or relative paths like /images/...).
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Explicitly reject dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return '';
  }

  // Allow relative URLs starting with / or ./
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  // Allow valid http and https URLs
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Robust DOMPurify sanitizer configuration for rich Markdown and AI report rendering.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 'code', 'pre',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'hr', 'br', 'a', 'img', 'mark'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'data-id', 'data-page', 'data-type',
    'href', 'src', 'alt', 'title', 'target', 'rel',
    'width', 'height', 'style'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target', 'rel']
};

/**
 * Initialize DOMPurify instance supporting both browser and headless environments.
 */
let domPurifyInstance = null;
try {
  if (typeof window !== 'undefined' && DOMPurifyModule) {
    domPurifyInstance = typeof DOMPurifyModule.sanitize === 'function' 
      ? DOMPurifyModule 
      : DOMPurifyModule(window);

    if (domPurifyInstance && typeof domPurifyInstance.addHook === 'function') {
      domPurifyInstance.addHook('afterSanitizeAttributes', function (node) {
        if (node.tagName === 'A' && node.hasAttribute('href')) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
          const href = node.getAttribute('href');
          if (!/^https?:\/\//i.test(href) && !href.startsWith('/')) {
            node.removeAttribute('href');
          }
        }
      });
    }
  }
} catch (e) {
  domPurifyInstance = null;
}

/**
 * Sanitizes rich HTML strings using DOMPurify with strict fallback.
 */
export function sanitizeHtml(dirtyHtml, options = {}) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  if (domPurifyInstance && typeof domPurifyInstance.sanitize === 'function') {
    return domPurifyInstance.sanitize(dirtyHtml, {
      ...SANITIZE_CONFIG,
      ...options
    });
  }

  // Fallback sanitizer for environments where DOMPurify DOM context is unavailable
  return dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, 'href=""')
    .replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, 'src=""');
}
