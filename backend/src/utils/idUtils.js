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

export function generateCustomId(prefix = 'ID') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `${prefix}-${timestamp}${rand}`;
}

export default normalizeReportId;
