export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_PROFILE: '/api/auth/profile',
  AUTH_USERS: '/api/auth/users',
  AUTH_USER_ROLE: '/api/auth/users/:userId/role',
  AUTH_USER_ACTIVE: '/api/auth/users/:userId/active',
  AUTH_USER_RECOMPUTE_RELIABILITY: '/api/auth/users/:userId/recompute-reliability',
  REPORTS_PENDING: '/api/reports/pending',
  CROWD_REPORTS: '/api/crowd-reports',
  REPORT_MODERATE: '/api/reports/:reportId/moderate',
  REPORTS_RELIABILITY_RANKING: '/api/reports/reliability-ranking',
  /** Thống kê báo cáo theo giờ/ngày (Moderator/Admin) */
  STATS_REPORTS: '/api/stats/reports',
  /** Nhật ký hệ thống (chỉ Admin) */
  AUDIT_LOGS: '/api/audit-logs',
  /** Danh sách sensor + mực nước realtime (BE: floodRoutes) */
  FLOOD_DATA_REALTIME: '/api/v1/flood-data/realtime',
  /** Lịch sử mực nước theo sensor (BE: floodRoutes) */
  SENSOR_HISTORY: '/api/sensors/:sensorId/history',
  /** Sensor CRUD (chỉ Admin) */
  SENSORS: '/api/sensors',
  SENSOR_BY_ID: '/api/sensors/:sensorId',
  SENSOR_THRESHOLDS: '/api/sensors/:sensorId/thresholds',
};
