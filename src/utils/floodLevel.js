/** Giá trị mức ngập từ BE (thường tiếng Việt). */
export const FLOOD_LEVEL_API_VALUES = ['Nặng', 'Trung bình', 'Nhẹ'];

export const FLOOD_FILTER_ALL = 'all';

export function formatFloodLevel(raw, t) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower === 'nhẹ' || lower === 'light' || lower === 'low') return t('reports.severityLight');
  if (lower === 'nặng' || lower === 'heavy' || lower === 'high') return t('reports.severityHeavy');
  if (lower === 'trung bình' || lower === 'medium' || lower === 'moderate') return t('reports.severityMedium');
  return s;
}

export function floodLevelFilterLabel(level, t) {
  if (level === FLOOD_FILTER_ALL) return t('moderation.filterLevelAll');
  return formatFloodLevel(level, t);
}
