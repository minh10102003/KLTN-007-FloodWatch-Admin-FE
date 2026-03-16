export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getToken = () => localStorage.getItem('authToken');

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
