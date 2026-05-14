import { API_CONFIG } from '../config/apiConfig';

const UPLOADS_PATH_PREFIX = '/uploads/';
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/** BE đôi khi chỉ trả tên file; buộc vào /uploads/ để khớp proxy dev và static BE. */
function normalizeUploadPath(u) {
  const s = u.trim();
  if (!s || s.startsWith('data:') || s.startsWith('blob:') || /^https?:\/\//i.test(s) || s.startsWith('//')) {
    return s;
  }
  if (s.startsWith(UPLOADS_PATH_PREFIX) || s === '/uploads') return s;
  if (s.startsWith('uploads/')) return `/${s}`;
  // chỉ tên file + đuôi ảnh → coi là file trong uploads
  if (!s.includes('/') && IMAGE_EXT.test(s)) return `${UPLOADS_PATH_PREFIX}${s}`;
  const withSlash = s.startsWith('/') ? s : `/${s}`;
  // một segment dạng /xxx.jpg (không phải route API) → uploads
  if (withSlash.match(/^\/[^/]+\.(jpe?g|png|webp|gif|avif)$/i)) return `${UPLOADS_PATH_PREFIX}${withSlash.slice(1)}`;
  return withSlash;
}

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
      // URL đầy đủ nhưng path chỉ là /tên-file.jpg → chuyển sang uploads
      const normalized = normalizeUploadPath(parsed.pathname);
      if (normalized.startsWith(UPLOADS_PATH_PREFIX)) {
        return withResolvedOrigin(normalized, parsed.search, parsed.hash);
      }
    } catch {
      /* ignore */
    }
    return u;
  }

  const path = normalizeUploadPath(u);
  return withResolvedOrigin(path, '', '');
}
