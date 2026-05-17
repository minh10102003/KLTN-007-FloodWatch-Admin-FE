import { getCurrentUser } from './auth';
import { canReceiveNotificationType } from './notificationPolicy';

const STORAGE_PREFIX = 'admin_notifications_v1';
const LEGACY_KEY = 'admin_notifications_v1';
const MAX_ITEMS = 50;

export function getNotificationStorageKey() {
  const user = getCurrentUser();
  if (!user) return null;
  const id = user.id ?? user.user_id ?? user.username ?? user.email;
  if (id == null || id === '') return null;
  const role = user.role || 'unknown';
  return `${STORAGE_PREFIX}_${role}_${id}`;
}

export function loadNotificationsForCurrentUser() {
  const key = getNotificationStorageKey();
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    let parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) parsed = [];

    if (parsed.length === 0 && key.includes('_admin_')) {
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      const legacy = legacyRaw ? JSON.parse(legacyRaw) : [];
      if (Array.isArray(legacy) && legacy.length > 0) {
        parsed = legacy;
        localStorage.setItem(key, JSON.stringify(legacy.slice(0, MAX_ITEMS)));
        localStorage.removeItem(LEGACY_KEY);
      }
    }

    return parsed
      .filter((item) => item && canReceiveNotificationType(item.type))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function persistNotificationsForCurrentUser(items) {
  const key = getNotificationStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

export { MAX_ITEMS };
