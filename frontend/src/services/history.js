// History & Real Application Data Analytics Service

import { getUserSession } from '../state.js';
import { getAppMetrics, logUserActivity } from './storage.js';

export function getSavedReportsHistory() {
  const session = getUserSession();
  const email = session ? session.email : 'guest@insightlens.edu';
  try {
    return JSON.parse(localStorage.getItem(`insightlens_history_${email}`)) || [];
  } catch (err) {
    return [];
  }
}

export function saveReportsHistory(history) {
  const session = getUserSession();
  const email = session ? session.email : 'guest@insightlens.edu';
  try {
    localStorage.setItem(`insightlens_history_${email}`, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save reports history to localStorage:', err);
  }
}

export async function saveReportToHistory(imageDataUrl, reportData) {
  if (!reportData) return;
  const history = getSavedReportsHistory();

  let thumbDataUrl = imageDataUrl;
  if (typeof imageDataUrl === 'string' && imageDataUrl.length > 50000) {
    try {
      const { generateScaledThumbnail } = await import('../utils/canvas.js');
      thumbDataUrl = await generateScaledThumbnail(imageDataUrl, 500);
    } catch (tErr) {
      console.warn('Thumbnail scaling fallback:', tErr);
    }
  }

  const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const newEntry = {
    id: `RPT-${Date.now()}-${Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % 10000)}`,
    title: reportData.title || 'Image Research Brief',
    subject: reportData.subject || 'Visual Subject Assessment',
    category: reportData.category || 'General Research',
    summaryLead: reportData.executiveSummary || reportData.summaryLead || '',
    date: nowStr,
    timestamp: Date.now(),
    imageDataUrl: thumbDataUrl,
    fullImage: imageDataUrl,
    modelUsed: reportData.actualModel || reportData.modelUsed || 'gemini-2.5-flash',
    processingTimeMs: reportData.processingTimeMs || 2000,
    confidenceScore: reportData.confidenceScore || '96.8%',
    fullData: reportData,
    pdfAvailable: true,
    markdownAvailable: true,
    favorite: false
  };

  history.unshift(newEntry);
  if (history.length > 50) history.pop();
  saveReportsHistory(history);
  return newEntry;
}

export function deleteReportFromHistory(reportId) {
  let history = getSavedReportsHistory();
  const target = history.find(r => r.id === reportId);
  history = history.filter(r => r.id !== reportId);
  saveReportsHistory(history);
  logUserActivity('delete', `Deleted report: ${target ? target.title : reportId}`);
  return history;
}

export function duplicateReportInHistory(reportId) {
  const history = getSavedReportsHistory();
  const target = history.find(r => r.id === reportId);
  if (!target) return history;

  const nowStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const copyEntry = {
    ...target,
    id: `RPT-${Date.now()}-${Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % 10000)}`,
    title: `${target.title} (Copy)`,
    date: nowStr,
    timestamp: Date.now(),
    favorite: false
  };

  history.unshift(copyEntry);
  saveReportsHistory(history);
  logUserActivity('duplicate', `Duplicated report: ${target.title}`);
  return history;
}

export function toggleFavoriteReport(reportId) {
  const history = getSavedReportsHistory();
  const target = history.find(r => r.id === reportId);
  if (target) {
    target.favorite = !target.favorite;
    saveReportsHistory(history);
  }
  return history;
}

export function filterAndSortReports(reports, { query = '', dateFilter = 'all', modelFilter = 'all', categoryFilter = 'all', favoritesOnly = false, sortBy = 'newest' } = {}) {
  let result = [...reports];

  // 1. Search Query (Title, Category, Keywords, Executive Summary)
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(r => {
      const title = (r.title || '').toLowerCase();
      const cat = (r.category || '').toLowerCase();
      const summary = (r.summaryLead || '').toLowerCase();
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

export function computeRealDashboardStats() {
  const reports = getSavedReportsHistory();
  const metrics = getAppMetrics();

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

  reports.forEach(rpt => {
    const timestamp = rpt.timestamp || (rpt.id ? parseInt(rpt.id.replace('RPT-', ''), 10) : 0);

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
      totalProcessingMs += rpt.processingTimeMs;
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

  let storageBytes = 0;
  try {
    for (let k in localStorage) {
      if (localStorage.hasOwnProperty(k) && k.startsWith('insightlens')) {
        storageBytes += (localStorage[k] || '').length * 2;
      }
    }
  } catch (e) {}

  const avgProcessingTime = reportsWithTimeCount > 0 
    ? (totalProcessingMs / reportsWithTimeCount / 1000).toFixed(1) + 's' 
    : '0s';

  const avgConfidenceScore = reportsWithConfidenceCount > 0 
    ? (totalConfidenceSum / reportsWithConfidenceCount).toFixed(1) + '%' 
    : '0%';

  const lastAnalysisDate = metrics.lastAnalysisTimestamp 
    ? new Date(metrics.lastAnalysisTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (reports.length > 0 ? (reports[0].date || 'Recently') : 'Never');

  return {
    totalReports: reports.length,
    reportsToday: reportsTodayCount,
    reportsThisWeek: reportsThisWeekCount,
    totalImagesAnalyzed: metrics.totalImagesAnalyzed || reports.length,
    pdfExports: metrics.pdfExportsCount || 0,
    markdownExports: metrics.markdownExportsCount || 0,
    avgProcessingTime,
    avgConfidenceScore,
    mostUsedModel: mostUsedModel !== 'None' ? mostUsedModel : (metrics.lastSuccessfulModel || 'gemini-2.5-flash'),
    mostUsedCategory,
    storageUsedBytes: storageBytes,
    lastAnalysisDate,
    dayCounts,
    categoryCounts,
    modelCounts,
    reportsList: reports
  };
}
