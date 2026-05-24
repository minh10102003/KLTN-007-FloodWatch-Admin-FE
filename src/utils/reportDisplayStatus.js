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
