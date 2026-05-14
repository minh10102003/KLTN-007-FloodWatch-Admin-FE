/** Thông báo an toàn cho UI — không lộ URL, stack, chi tiết BE. */
export function safeRequestMessage(_err, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  if (import.meta.env.DEV && _err) {
    // eslint-disable-next-line no-console
    console.debug('[api]', _err);
  }
  return fallback;
}
