/** Ngưỡng báo cáo lân cận (đồng bộ logic BE). */
export const AUTO_APPROVE_MIN_NEIGHBORS = 5;

/**
 * Đánh giá đủ điều kiện auto-approve (dùng FE preview / test; BE là nguồn chân lý).
 * @param {{ neighborCount: number, sensorVerified: boolean }} params
 */
export function checkAutoApprove({ neighborCount, sensorVerified }) {
  const count = Number(neighborCount) || 0;
  const hasSensor = Boolean(sensorVerified);

  if (count < AUTO_APPROVE_MIN_NEIGHBORS) {
    return {
      eligible: false,
      autoApproved: false,
      sensorVerified: false,
      reason: 'insufficient_neighbors',
    };
  }

  if (hasSensor) {
    return {
      eligible: true,
      autoApproved: true,
      sensorVerified: true,
      reason: 'auto_with_sensor',
    };
  }

  return {
    eligible: true,
    autoApproved: true,
    sensorVerified: false,
    reason: 'auto_no_sensor',
  };
}
