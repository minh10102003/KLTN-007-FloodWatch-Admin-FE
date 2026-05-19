/** Đồng bộ DeviceHealthPage với socket / dữ liệu realtime. */
export const DEVICE_HEALTH_REFRESH = 'admin-device-health-refresh';

export function dispatchDeviceHealthRefresh(reason = 'unknown') {
  window.dispatchEvent(new CustomEvent(DEVICE_HEALTH_REFRESH, { detail: { reason } }));
}

/** Phân loại health phía FE (cùng logic BE) để cập nhật phút chờ giữa các lần poll. */
export function classifyHealthClient(row, thresholds) {
  if (!row?.is_active) {
    return { health: 'inactive', reason: 'Sensor is_active = false', minutes_since_data: row?.minutes_since_data ?? null };
  }
  const onlineMax = thresholds?.onlineMax ?? 2;
  const degradedMax = thresholds?.degradedMax ?? 5;
  const lastSrc = row.last_data_time;
  if (!lastSrc) {
    return { health: 'offline', reason: 'Chưa nhận dữ liệu', minutes_since_data: null };
  }
  const last = new Date(lastSrc).getTime();
  if (Number.isNaN(last)) {
    return { health: 'unknown', reason: 'last_data_time không hợp lệ', minutes_since_data: null };
  }
  const minutes = Math.round(((Date.now() - last) / 60000) * 10) / 10;
  if (minutes <= onlineMax) {
    return { health: 'online', reason: null, minutes_since_data: minutes };
  }
  if (minutes <= degradedMax) {
    return { health: 'degraded', reason: 'Dữ liệu trễ', minutes_since_data: minutes };
  }
  return {
    health: 'offline',
    reason: `Không có dữ liệu > ${degradedMax} phút`,
    minutes_since_data: minutes,
  };
}

export function buildHealthSummary(rows) {
  return rows.reduce((acc, d) => {
    const k = d.health || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}
