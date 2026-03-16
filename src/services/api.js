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
    const path = window.location.pathname;
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      if (path !== '/login') window.location.href = '/login';
    } else if (err.response?.status === 403) {
      // Không redirect khi đang ở trang chủ, login, hoặc quản lý báo cáo (để trang tự hiển thị lỗi 403)
      const noRedirectPaths = ['/', '/login', '/quan-ly-bao-cao'];
      if (!noRedirectPaths.includes(path)) window.location.href = '/';
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

/**
 * Danh sách users (chỉ Admin). GET /api/auth/users?limit=&offset=
 * limit mặc định 100, tối đa 500.
 */
export const getUsers = async (limit = 100, offset = 0) => {
  const capped = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { data } = await apiClient.get(
    `${API_ENDPOINTS.AUTH_USERS}?limit=${capped}&offset=${offset}`
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
 * Tất cả báo cáo trong hệ thống (Admin/Moderator). authenticate + requireAdminOrModerator.
 * GET /api/reports/all?limit=500&moderation_status=pending|approved|rejected
 * @param {Object} params
 * @param {number} [params.limit] - mặc định 500, tối đa 2000
 * @param {string} [params.moderation_status] - 'pending' | 'approved' | 'rejected'
 */
export const getReportsAll = async (params = {}) => {
  try {
    const limit = Math.min(Math.max(Number(params.limit) || 500, 1), 2000);
    const q = new URLSearchParams({ limit: String(limit) });
    if (params.moderation_status) q.set('moderation_status', params.moderation_status);
    const { data } = await apiClient.get(`${API_ENDPOINTS.REPORTS_ALL}?${q.toString()}`);
    return data?.success ? { success: true, data: data.data || [] } : { success: false, data: [] };
  } catch (err) {
    return { success: false, data: [], error: err.response?.data?.error || err.message };
  }
};

/**
 * Danh sách tất cả báo cáo (Admin/Mod). GET /api/crowd-reports (fallback nếu BE chưa có /api/reports/all)
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
 * Lấy danh sách sensor realtime (mực nước, nhiệt độ, độ ẩm DHT22).
 * GET /api/flood-data/realtime — không cần auth. Query tùy chọn: sensor_id, status, min_water_level, max_water_level.
 */
export const fetchSensors = async (params = {}) => {
  try {
    const q = new URLSearchParams();
    if (params.sensor_id) q.set('sensor_id', params.sensor_id);
    if (params.status) q.set('status', params.status);
    if (params.min_water_level != null) q.set('min_water_level', String(params.min_water_level));
    if (params.max_water_level != null) q.set('max_water_level', String(params.max_water_level));
    const query = q.toString();
    const url = query ? `${API_ENDPOINTS.FLOOD_DATA_REALTIME}?${query}` : API_ENDPOINTS.FLOOD_DATA_REALTIME;
    const { data } = await apiClient.get(url);
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
 * Trả về: [{ water_level, created_at, status, temperature, humidity, ... }]
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
    const status = err.response?.status;
    const error = err.response?.data?.error || err.message;
    return {
      success: false,
      data: null,
      error,
      status,
    };
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

/**
 * Danh sách sensors. GET /api/sensors
 * Query tùy chọn: is_active, status, hardware_type. Chuẩn hóa nhiều dạng response BE (data / sensors / array).
 */
export const getSensorsList = async (params = {}) => {
  try {
    const q = new URLSearchParams();
    if (params.is_active != null) q.set('is_active', String(params.is_active));
    if (params.status) q.set('status', params.status);
    if (params.hardware_type) q.set('hardware_type', params.hardware_type);
    const query = q.toString();
    const url = query ? `${API_ENDPOINTS.SENSORS}?${query}` : API_ENDPOINTS.SENSORS;
    const { data } = await apiClient.get(url);
    let list = [];
    if (data?.success && Array.isArray(data.data)) list = data.data;
    else if (Array.isArray(data?.sensors)) list = data.sensors;
    else if (Array.isArray(data?.data)) list = data.data;
    else if (Array.isArray(data)) list = data;
    // Chuẩn hóa sensor_id nếu BE trả id
    list = list.map((s) => (s.sensor_id != null ? s : { ...s, sensor_id: s.id }));
    return { success: true, data: list };
  } catch (err) {
    return { success: false, data: [], error: err.response?.data?.error || err.response?.data?.message || err.message };
  }
};

/**
 * Lấy một sensor theo ID. GET /api/sensors/:sensorId
 */
export const getSensorById = async (sensorId) => {
  try {
    const url = API_ENDPOINTS.SENSOR_BY_ID.replace(':sensorId', sensorId);
    const { data } = await apiClient.get(url);
    if (data?.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, data: null, error: data?.error };
  } catch (err) {
    return { success: false, data: null, error: err.response?.data?.error || err.message };
  }
};

/**
 * Cập nhật thông tin sensor. PUT /api/sensors/:sensorId (Admin).
 * Body chỉ gửi field cần sửa: location_name, lng, lat, installation_height, hardware_type, model, installation_date, is_active.
 */
export const updateSensor = async (sensorId, payload) => {
  const url = API_ENDPOINTS.SENSOR_BY_ID.replace(':sensorId', sensorId);
  const { data } = await apiClient.put(url, payload);
  return data;
};

/**
 * Cập nhật ngưỡng báo động. PUT /api/sensors/:sensorId/thresholds (Admin).
 * Body: warning_threshold, danger_threshold, updated_by. Ràng buộc: warning_threshold < danger_threshold.
 */
export const updateSensorThresholds = async (sensorId, payload) => {
  const url = API_ENDPOINTS.SENSOR_THRESHOLDS.replace(':sensorId', sensorId);
  const { data } = await apiClient.put(url, payload);
  return data;
};

/**
 * Tạo sensor mới. POST /api/sensors (Admin).
 * Bắt buộc: sensor_id, location_name, lng, lat, installation_height.
 * Tùy chọn: hardware_type, model, installation_date, warning_threshold, danger_threshold.
 */
export const createSensor = async (payload) => {
  const { data } = await apiClient.post(API_ENDPOINTS.SENSORS, payload);
  return data;
};

/**
 * Xóa sensor. DELETE /api/sensors/:sensorId (Admin).
 */
export const deleteSensor = async (sensorId) => {
  const url = API_ENDPOINTS.SENSOR_BY_ID.replace(':sensorId', sensorId);
  const { data } = await apiClient.delete(url);
  return data;
};

/**
 * Hiệu chuẩn sensor. POST /api/sensors/:sensorId/calibrate (Admin). Token gửi trong header.
 */
export const calibrateSensor = async (sensorId) => {
  const url = API_ENDPOINTS.SENSOR_CALIBRATE.replace(':sensorId', sensorId);
  const { data } = await apiClient.post(url);
  return data;
};
