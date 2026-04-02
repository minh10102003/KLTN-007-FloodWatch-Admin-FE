const STORAGE = {
  ACCESS: 'authToken',
  REFRESH: 'refreshToken',
  SESSION: 'sessionToken',
  USER: 'user',
};

/** Ghi đè access (JWT), refresh (opaque) và session (UUID) sau login / refresh thành công (không dùng sau đăng ký công khai — BE không trả token). */
export const persistAuthTokens = (payload) => {
  if (!payload || typeof payload !== 'object') return;
  const access = payload.access_token || payload.token;
  if (access) localStorage.setItem(STORAGE.ACCESS, access);
  if (payload.refresh_token) localStorage.setItem(STORAGE.REFRESH, payload.refresh_token);
  if (payload.session_token) localStorage.setItem(STORAGE.SESSION, payload.session_token);
};

export const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE.ACCESS);
  localStorage.removeItem(STORAGE.REFRESH);
  localStorage.removeItem(STORAGE.SESSION);
  localStorage.removeItem(STORAGE.USER);
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem(STORAGE.USER);
  return userStr ? JSON.parse(userStr) : null;
};

export const getToken = () => localStorage.getItem(STORAGE.ACCESS);

export const isAuthenticated = () => !!getToken();

/** Chỉ role === 'admin'. Admin không kế thừa quyền Moderator. */
export const isAdmin = () => getCurrentUser()?.role === 'admin';

/** Chỉ role === 'moderator'. Admin không được coi là moderator. */
export const isModerator = () => getCurrentUser()?.role === 'moderator';

/** Có một trong các role (hỗ trợ backend gán nhiều role: roles[] hoặc role). */
export const hasRole = (role) => {
  const user = getCurrentUser();
  if (!user) return false;
  if (Array.isArray(user.roles)) return user.roles.includes(role);
  return user.role === role;
};

/** Chỉ admin hoặc moderator được vào app quản trị; user thường không. */
export const canAccessAdminApp = () => isAdmin() || isModerator();

/** Khu vực chỉ Admin: user, audit, sensor, OTA, online-users, energy. */
export const canAccessAdminArea = () => isAdmin();

/** Khu vực chỉ Moderator: kiểm duyệt báo cáo, thống kê nghiệp vụ, xếp hạng tin cậy, cảnh báo. */
export const canAccessModeratorArea = () => isModerator();
