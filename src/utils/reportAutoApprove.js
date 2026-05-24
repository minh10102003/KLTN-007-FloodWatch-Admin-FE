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

/** Chờ duyệt thủ công: pending và chưa auto-approve. */
export function isManualPendingReport(report, status = null) {
  const s = status ?? report?.status ?? report?.moderation_status ?? 'pending';
  return s === 'pending' && !isReportAutoApproved(report);
}

/** Badge variant: manual | auto_sensor | auto_no_sensor */
export function getAutoApproveBadgeVariant(report) {
  if (!isReportAutoApproved(report)) return 'manual';
  if (isReportSensorVerified(report)) return 'auto_sensor';
  return 'auto_no_sensor';
}

export function isNearAutoApproveThreshold(report) {
  const count = getReportNeighborCount(report);
  return count >= AUTO_APPROVE_MIN_NEIGHBORS - 1 && count < AUTO_APPROVE_MIN_NEIGHBORS;
}

const EMPTY_SUMMARY = {
  totalActive: 0,
  autoApproved: 0,
  pendingManual: 0,
  sensorVerified: 0,
  nearThreshold: 0,
};

/** Chuẩn hóa GET /api/reports/summary — hỗ trợ snake_case & camelCase. */
export function normalizeReportsSummary(payload) {
  if (!payload || typeof payload !== 'object') return { ...EMPTY_SUMMARY };
  const d = payload.data != null && typeof payload.data === 'object' ? payload.data : payload;
  return {
    totalActive: Number(d.total_active ?? d.totalActive ?? 0) || 0,
    autoApproved: Number(d.auto_approved ?? d.autoApproved ?? 0) || 0,
    pendingManual: Number(d.pending_manual ?? d.pendingManual ?? 0) || 0,
    sensorVerified: Number(d.sensor_verified ?? d.sensorVerified ?? 0) || 0,
    nearThreshold: Number(d.near_threshold ?? d.nearThreshold ?? 0) || 0,
  };
}
