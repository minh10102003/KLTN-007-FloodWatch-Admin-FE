const rawBaseUrl = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_BASE_URL || 'https://kltn-007-floodwatch-be-production.up.railway.app';
const rawFallbackBaseUrl =
  import.meta.env.VITE_API_FALLBACK_BASE_URL ||
  'https://kltn-007-floodwatch-be-production.up.railway.app';

const normalizedApiBase = String(rawBaseUrl).replace(/\/+$/, '');
const normalizedApiFallbackBase = String(rawFallbackBaseUrl).replace(/\/+$/, '');

/** Không có dấu / cuối — tránh // khi nối với path bắt đầu bằng / (vd. refresh token). */
export const API_CONFIG = {
  BASE_URL: normalizedApiBase,
  FALLBACK_BASE_URL: normalizedApiFallbackBase,
  /**
   * Ảnh báo cáo thường là `/uploads/...`. Mặc định cùng host API.
   * Set `VITE_UPLOADS_BASE_URL` nếu BE phục vụ file qua host/path khác (CDN, prefix `/api/...`).
   */
  UPLOADS_BASE_URL: String(import.meta.env.VITE_UPLOADS_BASE_URL || normalizedApiBase).replace(
    /\/+$/,
    ''
  ),
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_VERIFY_OTP: '/api/auth/verify-otp',
  AUTH_SEND_OTP: '/api/auth/send-otp',
  AUTH_RESEND_OTP: '/api/auth/resend-otp',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_PROFILE: '/api/auth/profile',
  AUTH_USERS: '/api/auth/users',
  /** Xóa user (Admin). DELETE */
  AUTH_USER_BY_ID: '/api/auth/users/:userId',
  AUTH_USER_ROLE: '/api/auth/users/:userId/role',
  AUTH_USER_ACTIVE: '/api/auth/users/:userId/active',
  AUTH_USER_RECOMPUTE_RELIABILITY: '/api/auth/users/:userId/recompute-reliability',
  REPORTS_PENDING: '/api/reports/pending',
  /** Tất cả báo cáo (Admin/Moderator). GET /api/reports/all?limit=&moderation_status= */
  REPORTS_ALL: '/api/reports/all',
  CROWD_REPORTS: '/api/crowd-reports',
  REPORT_MODERATE: '/api/reports/:reportId/moderate',
  REPORTS_RELIABILITY_RANKING: '/api/reports/reliability-ranking',
  /** Thống kê báo cáo theo giờ/ngày (Moderator/Admin) */
  STATS_REPORTS: '/api/stats/reports',
  /** Research D1: đánh giá crowd_only vs fused (MAE/RMSE/Bias). */
  RESEARCH_EVALUATION: '/api/v1/research/evaluation',
  /** Research D2: hotspot cold-start (vùng báo cáo mạnh nhưng xa sensor). */
  RESEARCH_COLD_START_HOTSPOTS: '/api/v1/research/cold-start-hotspots',
  /** A1 — Fusion crowd + sensor (bbox bắt buộc). */
  FUSION_POINTS: '/api/v1/fusion/points',
  /** A3 — Dự báo ngắn hạn theo sensor. */
  FORECAST_SENSOR: '/api/v1/forecast/sensor/:sensorId',
  /** B1 — Sức khỏe thiết bị (chỉ admin). */
  ADMIN_DEVICES_HEALTH: '/api/v1/admin/devices/health',
  /** C1 — Thống kê cảnh báo khẩn đã gửi (chỉ admin). */
  ADMIN_EMERGENCY_ALERTS_SUMMARY: '/api/v1/admin/emergency-alerts/summary',
  /** C2 — Heatmap (public). */
  HEATMAP: '/api/heatmap',
  HEATMAP_COMBINED: '/api/heatmap/combined',
  HEATMAP_TIMELINE_24H: '/api/heatmap/timeline-24h',
  /** Nhật ký hệ thống (chỉ Admin). Nếu BE dùng path khác, set VITE_AUDIT_LOGS_PATH trong .env (vd: /api/audit/logs) */
  AUDIT_LOGS: import.meta.env.VITE_AUDIT_LOGS_PATH || '/api/audit-logs',
  /** Danh sách sensor + mực nước + nhiệt độ, độ ẩm DHT22. GET /api/flood-data/realtime (công khai) */
  FLOOD_DATA_REALTIME: '/api/flood-data/realtime',
  /** Lịch sử mực nước theo sensor (BE: floodRoutes) */
  SENSOR_HISTORY: '/api/sensors/:sensorId/history',
  /** Sensor CRUD (chỉ Admin). Nếu BE trả 404, set VITE_SENSORS_PATH trong .env (vd: /api/v1/sensors). */
  SENSORS: import.meta.env.VITE_SENSORS_PATH || '/api/sensors',
  SENSOR_BY_ID: (import.meta.env.VITE_SENSORS_PATH || '/api/sensors') + '/:sensorId',
  SENSOR_THRESHOLDS: (import.meta.env.VITE_SENSORS_PATH || '/api/sensors') + '/:sensorId/thresholds',
  /** Hiệu chuẩn sensor. POST /api/sensors/:sensorId/calibrate (Admin). */
  SENSOR_CALIBRATE: (import.meta.env.VITE_SENSORS_PATH || '/api/sensors') + '/:sensorId/calibrate',
};
