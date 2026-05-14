import React from 'react';
import { useTranslation } from 'react-i18next';

export function StatusBadge({ active }) {
  const { t } = useTranslation();
  const v = active
    ? { dot: 'bg-emerald-500', text: 'text-emerald-200', label: t('common.statusActive') }
    : { dot: 'bg-red-500', text: 'text-red-200', label: t('common.statusLocked') };
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${v.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${v.dot}`} aria-hidden />
      {v.label}
    </span>
  );
}
