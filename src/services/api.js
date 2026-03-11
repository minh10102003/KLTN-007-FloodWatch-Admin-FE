import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    if (err.response?.status === 403) {
      // Có thể redirect hoặc hiển thị "Không có quyền"
      if (window.location.pathname !== '/login') window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const login = async (username, password) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, { username, password });
    if (data?.success && data.data?.token && data.data?.user) {
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return { success: true, user: data.data.user };
    }
    return { success: false, error: data?.error || 'Đăng nhập thất bại' };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Đăng nhập thất bại',
    };
  }
};

export const logout = async () => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT);
  } catch {}
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

export const getUsers = async (limit = 100, offset = 0) => {
  const { data } = await apiClient.get(
    `${API_ENDPOINTS.AUTH_USERS}?limit=${limit}&offset=${offset}`
  );
  return data;
};

/**
 * Tạo tài khoản mới (chỉ Admin).
 * POST /api/auth/users
 * Body: username, email, password, role (bắt buộc); full_name, phone (tùy chọn).
 */
export const createUser = async (payload) => {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH_USERS, payload);
  return data;
};

export const assignRole = async (userId, role) => {
  const url = API_ENDPOINTS.AUTH_USER_ROLE.replace(':userId', userId);
  const { data } = await apiClient.put(url, { role });
  return data;
};

export const setUserActive = async (userId, is_active) => {
  const url = API_ENDPOINTS.AUTH_USER_ACTIVE.replace(':userId', userId);
  const { data } = await apiClient.put(url, { is_active });
  return data;
};

/**
 * Tính lại điểm tin cậy reporter từ lịch sử (Cách A). Chỉ admin.
 * POST /api/auth/users/:userId/recompute-reliability
 */
export const recomputeUserReliability = async (userId) => {
  const url = API_ENDPOINTS.AUTH_USER_RECOMPUTE_RELIABILITY.replace(':userId', userId);
  const { data } = await apiClient.post(url);
  return data;
};

/**
 * Xếp hạng tin cậy reporter. Moderator/Admin.
 * GET /api/reports/reliability-ranking?limit=100
 */
export const getReliabilityRanking = async (limit = 100) => {
  const { data } = await apiClient.get(`${API_ENDPOINTS.REPORTS_RELIABILITY_RANKING}?limit=${limit}`);
  return data?.success ? { success: true, data: data.data || [] } : { success: false, data: [] };
};

export const fetchPendingReports = async (limit = 50) => {
  const { data } = await apiClient.get(`${API_ENDPOINTS.REPORTS_PENDING}?limit=${limit}`);
  return data?.success ? { success: true, data: data.data || [] } : { success: false, data: [] };
};

/**
 * Danh sách tất cả báo cáo (Admin/Mod). GET /api/crowd-reports
 * @param {number} limit
 * @param {number} offset
 * @param {string} [status] - 'pending' | 'approved' | 'rejected' (tùy chọn, một số BE hỗ trợ)
 */
export const fetchCrowdReports = async (limit = 200, offset = 0, status = null) => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set('status', status);
  const { data } = await apiClient.get(`${API_ENDPOINTS.CROWD_REPORTS}?${params}`);
  return data?.success ? { success: true, data: data.data || [] } : { success: false, data: [] };
};

export const moderateReport = async (reportId, action, rejectionReason = null) => {
  const url = API_ENDPOINTS.REPORT_MODERATE.replace(':reportId', reportId);
  const payload = action === 'reject' && rejectionReason
    ? { action, rejection_reason: rejectionReason }
    : { action };
  const { data } = await apiClient.put(url, payload);
  if (data?.success) return { success: true, message: data.message };
  return { success: false, error: data?.error || 'Thao tác thất bại' };
};

/**
 * Lấy danh sách sensor kèm mực nước realtime (BE: GET /api/v1/flood-data/realtime).
 * Trả về: sensor_id, location_name, water_level, status, last_data_time, ...
 */
export const fetchSensors = async () => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.FLOOD_DATA_REALTIME);
    if (data?.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
    return { success: false, data: [] };
  } catch (err) {
    return { success: false, data: [], error: err.message };
  }
};

/**
 * Lấy lịch sử mực nước theo sensor (BE: GET /api/sensors/:sensorId/history).
 * Trả về: [{ water_level, created_at, status, ... }]
 */
export const fetchSensorReadings = async (sensorId, limit = 24) => {
  try {
    const url = API_ENDPOINTS.SENSOR_HISTORY.replace(':sensorId', sensorId);
    const { data } = await apiClient.get(`${url}?limit=${limit}`);
    if (data?.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
    return { success: false, data: [] };
  } catch (err) {
    return { success: false, data: [], error: err.message };
  }
};

/**
 * Thống kê báo cáo theo giờ/ngày. Moderator/Admin.
 * GET /api/stats/reports?groupBy=hour|day&from=&to= (ISO)
 */
export const getReportStats = async (params = {}) => {
  try {
    const q = new URLSearchParams(params).toString();
    const { data } = await apiClient.get(`${API_ENDPOINTS.STATS_REPORTS}${q ? `?${q}` : ''}`);
    if (data?.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, data: null };
  } catch (err) {
    return { success: false, data: null, error: err.response?.data?.error || err.message };
  }
};

/**
 * Nhật ký hệ thống (Audit log). Chỉ Admin.
 * GET /api/audit-logs?limit=&offset=&from=&to=&action=&entity_type=
 */
export const getAuditLogs = async (params = {}) => {
  try {
    const q = new URLSearchParams(params).toString();
    const { data } = await apiClient.get(`${API_ENDPOINTS.AUDIT_LOGS}${q ? `?${q}` : ''}`);
    if (data?.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
    return { success: false, data: [] };
  } catch (err) {
    return { success: false, data: [], error: err.response?.data?.error || err.message };
  }
};
