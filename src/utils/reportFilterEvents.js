/** Lọc danh sách báo cáo — không sửa moderationEvents.js */

export const REPORTS_FILTER_MANUAL_PENDING = 'admin-reports-filter-manual-pending';

export function dispatchFilterManualPending() {
  window.dispatchEvent(new CustomEvent(REPORTS_FILTER_MANUAL_PENDING));
}

export const REPORTS_SUMMARY_REFRESH = 'admin-reports-summary-refresh';

export function dispatchReportsSummaryRefresh() {
  window.dispatchEvent(new CustomEvent(REPORTS_SUMMARY_REFRESH));
}
