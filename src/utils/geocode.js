/**
 * Reverse geocode (lat, lng) -> địa chỉ bằng Nominatim (OpenStreetMap).
 * Có cache và queue 1 request/1.5s để tránh vượt giới hạn.
 */

const cache = new Map();
const queue = [];
let queueTimer = null;

function processQueue() {
  if (queue.length === 0) {
    queueTimer = null;
    return;
  }
  const { lat, lng, resolve } = queue.shift();
  const key = `${lat},${lng}`;
  if (cache.has(key)) {
    resolve(cache.get(key));
    queueTimer = setTimeout(processQueue, 100);
    return;
  }
  fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'vi' } }
  )
    .then((r) => r.json())
    .then((data) => {
      const addr =
        data?.display_name ||
        (data?.address
          ? [
              data.address.road,
              data.address.suburb,
              data.address.neighbourhood,
              data.address.district,
              data.address.city,
              data.address.state,
            ]
              .filter(Boolean)
              .join(', ')
          : '');
      if (addr) cache.set(key, addr);
      resolve(addr || null);
    })
    .catch(() => resolve(null))
    .finally(() => {
      queueTimer = setTimeout(processQueue, 1500);
    });
}

/**
 * Geocode (lat, lng) -> địa chỉ. Trả về Promise<string | null>.
 * Kết quả được cache.
 */
export function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return Promise.resolve(null);
  const key = `${lat},${lng}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return new Promise((resolve) => {
    queue.push({ lat, lng, resolve });
    if (!queueTimer) queueTimer = setTimeout(processQueue, 0);
  });
}

/**
 * Trả về chuỗi hiển thị địa chỉ: ưu tiên location_description,
 * nếu có lat/lng thì dùng geocode (hoặc tọa độ khi chưa có kết quả).
 */
export function getDisplayAddress(report, geocodedAddress) {
  const desc = report?.location_description?.trim();
  if (desc && !/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(desc)) return desc;
  if (geocodedAddress) return geocodedAddress;
  if (report?.lat != null && report?.lng != null)
    return `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}`;
  return '—';
}
