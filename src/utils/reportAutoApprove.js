import { AUTO_APPROVE_MIN_NEIGHBORS } from './checkAutoApprove';

export function isReportAutoApproved(report) {
  if (!report) return false;
  const v = report.auto_approved ?? report.autoApproved;
  return v === true || v === 1 || v === '1' || v === 'true';
}

export function isReportSensorVerified(report) {
  if (!report) return false;
  return report.sensor_verified === true || report.sensorVerified === true;
}

export function getReportNeighborCount(report) {
  if (!report) return 0;
  const n =
    report.neighbor_count ??
    report.neighborCount ??
    report.nearby_report_count ??
    report.nearbyReportCount ??
    0;
  return Number(n) || 0;
}

/** Key kiểm duyệt đã kết thúc — không còn trong hàng chờ. */
const TERMINAL_MODERATION_KEYS = new Set(['approved', 'rejected', 'auto_approved']);

export function normalizeModerationStatus(report) {
  const raw = report?.moderation_status ?? report?.status ?? '';
  return String(raw).trim().toLowerCase();
}

/**
 * @param {object} report
 * @param {{ trustPendingApi?: boolean }} [opts] — true = tin GET .../pending (BE đã lọc)
 */
export function isPendingQueueItem(report, opts = {}) {
  if (!report || isReportAutoApproved(report)) return false;

  const key = String(report.display_moderation?.key ?? '').toLowerCase();
  if (key && TERMINAL_MODERATION_KEYS.has(key)) return false;

  if (opts.trustPendingApi) return true;

  if (report.requires_manual_review === true || report.requiresManualReview === true) {
    return true;
  }

  const mod = normalizeModerationStatus(report);
  if (mod === 'pending') return true;
  if (key.includes('pending')) return true;

  if (report.is_approved === false && mod !== 'approved' && mod !== 'rejected') {
    return true;
  }

  return false;
}

/** Báo cáo chờ duyệt thủ công (khớp pending_manual_review trên summary). */
export function isQueuePendingReport(report) {
  return isPendingQueueItem(report, { trustPendingApi: false });
}

export function isManualPendingReport(report) {
  return isQueuePendingReport(report);
}

export function canManualModerate(report) {
  return isQueuePendingReport(report);
}

/**
 * Gộp hàng chờ từ pending API + reports/all?moderation_status=pending + toàn bộ list.
 * @param {Array<{ data?: object[], trustPendingApi?: boolean }>} sources
 */
export function mergeManualPendingQueues(sources) {
  const map = new Map();
  for (const src of sources) {
    const list = Array.isArray(src?.data) ? src.data : [];
    const trust = src.trustPendingApi === true;
    list.forEach((r) => {
      if (r?.id == null) return;
      if (!isPendingQueueItem(r, { trustPendingApi: trust })) return;
      map.set(Number(r.id), r);
    });
  }
  return [...map.values()];
}

const EMPTY_SUMMARY = {
  totalActive: 0,
  autoApproved: 0,
  pendingManualReview: 0,
  sensorVerified: 0,
  pendingAutoApprove: 0,
};

/** Chuẩn hóa GET /api/reports/summary */
export function normalizeReportsSummary(payload) {
  if (!payload || typeof payload !== 'object') return { ...EMPTY_SUMMARY };
  const d = payload.data != null && typeof payload.data === 'object' ? payload.data : payload;
  return {
    totalActive: Number(d.total_active ?? d.totalActive ?? 0) || 0,
    autoApproved: Number(d.auto_approved ?? d.autoApproved ?? 0) || 0,
    pendingManualReview:
      Number(d.pending_manual_review ?? d.pending_manual ?? d.pendingManualReview ?? d.pendingManual ?? 0) ||
      0,
    sensorVerified: Number(d.sensor_verified ?? d.sensorVerified ?? 0) || 0,
    pendingAutoApprove:
      Number(d.pending_auto_approve ?? d.pendingAutoApprove ?? d.near_threshold ?? d.nearThreshold ?? 0) ||
      0,
  };
}

export { AUTO_APPROVE_MIN_NEIGHBORS };
