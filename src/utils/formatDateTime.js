/** Định dạng ngày/giờ ưu tiên dd/mm/yyyy cho bảng admin (theo ngôn ngữ UI). */
export function formatAdminDateTime(iso, lng = 'vi') {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = lng === 'en' ? 'en-GB' : 'vi-VN';
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
