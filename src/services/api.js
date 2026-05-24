import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';
import { clearAuthStorage, persistAuthTokens } from '../utils/auth';
import { normalizeReportsSummary } from '../utils/reportAutoApprove';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

const getCurrentBaseUrl = () => apiClient.defaults.baseURL || API_CONFIG.BASE_URL;

const hasFallbackBaseUrl =
  !!API_CONFIG.FALLBACK_BASE_URL && API_CONFIG.FALLBACK_BASE_URL !== API_CONFIG.BASE_URL;

const promoteFallbackBaseUrl = () => {
  if (!hasFallbackBaseUrl) return;
  apiClient.defaults.baseURL = API_CONFIG.FALLBACK_BASE_URL;
};

/** Chỉ một luồng refresh; các request 401 khác chờ cùng promise. */
let refreshPromise = null;

const isLoginOrRefreshUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes(API_ENDPOINTS.AUTH_LOGIN) || url.includes(API_ENDPOINTS.AUTH_REFRESH);
};

/**
 * POST /api/auth/refresh — không gửi Bearer; dùng axios thuần để tránh vòng interceptor.
 * Trả về access JWT mới hoặc null nếu 401 / payload không hợp lệ.
 */
const refreshAccessToken = async () => {
  const refresh_token = localStorage.getItem('refreshToken');
  const session_token = localStorage.getItem('sessionToken');
  if (!refresh_token || !session_token) return null;
  try {
    const { data } = await axios.post(
      `${getCurrentBaseUrl()}${API_ENDPOINTS.AUTH_REFRESH}`,
      { refresh_token, session_token },
      {
        timeout: API_CONFIG.TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (data?.success && data.data) {
      persistAuthTokens(data.data);
      window.dispatchEvent(new CustomEvent('admin-auth-changed'));
      return data.data.access_token || data.data.token || null;
    }
    return null;
  } catch (e) {
    const s = e.response?.status;
    if (s === 401 || s === 404) return null;
    throw e;
  }
};

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
  async (err) => {
    const path = window.location.pathname;
    const status = err.response?.status;
    const originalRequest = err.config;

    // Network-level fail (ERR_NETWORK / net::ERR_FAILED): retry once via fallback base URL.
    if (!err.response && originalRequest && hasFallbackBaseUrl && !originalRequest._fallbackRetried) {
      originalRequest._fallbackRetried = true;
      originalRequest.baseURL = API_CONFIG.FALLBACK_BASE_URL;
      try {
        const retryRes = await apiClient(originalRequest);
        promoteFallbackBaseUrl();
        return retryRes;
      } catch (retryErr) {
        return Promise.reject(retryErr);
      }
    }

    if (status === 401 && originalRequest) {
      const reqUrl = originalRequest.url || '';

      if (isLoginOrRefreshUrl(reqUrl)) {
        if (reqUrl.includes(API_ENDPOINTS.AUTH_REFRESH)) {
          clearAuthStorage();
          if (path !== '/login') window.location.href = '/login';
        }
        return Promise.reject(err);
      }

      if (originalRequest._authRetry) {
        clearAuthStorage();
        if (path !== '/login') window.location.href = '/login';
        return Promise.reject(err);
      }

      if (!localStorage.getItem('refreshToken') || !localStorage.getItem('sessionToken')) {
        clearAuthStorage();
        if (path !== '/login') window.location.href = '/login';
        return Promise.reject(err);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccess = await refreshPromise;
        if (!newAccess) {
          clearAuthStorage();
          if (path !== '/login') window.location.href = '/login';
          return Promise.reject(err);
        }
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        originalRequest._authRetry = true;
        return apiClient(originalRequest);
      } catch {
        return Promise.reject(err);
      }
    }

    if (status === 403) {
      const noRedirectPaths = ['/', '/login', '/reports-management', '/quan-ly-bao-cao'];
      if (!noRedirectPaths.includes(path)) window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const login = async (username, password) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, { username, password });
    const d = data?.data;
    const access = d?.access_token || d?.token;
    if (data?.success && d?.user && access) {
      persistAuthTokens(d);
      localStorage.setItem('user', JSON.stringify(d.user));
      return { success: true, user: d.user };
    }
    return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' };
  } catch (err) {
    // Nếu login lần đầu gặp lỗi mạng, thử lại với fallback domain trước khi trả lỗi cho UI.
    if (!err.response && hasFallbackBaseUrl) {
      try {
        const { data } = await axios.post(
          `${API_CONFIG.FALLBACK_BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`,
          { username, password },
          {
            timeout: API_CONFIG.TIMEOUT,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        const d = data?.data;
        const access = d?.access_token || d?.token;
        if (data?.success && d?.user && access) {
          promoteFallbackBaseUrl();
          persistAuthTokens(d);
          localStorage.setItem('user', JSON.stringify(d.user));
          return { success: true, user: d.user };
        }
      } catch {}
    }

    const status = err.response?.status;
    if (!err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      return { success: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại.' };
    }
    if (status === 403) {
      return {
        success: false,
        error: 'Tài khoản chưa xác minh hoặc không có quyền. Liên hệ quản trị viên.',
        needsEmailVerification: true,
      };
    }
    if (status === 401 || status === 404) {
      return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' };
    }
    return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' };
  }
};

/**
 * Đăng ký công khai — 201, chỉ `data.user`, không JWT. Bước tiếp: verify-otp rồi mới login.
 */
export const register = async (payload) => {
  try {
    const email =
      typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : payload.email;
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_REGISTER, { ...payload, email });
    const d = data?.data;
    if (data?.success && d?.user) {
      return {
        success: true,
        user: d.user,
        message: data.message || 'Đăng ký thành công. Kiểm tra email và nhập mã OTP.',
      };
    }
    return { success: false, error: data?.error || data?.message || 'Đăng ký thất bại' };
  } catch (err) {
    return {
      success: false,
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Đăng ký thất bại',
    };
  }
};

/**
 * Hoàn tất đăng ký — xác minh email OTP.
 * Body: { email, otp_code }
 */
export const verifyOtp = async ({ email, otp_code }) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_VERIFY_OTP, {
      email: String(email).trim().toLowerCase(),
      otp_code: String(otp_code).trim(),
    });
    const inner = data?.data;
    const ok =
      data?.success &&
      inner &&
      (inner.registration_completed === true || inner.verified === true);
    if (ok) {
      return {
        success: true,
        message: data.message,
        data: inner,
      };
    }
    return {
      success: false,
      error: data?.error || data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn',
    };
  } catch (err) {
    return {
      success: false,
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Xác minh thất bại',
    };
  }
};

/** Gửi OTP (email đã tồn tại). 201 */
export const sendOtp = async (email) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_SEND_OTP, {
      email: String(email).trim().toLowerCase(),
    });
    if (data?.success) {
      return { success: true, message: data.message, data: data.data };
    }
    return { success: false, error: data?.error || data?.message || 'Gửi OTP thất bại' };
  } catch (err) {
    return {
      success: false,
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Gửi OTP thất bại',
    };
  }
};

/** Gửi lại OTP — cùng logic giới hạn với send-otp */
export const resendOtp = async (email) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_RESEND_OTP, {
      email: String(email).trim().toLowerCase(),
    });
    if (data?.success) {
      return { success: true, message: data.message, data: data.data };
    }
    return { success: false, error: data?.error || data?.message || 'Gửi lại OTP thất bại' };
  } catch (err) {
    return {
      success: false,
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Gửi lại OTP thất bại',
    };
  }
};

export const logout = async () => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT);
  } catch {}
  clearAuthStorage();
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

/**
 * Xóa user vĩnh viễn (chỉ Admin). DELETE /api/auth/users/:userId
 * BE: không xóa chính mình; xóa admin chỉ khi còn ít nhất một admin khác; audit user_deleted. 200 / 400 / 404.
 */
export const deleteUser = async (userId) => {
  try {
    const url = API_ENDPOINTS.AUTH_USER_BY_ID.replace(':userId', String(userId));
    const { data } = await apiClient.delete(url);
    if (data?.success === false) {
      return { success: false, error: data?.error || data?.message || 'Xóa thất bại' };
    }
    return {
      success: true,
      message: data?.message || 'Đã xóa tài khoản',
    };
  } catch (err) {
    return {
      success: false,
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Xóa thất bại',
      status: err.response?.status,
    };
  }
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

/**
 * GET /api/reports/summary — thống kê auto-approve (Admin/Moderator).
 */
export const getReportsSummary = async () => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.REPORTS_SUMMARY);
    if (data?.success) {
      return { success: true, summary: normalizeReportsSummary(data.data ?? data) };
    }
    return {
      success: false,
      summary: normalizeReportsSummary(null),
      error: data?.error || data?.message,
    };
  } catch (err) {
    return {
      success: false,
      summary: normalizeReportsSummary(null),
      error: err.response?.data?.error || err.message,
    };
  }
};

/**
 * POST /api/reports/:reportId/skip-auto-approve
 */
export const skipReportAutoApprove = async (reportId) => {
  try {
    const url = API_ENDPOINTS.REPORT_SKIP_AUTO_APPROVE.replace(':reportId', String(reportId));
    const { data } = await apiClient.post(url, {});
    if (data?.success) {
      return { success: true, message: data.message, data: data.data };
    }
    return { success: false, error: data?.error || data?.message || 'Thao tác thất bại' };
  } catch (err) {
    return { success: false, error: err.response?.data?.error || err.message };
  }
};

export const moderateReport = async (reportId, action, rejectionReason = null) => {
  const url = API_ENDPOINTS.REPORT_MODERATE.replace(':reportId', reportId);
  const payload = action === 'reject' && rejectionReason
    ? { action, rejection_reason: rejectionReason }
    : { action };
  try {
    const { data } = await apiClient.put(url, payload);
    if (data?.success) return { success: true, message: data.message };
    return { success: false, error: data?.error || data?.message || 'Thao tác thất bại' };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    if (status === 409) {
      return { success: false, error: msg, code: 'AUTO_APPROVED_CONFLICT' };
    }
    return { success: false, error: msg };
  }
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
 * Research D1 - Evaluation (MAE/RMSE/Bias).
 * GET /api/v1/research/evaluation
 */
export const getResearchEvaluation = async (params = {}) => {
  try {
    const q = new URLSearchParams();
    if (params.crowd_hours != null) q.set('crowd_hours', String(params.crowd_hours));
    if (params.sensor_hours != null) q.set('sensor_hours', String(params.sensor_hours));
    if (params.min_lng != null) q.set('min_lng', String(params.min_lng));
    if (params.max_lng != null) q.set('max_lng', String(params.max_lng));
    if (params.min_lat != null) q.set('min_lat', String(params.min_lat));
    if (params.max_lat != null) q.set('max_lat', String(params.max_lat));
    const query = q.toString();
    const { data } = await apiClient.get(`${API_ENDPOINTS.RESEARCH_EVALUATION}${query ? `?${query}` : ''}`);
    if (data?.success && data?.data) {
      return { success: true, data: data.data, meta: data.meta || null };
    }
    return { success: false, data: null, error: data?.error || data?.message || 'Không có dữ liệu đánh giá' };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

/**
 * Research D2 - Cold-start hotspots.
 * GET /api/v1/research/cold-start-hotspots
 */
const appendResearchD2Query = (q, params) => {
  if (params.report_hours != null) q.set('report_hours', String(params.report_hours));
  if (params.sensor_hours != null) q.set('sensor_hours', String(params.sensor_hours));
  if (params.no_sensor_radius_m != null) q.set('no_sensor_radius_m', String(params.no_sensor_radius_m));
  if (params.min_reports != null) q.set('min_reports', String(params.min_reports));
  if (params.min_lng != null) q.set('min_lng', String(params.min_lng));
  if (params.max_lng != null) q.set('max_lng', String(params.max_lng));
  if (params.min_lat != null) q.set('min_lat', String(params.min_lat));
  if (params.max_lat != null) q.set('max_lat', String(params.max_lat));
};

export const getResearchColdStartHotspots = async (params = {}) => {
  try {
    const q = new URLSearchParams();
    appendResearchD2Query(q, params);
    const query = q.toString();
    const { data } = await apiClient.get(
      `${API_ENDPOINTS.RESEARCH_COLD_START_HOTSPOTS}${query ? `?${query}` : ''}`
    );
    if (data?.success && Array.isArray(data?.data)) {
      return { success: true, data: data.data, meta: data.meta || null };
    }
    return { success: false, data: [], error: data?.error || data?.message || 'Không có dữ liệu hotspot' };
  } catch (err) {
    return {
      success: false,
      data: [],
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

/**
 * Research D2 debug — histogram khoảng cách sensor (cùng sensor_hours như D1/D2).
 * GET /api/v1/research/cold-start-hotspots/debug
 */
export const getResearchColdStartHotspotsDebug = async (params = {}) => {
  try {
    const q = new URLSearchParams();
    appendResearchD2Query(q, params);
    const query = q.toString();
    const { data } = await apiClient.get(
      `${API_ENDPOINTS.RESEARCH_COLD_START_HOTSPOTS_DEBUG}${query ? `?${query}` : ''}`
    );
    if (data?.success && data?.data) {
      return { success: true, data: data.data, meta: data.meta || null };
    }
    return {
      success: false,
      data: null,
      error: data?.error || data?.message || 'Không tải được dữ liệu debug',
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

/**
 * A1 — Fusion điểm (sensor + crowd). GET /api/v1/fusion/points
 * BE yêu cầu bbox đủ 4 cạnh: min_lng, max_lng, min_lat, max_lat.
 */
export const getFusionPoints = async (params = {}) => {
  try {
    const q = new URLSearchParams();
    if (params.crowd_hours != null) q.set('crowd_hours', String(params.crowd_hours));
    if (params.sensor_hours != null) q.set('sensor_hours', String(params.sensor_hours));
    if (params.include_sensors === false) q.set('include_sensors', 'false');
    if (params.min_lng != null) q.set('min_lng', String(params.min_lng));
    if (params.max_lng != null) q.set('max_lng', String(params.max_lng));
    if (params.min_lat != null) q.set('min_lat', String(params.min_lat));
    if (params.max_lat != null) q.set('max_lat', String(params.max_lat));
    const query = q.toString();
    const { data } = await apiClient.get(`${API_ENDPOINTS.FUSION_POINTS}${query ? `?${query}` : ''}`);
    if (data?.success && data?.data) {
      return { success: true, data: data.data, meta: data.meta || null };
    }
    return { success: false, data: null, error: data?.error || data?.message || 'Không tải fusion' };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

/**
 * A3 — Dự báo ngắn hạn theo sensor. GET /api/v1/forecast/sensor/:sensorId
 */
export const getSensorForecast = async (sensorId, params = {}) => {
  try {
    const q = new URLSearchParams();
    if (params.horizon != null) q.set('horizon', String(params.horizon));
    if (params.sample_minutes != null) q.set('sample_minutes', String(params.sample_minutes));
    const path = API_ENDPOINTS.FORECAST_SENSOR.replace(':sensorId', String(sensorId));
    const query = q.toString();
    const { data } = await apiClient.get(`${path}${query ? `?${query}` : ''}`);
    if (data?.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, data: null, error: data?.error || data?.message || 'Không có dự báo' };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

/** B1 — Sức khỏe thiết bị (admin). */
export const getAdminDevicesHealth = async () => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.ADMIN_DEVICES_HEALTH);
    if (data?.success && Array.isArray(data.data)) {
      return {
        success: true,
        data: data.data,
        summary: data.summary || null,
        meta: data.meta || null,
      };
    }
    return { success: false, data: [], error: data?.error || 'Không tải health' };
  } catch (err) {
    return {
      success: false,
      data: [],
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

/** C1 — Thống kê cảnh báo khẩn đã gửi (admin). */
export const getEmergencyAlertsSummary = async (hours = 24) => {
  try {
    const h = Math.min(168, Math.max(1, Number(hours) || 24));
    const { data } = await apiClient.get(
      `${API_ENDPOINTS.ADMIN_EMERGENCY_ALERTS_SUMMARY}?hours=${h}`
    );
    if (data?.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, data: null, error: data?.error || 'Không tải thống kê' };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.error || err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

function heatmapQuery(params = {}) {
  const q = new URLSearchParams();
  if (params.minLng != null) q.set('minLng', String(params.minLng));
  if (params.minLat != null) q.set('minLat', String(params.minLat));
  if (params.maxLng != null) q.set('maxLng', String(params.maxLng));
  if (params.maxLat != null) q.set('maxLat', String(params.maxLat));
  if (params.gridSize != null) q.set('gridSize', String(params.gridSize));
  return q.toString();
}

/** C2 — Heatmap sensors. */
export const getHeatmap = async (params = {}) => {
  try {
    const query = heatmapQuery(params);
    const { data } = await apiClient.get(`${API_ENDPOINTS.HEATMAP}${query ? `?${query}` : ''}`);
    if (data?.success) {
      return { success: true, data: Array.isArray(data.data) ? data.data : [] };
    }
    return { success: false, data: [], error: data?.error };
  } catch (err) {
    return {
      success: false,
      data: [],
      error: err.response?.data?.error || err.message,
      status: err.response?.status,
    };
  }
};

export const getHeatmapCombined = async (params = {}) => {
  try {
    const query = heatmapQuery(params);
    const { data } = await apiClient.get(`${API_ENDPOINTS.HEATMAP_COMBINED}${query ? `?${query}` : ''}`);
    if (data?.success) {
      return { success: true, data: Array.isArray(data.data) ? data.data : [] };
    }
    return { success: false, data: [], error: data?.error };
  } catch (err) {
    return {
      success: false,
      data: [],
      error: err.response?.data?.error || err.message,
      status: err.response?.status,
    };
  }
};

export const getHeatmapTimeline24h = async (params = {}) => {
  try {
    const query = heatmapQuery(params);
    const { data } = await apiClient.get(`${API_ENDPOINTS.HEATMAP_TIMELINE_24H}${query ? `?${query}` : ''}`);
    if (data?.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
    return { success: false, data: [], error: data?.error };
  } catch (err) {
    return {
      success: false,
      data: [],
      error: err.response?.data?.error || err.message,
      status: err.response?.status,
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
