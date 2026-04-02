import { API_CONFIG } from '../config/apiConfig';

const UPLOADS_PATH_PREFIX = '/uploads/';

function baseForPath(pathname) {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (p.startsWith(UPLOADS_PATH_PREFIX) || p === '/uploads') {
    return API_CONFIG.UPLOADS_BASE_URL.replace(/\/+$/, '');
  }
  return API_CONFIG.BASE_URL.replace(/\/+$/, '');
}

function withResolvedOrigin(pathname, search, hash) {
  const base = baseForPath(pathname);
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}${search || ''}${hash || ''}`;
}

/**
 * Ảnh từ BE: `/uploads/...` hoặc URL sai host (vd. localhost lúc upload).
 * `/uploads/` dùng `VITE_UPLOADS_BASE_URL` hoặc mặc định cùng API.
 */
export function resolvePublicMediaUrl(url) {
  if (url == null || typeof url !== 'string') return url;
  const u = url.trim();
  if (!u) return u;
  if (u.startsWith('data:') || u.startsWith('blob:')) return u;
  if (u.startsWith('//')) return u;

  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      if (parsed.pathname.startsWith(UPLOADS_PATH_PREFIX)) {
        return withResolvedOrigin(parsed.pathname, parsed.search, parsed.hash);
      }
    } catch {
      /* ignore */
    }
    return u;
  }

  const path = u.startsWith('/') ? u : `/${u}`;
  return withResolvedOrigin(path, '', '');
}
