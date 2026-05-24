/** Mức ngập chuẩn (BE sau migrate: Mức 1 … Mức 5). */
export const FLOOD_LEVELS = [
  { value: 'Mức 1', labelKey: 'reports.floodLevel1' },
  { value: 'Mức 2', labelKey: 'reports.floodLevel2' },
  { value: 'Mức 3', labelKey: 'reports.floodLevel3' },
  { value: 'Mức 4', labelKey: 'reports.floodLevel4' },
  { value: 'Mức 5', labelKey: 'reports.floodLevel5' },
];

export const FLOOD_LEVEL_API_VALUES = FLOOD_LEVELS.map((l) => l.value);

export const FLOOD_FILTER_ALL = 'all';

/** Chuẩn hóa giá trị flood_level (số, "Mức N", legacy Nhẹ/TB/Nặng). */
export function normalizeFloodLevelValue(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const num = Number(s);
  if (Number.isFinite(num) && num >= 1 && num <= 5) return num;
  const m = s.match(/^mức\s*(\d)$/iu) || s.match(/^level\s*(\d)$/iu);
  if (m) return Number(m[1]);
  const lower = s.toLowerCase();
  if (lower === 'nhẹ' || lower === 'light' || lower === 'low') return 1;
  if (lower === 'trung bình' || lower === 'medium' || lower === 'moderate' || lower === 'tb') return 3;
  if (lower === 'nặng' || lower === 'heavy' || lower === 'high') return 5;
  return s;
}

export function floodLevelsMatch(a, b) {
  if (a == null || b == null) return false;
  return normalizeFloodLevelValue(a) === normalizeFloodLevelValue(b);
}

/** Label đầy đủ cho cột / card (theo spec BE). */
export function floodLevelLabel(flood_level, t) {
  const norm = normalizeFloodLevelValue(flood_level);
  const entry = FLOOD_LEVELS.find((l) => normalizeFloodLevelValue(l.value) === norm);
  if (entry && t) return t(entry.labelKey);
  if (entry) return entry.value;
  if (flood_level == null || flood_level === '') return '—';
  return String(flood_level).trim();
}

export function formatFloodLevel(raw, t) {
  return floodLevelLabel(raw, t);
}

export function floodLevelFilterLabel(level, t) {
  if (level === FLOOD_FILTER_ALL) return t('moderation.filterLevelAll');
  return floodLevelLabel(level, t);
}

const CARD_STYLES_BY_NORM = {
  1: 'bg-sky-50 border-sky-200 text-sky-900',
  2: 'bg-cyan-50 border-cyan-200 text-cyan-900',
  3: 'bg-amber-50 border-amber-200 text-amber-900',
  4: 'bg-orange-50 border-orange-200 text-orange-900',
  5: 'bg-red-50 border-red-200 text-red-900',
};

const TEXT_COLORS_BY_NORM = {
  1: 'text-sky-600',
  2: 'text-cyan-600',
  3: 'text-amber-600',
  4: 'text-orange-600',
  5: 'text-red-600',
};

export function getFloodLevelCardStyle(flood_level) {
  const norm = normalizeFloodLevelValue(flood_level);
  return CARD_STYLES_BY_NORM[norm] || 'bg-dashboard-surface border-dashboard-border text-zinc-200';
}

export function getFloodLevelTextColor(flood_level) {
  const norm = normalizeFloodLevelValue(flood_level);
  return TEXT_COLORS_BY_NORM[norm] || 'text-zinc-200';
}

/** Phân bố từ GET /api/stats/reports (by_flood_level) hoặc đếm từ danh sách báo cáo. */
export function normalizeFloodLevelDistribution(apiData) {
  if (!apiData) return null;
  const raw =
    apiData.by_flood_level ??
    apiData.flood_level_distribution ??
    apiData.flood_levels ??
    apiData.floodLevelDistribution;
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      level: item.flood_level ?? item.level ?? item.name,
      count: Number(item.count ?? item.value ?? 0) || 0,
    }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([level, count]) => ({
      level,
      count: Number(count) || 0,
    }));
  }
  return null;
}

/** 5 cột biểu đồ phân bố mức ngập. */
export function buildFloodLevelChartData(reports, apiData, t) {
  const counts = {};
  FLOOD_LEVELS.forEach((l) => {
    counts[normalizeFloodLevelValue(l.value)] = 0;
  });

  const fromApi = normalizeFloodLevelDistribution(apiData);
  if (fromApi?.length) {
    fromApi.forEach(({ level, count }) => {
      const k = normalizeFloodLevelValue(level);
      if (k != null) counts[k] = (counts[k] || 0) + count;
    });
  } else if (Array.isArray(reports)) {
    reports.forEach((r) => {
      const k = normalizeFloodLevelValue(r.flood_level);
      if (k != null) counts[k] = (counts[k] || 0) + 1;
    });
  }

  return FLOOD_LEVELS.map((l) => {
    const k = normalizeFloodLevelValue(l.value);
    return {
      level: l.value,
      label: floodLevelLabel(l.value, t),
      count: counts[k] ?? 0,
    };
  });
}
