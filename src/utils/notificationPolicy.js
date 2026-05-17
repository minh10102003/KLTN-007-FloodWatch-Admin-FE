import { isAdmin, isModerator } from './auth';

/** Moderator chỉ nhận thông báo báo cáo; Admin thêm cảm biến offline. */
export function canReceiveNotificationType(type) {
  if (type === 'sensor_offline') return isAdmin();
  if (typeof type === 'string' && type.startsWith('report_')) {
    return isAdmin() || isModerator();
  }
  return isAdmin();
}
