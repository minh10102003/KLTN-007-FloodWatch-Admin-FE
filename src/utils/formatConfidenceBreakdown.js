const BREAKDOWN_KEY_I18N = {
  base_reliability: 'reports.confidenceBreakdownBaseReliability',
  moderation_approved: 'reports.confidenceBreakdownModerationApproved',
  moderation_pending: 'reports.confidenceBreakdownModerationPending',
  reporter_reliability: 'reports.confidenceBreakdownReporterReliability',
  photo_evidence: 'reports.confidenceBreakdownPhotoEvidence',
  image_bonus: 'reports.confidenceBreakdownImageBonus',
  location_bonus: 'reports.confidenceBreakdownLocationBonus',
  flood_level_bonus: 'reports.confidenceBreakdownFloodLevelBonus',
  duplicate_penalty: 'reports.confidenceBreakdownDuplicatePenalty',
};

/** @returns {Record<string, unknown> | null} */
export function parseConfidenceBreakdown(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function formatBreakdownValue(value, t, key) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const isBaseScore = key === 'reporter_reliability' || key === 'base_reliability';
    const display = !isBaseScore && value > 0 ? `+${value}` : String(value);
    return t('reports.confidenceBreakdownPoints', { value: display });
  }
  if (typeof value === 'boolean') {
    return value ? t('reports.confidenceBreakdownYes') : t('reports.confidenceBreakdownNo');
  }
  if (value == null || value === '') return '—';
  return String(value);
}

function labelForKey(key, t) {
  const i18nKey = BREAKDOWN_KEY_I18N[key];
  if (i18nKey) return t(i18nKey);
  const human = key.replace(/_/g, ' ');
  return t('reports.confidenceBreakdownFieldFallback', { field: human });
}

/**
 * @returns {{ key: string, label: string, value: string }[]}
 */
export function getConfidenceBreakdownLines(raw, t) {
  const obj = parseConfidenceBreakdown(raw);
  if (!obj) return [];
  return Object.entries(obj).map(([key, val]) => ({
    key,
    label: labelForKey(key, t),
    value: formatBreakdownValue(val, t, key),
  }));
}

/** Một dòng hoặc nhiều dòng (tooltip). */
export function formatConfidenceBreakdownText(raw, t, { multiline = false } = {}) {
  const lines = getConfidenceBreakdownLines(raw, t);
  if (!lines.length) {
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return '';
  }
  const parts = lines.map((l) => `${l.label}: ${l.value}`);
  return multiline ? parts.join('\n') : parts.join(' · ');
}
