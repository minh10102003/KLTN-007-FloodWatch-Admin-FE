export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getToken = () => localStorage.getItem('authToken');

export const isAuthenticated = () => !!getToken();

export const isAdmin = () => getCurrentUser()?.role === 'admin';

export const isModerator = () => ['admin', 'moderator'].includes(getCurrentUser()?.role);

/** Chỉ admin + moderator được vào app này; user thường không. */
export const canAccessAdminApp = () => isModerator();
