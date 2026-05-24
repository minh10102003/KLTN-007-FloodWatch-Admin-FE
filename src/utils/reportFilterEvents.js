/** Lọc danh sách báo cáo — không sửa moderationEvents.js */

export const REPORTS_FILTER_MANUAL_PENDING = 'admin-reports-filter-manual-pending';

export function dispatchFilterManualPending() {
  window.dispatchEvent(new CustomEvent(REPORTS_FILTER_MANUAL_PENDING));
}
