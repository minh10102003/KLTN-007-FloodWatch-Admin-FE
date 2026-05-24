/** Hiển thị trạng thái kiểm duyệt / xác minh từ BE (display_moderation, display_validation). */

export function getDisplayModeration(report) {
  const dm = report?.display_moderation;
  if (dm && typeof dm === 'object') {
    return {
      key: String(dm.key ?? ''),
      label: dm.label || '—',
      hint: dm.hint || '',
    };
  }
  const status = report?.moderation_status ?? report?.status ?? 'pending';
  if (report?.auto_approved === true) {
    return { key: 'auto_approved', label: status, hint: '' };
  }
  return { key: status, label: status, hint: '' };
}

export function getDisplayValidation(report) {
  const dv = report?.display_validation;
  if (dv && typeof dv === 'object') {
    return {
      key: String(dv.key ?? ''),
      label: dv.label || '—',
    };
  }
  const vs = report?.validation_status;
  if (!vs) return { key: 'unknown', label: '—' };
  return { key: vs, label: vs };
}

export const MODERATION_BADGE_CLASS = {
  pending: 'bg-amber-600/90 text-white',
  approved: 'bg-emerald-600/90 text-white',
  auto_approved: 'bg-violet-600/90 text-white',
  rejected: 'bg-zinc-600 text-zinc-200',
};

export const VALIDATION_BADGE_CLASS = {
  cross_verified: 'bg-sky-600/90 text-white',
  not_cross_verified: 'bg-zinc-600/90 text-zinc-200',
  unverified: 'bg-zinc-600/90 text-zinc-200',
};

export function getModerationBadgeClass(report) {
  const key = getDisplayModeration(report).key;
  return MODERATION_BADGE_CLASS[key] || MODERATION_BADGE_CLASS.pending;
}

export function getValidationBadgeClass(report) {
  const key = getDisplayValidation(report).key;
  return VALIDATION_BADGE_CLASS[key] || 'bg-zinc-600/90 text-zinc-200';
}

const MODERATION_LABEL_I18N = {
  pending: 'reports.statusPending',
  approved: 'reports.statusApproved',
  rejected: 'reports.statusRejected',
  auto_approved: 'reports.moderationAutoApproved',
};

const VALIDATION_LABEL_I18N = {
  cross_verified: 'reports.validationCrossVerified',
  not_cross_verified: 'reports.validationNotCrossVerified',
  unverified: 'reports.validationUnverified',
};

/** BE đôi khi gửi label trùng key tiếng Anh (approved, cross_verified…) — ưu tiên i18n. */
function looksLikeRawKey(label, key) {
  if (!label) return true;
  const l = String(label).trim().toLowerCase();
  const k = String(key || '').trim().toLowerCase();
  if (!k) return /^[a-z][a-z0-9_]*$/.test(l);
  return l === k || l.replace(/\s+/g, '_') === k;
}

/** @param {ReturnType<typeof getDisplayModeration>} dm @param {(k: string) => string} t */
export function resolveModerationLabel(dm, t) {
  const key = String(dm.key || '').toLowerCase();
  const i18nKey = MODERATION_LABEL_I18N[key];
  if (i18nKey) return t(i18nKey);
  if (dm.label && dm.label !== '—' && !looksLikeRawKey(dm.label, dm.key)) {
    return dm.label;
  }
  return t('reports.statusPending');
}

/** @param {ReturnType<typeof getDisplayValidation>} dv @param {(k: string) => string} t */
export function resolveValidationLabel(dv, t) {
  const key = String(dv.key || '').toLowerCase();
  const i18nKey = VALIDATION_LABEL_I18N[key];
  if (i18nKey) return t(i18nKey);
  if (dv.label && dv.label !== '—' && !looksLikeRawKey(dv.label, dv.key)) {
    return dv.label;
  }
  return t('reports.validationUnknown');
}
