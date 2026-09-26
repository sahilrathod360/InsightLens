/**
 * Phase 1: Structural Chart Extraction & Validation Engine
 * 
 * Provides controlled vocabularies, numerical validation, and resilient
 * structural extraction for charts and data visualizations (Bar, Line, Pie, Scatter, Area, Histogram, Radar).
 */

export const CONTROLLED_CHART_TYPES = [
  'bar',
  'line',
  'pie',
  'donut',
  'scatter',
  'area',
  'histogram',
  'radar',
  'generic chart'
];

export const CONTROLLED_TREND_DIRECTIONS = [
  'increasing',
  'decreasing',
  'stable',
  'volatile',
  'cyclical'
];

export const CONTROLLED_AXIS_SCALES = [
  'categorical',
  'linear',
  'time',
  'logarithmic',
  'percentage'
];

export class ChartStructureValidator {
  /**
   * Normalizes raw chart type to controlled vocabulary.
   */
  static normalizeChartType(rawType) {
    if (!rawType || typeof rawType !== 'string') return 'generic chart';
    const clean = rawType.trim().toLowerCase();

    if (CONTROLLED_CHART_TYPES.includes(clean)) {
      return clean;
    }

    if (/\b(bar|column|histogram)\b/i.test(clean)) {
      return clean.includes('histogram') ? 'histogram' : 'bar';
    }
    if (/\b(line|trend|time[-_\s]*series|curve)\b/i.test(clean)) {
      return 'line';
    }
    if (/\b(pie|donut|doughnut)\b/i.test(clean)) {
      return clean.includes('donut') || clean.includes('doughnut') ? 'donut' : 'pie';
    }
    if (/\b(scatter|bubble|xy|dispersion)\b/i.test(clean)) {
      return 'scatter';
    }
    if (/\b(area|stacked[-_\s]*area)\b/i.test(clean)) {
      return 'area';
    }
    if (/\b(radar|spider|polar)\b/i.test(clean)) {
      return 'radar';
    }

    return 'generic chart';
  }

  /**
   * Normalizes trend direction to controlled vocabulary.
   */
  static normalizeTrendDirection(rawDir) {
    if (!rawDir || typeof rawDir !== 'string') return 'stable';
    const clean = rawDir.trim().toLowerCase();
    if (CONTROLLED_TREND_DIRECTIONS.includes(clean)) return clean;
    if (/\b(up|upward|growth|increase|rising|gain)\b/i.test(clean)) return 'increasing';
    if (/\b(down|downward|decline|decrease|falling|loss|drop)\b/i.test(clean)) return 'decreasing';
    if (/\b(flat|constant|even|neutral)\b/i.test(clean)) return 'stable';
    if (/\b(fluctuat|erratic|swing|spike)\b/i.test(clean)) return 'volatile';
    if (/\b(cycle|seasonal|periodic)\b/i.test(clean)) return 'cyclical';
    return 'stable';
  }

  /**
   * Validates and repairs a chartStructure object.
   */
  static validateAndRepair(rawStructure, isChart = true) {
    if (!isChart && (!rawStructure || typeof rawStructure !== 'object')) {
      return null;
    }

    if (!rawStructure || typeof rawStructure !== 'object') {
      return {
        chartType: 'generic chart',
        title: null,
        xAxis: { label: null, unit: null, scale: 'categorical' },
        yAxis: { label: null, unit: null, scale: 'linear' },
        series: [],
        dataPoints: [],
        trends: [],
        anomalies: [],
        observations: []
      };
    }

    const chartType = ChartStructureValidator.normalizeChartType(rawStructure.chartType || rawStructure.type);
    const title = typeof rawStructure.title === 'string' && rawStructure.title.trim()
      ? rawStructure.title.trim()
      : null;

    // 1. Process Axes
    const rawX = rawStructure.xAxis || rawStructure.x_axis || {};
    const rawY = rawStructure.yAxis || rawStructure.y_axis || {};

    const xAxis = {
      label: typeof rawX.label === 'string' && rawX.label.trim() ? rawX.label.trim() : null,
      unit: typeof rawX.unit === 'string' && rawX.unit.trim() ? rawX.unit.trim() : null,
      scale: typeof rawX.scale === 'string' && CONTROLLED_AXIS_SCALES.includes(rawX.scale.toLowerCase().trim())
        ? rawX.scale.toLowerCase().trim()
        : 'categorical'
    };

    const yAxis = {
      label: typeof rawY.label === 'string' && rawY.label.trim() ? rawY.label.trim() : null,
      unit: typeof rawY.unit === 'string' && rawY.unit.trim() ? rawY.unit.trim() : null,
      scale: typeof rawY.scale === 'string' && CONTROLLED_AXIS_SCALES.includes(rawY.scale.toLowerCase().trim())
        ? rawY.scale.toLowerCase().trim()
        : 'linear'
    };

    // 2. Process Series
    const rawSeries = Array.isArray(rawStructure.series) ? rawStructure.series : [];
    const validSeries = [];
    for (const s of rawSeries) {
      if (!s) continue;
      if (typeof s === 'string' && s.trim()) {
        validSeries.push({ name: s.trim(), color: null });
      } else if (typeof s === 'object' && s.name) {
        validSeries.push({
          name: String(s.name).trim(),
          color: s.color ? String(s.color).trim() : null
        });
      }
    }

    // 3. Process Data Points
    const rawDataPoints = Array.isArray(rawStructure.dataPoints)
      ? rawStructure.dataPoints
      : (Array.isArray(rawStructure.points) ? rawStructure.points : (Array.isArray(rawStructure.data) ? rawStructure.data : []));
    
    const validDataPoints = [];
    for (const dp of rawDataPoints) {
      if (!dp || typeof dp !== 'object') continue;

      const label = String(dp.label || dp.name || dp.x || dp.category || '').trim() || 'Point';
      let rawVal = dp.value !== undefined ? dp.value : (dp.y !== undefined ? dp.y : null);
      let numVal = null;
      let formattedVal = dp.formattedValue || dp.formatted_value || null;

      if (typeof rawVal === 'number' && !isNaN(rawVal)) {
        numVal = rawVal;
      } else if (typeof rawVal === 'string') {
        const parsed = parseFloat(rawVal.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          numVal = parsed;
        }
        if (!formattedVal) {
          formattedVal = rawVal.trim();
        }
      }

      if (!formattedVal && numVal !== null) {
        formattedVal = String(numVal);
      }

      const series = dp.series ? String(dp.series).trim() : null;
      const certainty = (dp.certainty === 'estimated' || dp.certainty === 'inferred') ? 'estimated' : 'observed';

      validDataPoints.push({
        label,
        value: numVal,
        formattedValue: formattedVal,
        series,
        certainty
      });
    }

    // 4. Process Trends
    const rawTrends = Array.isArray(rawStructure.trends) ? rawStructure.trends : [];
    const validTrends = [];
    for (const t of rawTrends) {
      if (!t) continue;
      if (typeof t === 'string' && t.trim()) {
        validTrends.push({
          direction: ChartStructureValidator.normalizeTrendDirection(t),
          description: t.trim()
        });
      } else if (typeof t === 'object') {
        const desc = String(t.description || t.desc || t.statement || '').trim();
        if (desc) {
          validTrends.push({
            direction: ChartStructureValidator.normalizeTrendDirection(t.direction),
            description: desc
          });
        }
      }
    }

    // 5. Process Anomalies
    const rawAnomalies = Array.isArray(rawStructure.anomalies) ? rawStructure.anomalies : [];
    const validAnomalies = rawAnomalies
      .map(a => typeof a === 'string' ? a.trim() : (typeof a === 'object' && a.description ? String(a.description).trim() : ''))
      .filter(Boolean);

    // 6. Process Observations
    const rawObs = Array.isArray(rawStructure.observations) ? rawStructure.observations : [];
    const validObservations = rawObs
      .map(o => typeof o === 'string' ? o.trim() : (typeof o === 'object' && o.statement ? String(o.statement).trim() : ''))
      .filter(Boolean);

    return {
      chartType,
      title,
      xAxis,
      yAxis,
      series: validSeries,
      dataPoints: validDataPoints,
      trends: validTrends,
      anomalies: validAnomalies,
      observations: validObservations
    };
  }
}

export default ChartStructureValidator;
