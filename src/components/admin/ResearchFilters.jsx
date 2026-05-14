import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate, FaDownload } from 'react-icons/fa6';

export default function ResearchFilters({
  filters,
  setFilters,
  onApply,
  onReset,
  loading,
  onExportCsv,
  exportDisabled,
  onRetry,
  loaded,
}) {
  const { t } = useTranslation();
  const row1 = ['crowd_hours', 'sensor_hours', 'report_hours', 'no_sensor_radius_m', 'min_reports'];
  const row2 = ['min_lng', 'max_lng', 'min_lat', 'max_lat'];

  const inputProps = (key) => ({
    value: filters[key],
    onChange: (e) => setFilters((f) => ({ ...f, [key]: e.target.value })),
    className:
      'mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
  });

  return (
    <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {row1.map((key) => (
          <label key={key} className="text-sm text-zinc-300">
            <span className="block leading-snug text-zinc-400">{t(`research.fields.${key}`)}</span>
            <input type="number" min={key === 'no_sensor_radius_m' ? 100 : 1} {...inputProps(key)} />
          </label>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {row2.map((key) => (
          <label key={key} className="text-sm text-zinc-300">
            <span className="block leading-snug text-zinc-400">{t(`research.fields.${key}`)}</span>
            <input type="number" step="any" {...inputProps(key)} />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('common.apply')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
        >
          {t('common.reset')}
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exportDisabled}
          className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        >
          <FaDownload /> {t('common.exportCsv')}
        </button>
        {loaded && (
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            <FaArrowsRotate /> {t('common.retry')}
          </button>
        )}
      </div>
    </section>
  );
}
