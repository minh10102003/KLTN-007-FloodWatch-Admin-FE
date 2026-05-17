/** Đồng bộ ModerationPage với socket / chuông thông báo */

export const MODERATION_REFRESH = 'admin-moderation-refresh';
export const MODERATION_OPEN_REPORT = 'admin-moderation-open-report';

const SELF_MODERATION_TTL_MS = 10_000;
/** @type {{ reportId: number; action: 'approved' | 'rejected'; at: number } | null} */
let selfModeration = null;

/** Gọi sau khi admin vừa duyệt/từ chối trên UI — tránh toast socket trùng. */
export function markSelfModeration(reportId, action) {
  const id = Number(reportId);
  if (!Number.isFinite(id)) return;
  selfModeration = { reportId: id, action, at: Date.now() };
}

/** @param {string} type report_approved | report_rejected */
export function shouldSuppressModerationSocketToast(reportId, type) {
  if (!selfModeration) return false;
  if (Date.now() - selfModeration.at > SELF_MODERATION_TTL_MS) return false;
  const id = Number(reportId);
  if (!Number.isFinite(id) || id !== selfModeration.reportId) return false;
  if (type === 'report_approved' && selfModeration.action === 'approved') return true;
  if (type === 'report_rejected' && selfModeration.action === 'rejected') return true;
  return false;
}

/** @param {'socket'|'notification'|string} [reason] */
export function dispatchModerationRefresh(reason = 'unknown') {
  window.dispatchEvent(
    new CustomEvent(MODERATION_REFRESH, { detail: { reason } })
  );
}

/** @param {number|string} reportId */
export function dispatchOpenModerationReport(reportId) {
  const id = Number(reportId);
  if (!Number.isFinite(id)) return;
  window.dispatchEvent(
    new CustomEvent(MODERATION_OPEN_REPORT, { detail: { reportId: id } })
  );
}
