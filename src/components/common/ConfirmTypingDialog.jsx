import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ConfirmTypingDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase,
  confirmLabel,
  loading = false,
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const resolvedTitle = title ?? t('confirmTyping.defaultTitle');
  const resolvedConfirmLabel = confirmLabel ?? t('confirmTyping.defaultConfirm');

  useEffect(() => {
    if (open) setValue('');
  }, [open, confirmPhrase]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const match = value.trim() === (confirmPhrase || '').trim();
  const disabled = !match || loading;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/60"
        aria-label={t('common.closeAria')}
        onClick={() => !loading && onClose?.()}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-dashboard-border bg-dashboard-card p-6 shadow-2xl">
        <div className="flex gap-3">
          <span className="text-2xl" aria-hidden>
            ⚠️
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-zinc-100">{resolvedTitle}</h3>
            {description && <p className="mt-2 text-sm text-zinc-400">{description}</p>}
            <p className="mt-4 text-sm text-zinc-300">
              {t('confirmTyping.instructionBefore')}
              <strong className="text-violet-300">&quot;{confirmPhrase}&quot;</strong>
              {t('confirmTyping.instructionAfter')}
            </p>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder={t('confirmTyping.usernamePlaceholder')}
              disabled={loading}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.()}
            disabled={disabled}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('confirmTyping.deleting') : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
