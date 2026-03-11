/**
 * Phân tầng tin cậy reporter: Đồng (0-40), Bạc (41-70), Vàng (71-100)
 * @param {number} score 0-100 (reporter_reliability)
 */
export function getReporterReliabilityTier(score) {
  const s = Number(score);
  if (s >= 71) return { tier: 'Vàng', color: '#d4a017', bgLight: '#fef9e7' };
  if (s >= 41) return { tier: 'Bạc', color: '#6c757d', bgLight: '#f0f0f0' };
  return { tier: 'Đồng', color: '#cd7f32', bgLight: '#faf0e6' };
}
