// History & Visual Intelligence Data Service (Backed by Aiven PostgreSQL)

import { getUserSession } from '../state.js';
import { logUserActivity } from './storage.js';
import { API_BASE, getAuthHeaders } from '../utils/api.js';

let lastHistoryError = null;
let lastArchiveError = null;

export function getLastHistoryError() {
  return lastHistoryError;
}

export function getLastArchiveError() {
  return lastArchiveError;
}

/**
 * Fetch all reports from PostgreSQL history endpoint.
 */
export async function getReportsHistory(filters = {}) {
  lastHistoryError = null;
  const session = getUserSession();
  const email = session ? session.email : 'guest@insightlens.edu';
  
  const params = new URLSearchParams({ email });
  const category = filters.categoryFilter || filters.category;
  if (category && category !== 'all') params.append('category', category);
  if (filters.q && filters.q.trim()) params.append('q', filters.q.trim());
  if (filters.favoritesOnly) params.append('favorites', 'true');

  const targetUrl = `${API_BASE}/api/history?${params.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      lastHistoryError = `Server returned HTTP ${res.status}`;
      console.warn(`[History Service] /api/history returned HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    lastHistoryError = err.message || 'Network error';
    console.error('[History Service] Error fetching reports from database:', err.message);
    return [];
  }
}

/**
 * Fetch all archived reports from PostgreSQL archive endpoint.
 */
export async function getArchive(filters = {}) {
  lastArchiveError = null;
  const session = getUserSession();
  const email = session ? session.email : 'guest@insightlens.edu';
  
  const params = new URLSearchParams({ email });
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.q && filters.q.trim()) params.append('q', filters.q.trim());
  if (filters.favoritesOnly) params.append('favorites', 'true');

  const targetUrl = `${API_BASE}/api/archive?${params.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      lastArchiveError = `Server returned HTTP ${res.status}`;
      console.warn(`[History Service] /api/archive returned HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    lastArchiveError = err.message || 'Network error';
    console.error('[History Service] Error fetching archive from database:', err.message);
    return [];
  }
}

export async function getArchivePage(filters = {}, page = 1, limit = 20) {
  lastArchiveError = null;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const category = filters.categoryFilter || filters.category;
  if (category && category !== 'all') params.append('category', category);
  const q = filters.query || filters.q;
  if (q && q.trim()) params.append('q', q.trim());
  if (filters.favoritesOnly) params.append('favorites', 'true');
  const model = filters.modelFilter || filters.model;
  if (model && model !== 'all') params.append('model', model);
  if (filters.sortBy) params.append('sort', filters.sortBy === 'confidence' ? 'evidence' : filters.sortBy);
  const now = Date.now();
  if (filters.dateFilter === 'today') {
    const today = new Date(); today.setHours(0, 0, 0, 0); params.append('since', String(today.getTime()));
  } else if (filters.dateFilter === 'week') params.append('since', String(now - 7 * 86400000));
  else if (filters.dateFilter === 'month') params.append('since', String(now - 30 * 86400000));

  try {
    const res = await fetch(`${API_BASE}/api/archive?${params.toString()}`, { method: 'GET', headers: getAuthHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.message || `Server returned HTTP ${res.status}`);
    return {
      reports: Array.isArray(json.data) ? json.data : [],
      page: Number(json.page || page),
      total: Number(json.total || (Array.isArray(json.data) ? json.data.length : 0)),
      totalPages: Math.max(1, Number(json.totalPages || 1)),
      limit: Number(json.limit || limit)
    };
  } catch (err) {
    lastArchiveError = err.message || 'Network error';
    return { reports: [], page, total: 0, totalPages: 1, limit };
  }
}

/**
 * Fetch a single report by ID from PostgreSQL.
 */
export async function getReportById(reportId) {
  if (!reportId) return null;
  const targetUrl = `${API_BASE}/api/report/${encodeURIComponent(reportId)}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error(`[History Service] Error fetching report ${reportId}:`, err.message);
    return null;
  }
}

/**
 * Delete a report by ID from PostgreSQL.
 */
export async function deleteReport(reportId) {
  if (!reportId) return false;
  const targetUrl = `${API_BASE}/api/archive/${encodeURIComponent(reportId)}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      logUserActivity('delete', `Deleted report: ${reportId}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[History Service] Error deleting report ${reportId}:`, err.message);
    return false;
  }
}

/**
 * Toggle favorite status of a report in PostgreSQL.
 */
export async function toggleFavorite(reportId) {
  if (!reportId) return null;
  const targetUrl = `${API_BASE}/api/report/${encodeURIComponent(reportId)}/favorite`;

  try {
    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error(`[History Service] Error toggling favorite for ${reportId}:`, err.message);
    return null;
  }
}

// Backward-compatible named exports
export const deleteReportFromHistory = deleteReport;
export const toggleFavoriteReport = toggleFavorite;
export const getSavedReportsHistory = getReportsHistory;

/**
 * Filter and sort a list of reports in memory.
 */
export function filterAndSortReports(reports = [], { query = '', dateFilter = 'all', modelFilter = 'all', categoryFilter = 'all', favoritesOnly = false, sortBy = 'newest' } = {}) {
  let result = Array.isArray(reports) ? [...reports] : [];

  // 1. Search Query (Title, Category, Keywords, Summary)
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(r => {
      const title = (r.title || '').toLowerCase();
      const cat = (r.category || '').toLowerCase();
      const summary = (r.summaryLead || r.summary || '').toLowerCase();
      const kw = (r.fullData?.generatedKeywords || []).join(' ').toLowerCase();
      return title.includes(q) || cat.includes(q) || summary.includes(q) || kw.includes(q);
    });
  }

  // 2. Date Filter
  if (dateFilter !== 'all') {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (dateFilter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      result = result.filter(r => (r.timestamp || 0) >= startOfToday.getTime());
    } else if (dateFilter === 'week') {
      result = result.filter(r => (r.timestamp || 0) >= now - 7 * oneDay);
    } else if (dateFilter === 'month') {
      result = result.filter(r => (r.timestamp || 0) >= now - 30 * oneDay);
    }
  }

  // 3. Model Filter
  if (modelFilter !== 'all') {
    result = result.filter(r => (r.modelUsed || '').toLowerCase().includes(modelFilter.toLowerCase()));
  }

  // 4. Category Filter
  if (categoryFilter !== 'all') {
    result = result.filter(r => (r.category || '').toLowerCase() === categoryFilter.toLowerCase());
  }

  // 5. Favorites Filter
  if (favoritesOnly) {
    result = result.filter(r => !!r.favorite);
  }

  // 6. Sort
  result.sort((a, b) => {
    if (sortBy === 'oldest') {
      return (a.timestamp || 0) - (b.timestamp || 0);
    }
    if (sortBy === 'confidence') {
      const confA = parseFloat(String(a.confidenceScore || '0').replace('%', ''));
      const confB = parseFloat(String(b.confidenceScore || '0').replace('%', ''));
      return confB - confA;
    }
    if (sortBy === 'alphabetical') {
      return (a.title || '').localeCompare(b.title || '');
    }
    // Default: newest
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  return result;
}

/**
 * Compute dashboard statistics from an array of reports.
 */
export function computeRealDashboardStats(reports = [], metrics = {}) {
  const reportList = Array.isArray(reports) ? reports : [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();

  let reportsTodayCount = 0;
  let reportsThisWeekCount = 0;
  let totalProcessingMs = 0;
  let reportsWithTimeCount = 0;
  let totalConfidenceSum = 0;
  let reportsWithConfidenceCount = 0;

  const modelCounts = {};
  const categoryCounts = {};
  const dayCounts = {};

  reportList.forEach(rpt => {
    const timestamp = Number(rpt.timestamp) || (rpt.id ? parseInt(rpt.id.replace('RPT-', ''), 10) : 0);

    if (timestamp >= startOfToday) reportsTodayCount++;
    if (timestamp >= startOfWeek) reportsThisWeekCount++;

    if (timestamp) {
      const dayKey = new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    }

    const model = rpt.modelUsed || rpt.fullData?.actualModel || 'gemini-2.5-flash';
    modelCounts[model] = (modelCounts[model] || 0) + 1;

    const cat = rpt.category || 'General Research';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    if (rpt.processingTimeMs) {
      totalProcessingMs += Number(rpt.processingTimeMs);
      reportsWithTimeCount++;
    }

    if (rpt.confidenceScore) {
      const num = parseFloat(String(rpt.confidenceScore).replace('%', ''));
      if (!isNaN(num)) {
        totalConfidenceSum += num;
        reportsWithConfidenceCount++;
      }
    }
  });

  let mostUsedModel = 'None';
  let maxModelVal = 0;
  for (let m in modelCounts) {
    if (modelCounts[m] > maxModelVal) {
      maxModelVal = modelCounts[m];
      mostUsedModel = m;
    }
  }

  let mostUsedCategory = 'None';
  let maxCatVal = 0;
  for (let c in categoryCounts) {
    if (categoryCounts[c] > maxCatVal) {
      maxCatVal = categoryCounts[c];
      mostUsedCategory = c;
    }
  }

  const avgProcessingTime = reportsWithTimeCount > 0 
    ? (totalProcessingMs / reportsWithTimeCount / 1000).toFixed(1) + 's' 
    : '0s';

  const avgConfidenceScore = reportsWithConfidenceCount > 0 
    ? (totalConfidenceSum / reportsWithConfidenceCount).toFixed(1) + '%' 
    : '0%';

  const lastAnalysisDate = metrics.lastAnalysisTimestamp 
    ? new Date(metrics.lastAnalysisTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (reportList.length > 0 ? (reportList[0].date || 'Recently') : 'Never');

  return {
    totalReports: reportList.length,
    reportsToday: reportsTodayCount,
    reportsThisWeek: reportsThisWeekCount,
    totalImagesAnalyzed: metrics.totalImagesAnalyzed || reportList.length,
    pdfExports: metrics.pdfExportsCount || 0,
    markdownExports: metrics.markdownExportsCount || 0,
    avgProcessingTime,
    avgConfidenceScore,
    mostUsedModel: mostUsedModel !== 'None' ? mostUsedModel : (metrics.lastSuccessfulModel || 'gemini-2.5-flash'),
    mostUsedCategory,
    lastAnalysisDate,
    dayCounts,
    categoryCounts,
    modelCounts,
    reportsList: reportList
  };
}
