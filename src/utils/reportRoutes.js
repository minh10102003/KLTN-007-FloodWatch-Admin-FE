import { isAdmin } from './auth';

export const REPORTS_MANAGEMENT_PATH = '/reports-management';
export const MODERATION_PATH = '/moderation';

/** Trang mở báo cáo từ chuông thông báo theo role. */
export function getReportFocusPath() {
  return isAdmin() ? REPORTS_MANAGEMENT_PATH : MODERATION_PATH;
}
