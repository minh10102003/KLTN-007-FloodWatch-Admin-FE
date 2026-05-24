import { AUTO_APPROVE_MIN_NEIGHBORS } from './checkAutoApprove';

export function isReportAutoApproved(report) {
  if (!report) return false;
  return report.auto_approved === true || report.autoApproved === true;
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

/** Hàng đợi chờ duyệt thủ công (GET /api/reports/pending + lọc FE). */
export function isQueuePendingReport(report) {
  if (!report || isReportAutoApproved(report)) return false;
  const mod = report.moderation_status ?? report.status;
  if (mod !== 'pending') return false;
  const key = report.display_moderation?.key;
  if (key && key !== 'pending') return false;
  return true;
}

/** Lọc tab "chờ duyệt thủ công". */
export function isManualPendingReport(report) {
  if (!report) return false;
  const key = report.display_moderation?.key;
  if (key === 'pending') return !isReportAutoApproved(report);
  const mod = report.moderation_status ?? report.status;
  return mod === 'pending' && !isReportAutoApproved(report);
}

/** Có thể kéo duyệt / từ chối thủ công. */
export function canManualModerate(report) {
  return isQueuePendingReport(report);
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
