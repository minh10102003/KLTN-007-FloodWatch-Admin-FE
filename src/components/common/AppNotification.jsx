import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Một thông báo nổi (success / error / info) — dùng trong ToastProvider.
 */
export function AppNotificationCard({ type = 'success', message, onDismiss, closeLabel = 'Đóng' }) {
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;
  const tone =
    type === 'success'
      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100'
      : type === 'error'
        ? 'border-red-500/45 bg-red-500/15 text-red-100'
        : 'border-sky-500/45 bg-sky-500/12 text-sky-100';

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border shadow-lg backdrop-blur-sm ${tone}`}
    >
      <Icon className="mt-2.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
      <p className="min-w-0 flex-1 py-2.5 pr-1 text-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="m-1 shrink-0 rounded-lg p-1.5 text-current opacity-70 transition hover:bg-white/10 hover:opacity-100"
        aria-label={closeLabel}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
