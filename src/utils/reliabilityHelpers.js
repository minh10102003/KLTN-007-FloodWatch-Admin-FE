/**
 * Phân tầng tin cậy reporter: Đồng (0-40), Bạc (41-70), Vàng (71-100)
 * @param {number} score 0-100 (reporter_reliability)
 */
export function getReporterReliabilityTier(score) {
  const s = Number(score);
  if (s >= 71) return { tier: 'Vàng', color: '#FFD700', bgLight: 'rgba(255, 215, 0, 0.12)' };
  if (s >= 41) return { tier: 'Bạc', color: '#C0C0C0', bgLight: 'rgba(192, 192, 192, 0.12)' };
  return { tier: 'Đồng', color: '#CD7F32', bgLight: 'rgba(205, 127, 50, 0.12)' };
}
