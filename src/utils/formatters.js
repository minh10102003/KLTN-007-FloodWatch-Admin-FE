import { getReporterReliabilityTier } from './reliabilityHelpers';

const INTERNAL_USER_RE = /^g_\d{6,}$/i;

export function isLikelyInternalUsername(username) {
  if (!username || typeof username !== 'string') return false;
  return INTERNAL_USER_RE.test(username.trim());
}

/** Tên hiển thị ưu tiên họ tên; ẩn username nội bộ dạng g_… */
export function getUserDisplayName(user) {
  if (!user) return '—';
  const full = (user.full_name || '').trim();
  if (full) return full;
  if (!isLikelyInternalUsername(user.username)) return (user.username || '').trim() || '—';
  const email = (user.email || '').trim();
  if (email) return email.split('@')[0] || 'Người dùng';
  return 'Người dùng';
}

export function getInitials(user) {
  const name = getUserDisplayName(user);
  if (name === '—' || name === 'Người dùng') {
    const u = (user?.username || '').trim();
    if (u && !isLikelyInternalUsername(u)) return u.slice(0, 2).toUpperCase();
    return '?';
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function hueFromString(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  moderator: 'Điều hành viên',
  user: 'Người dùng',
};

export function formatRole(role) {
  return ROLE_LABELS[role] || role || '—';
}

export function trustTierKeyFromScore(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const n = Number(score);
  if (n >= 71) return 'gold';
  if (n >= 41) return 'silver';
  return 'bronze';
}

export function formatTrustSummary(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const tier = getReporterReliabilityTier(score);
  return { tier: tier.tier, score: Number(score), color: tier.color };
}

export function formatDateVi(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return '—';
  }
}

export function formatMetersToKm(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} km`;
  return `${Math.round(n)} m`;
}
