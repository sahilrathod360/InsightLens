export function normalizeReportId(rawId) {
  if (!rawId || typeof rawId !== 'string') {
    return `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  const clean = rawId.trim();
  if (clean.startsWith('DEMO-')) return clean;
  // Strip all occurrences of leading RPT-, RPT_, RPT prefixes
  const stripped = clean.replace(/^(RPT[-_:]?)+/i, '').trim();
  if (!stripped) {
    return `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  return `RPT-${stripped}`;
}

export default normalizeReportId;
