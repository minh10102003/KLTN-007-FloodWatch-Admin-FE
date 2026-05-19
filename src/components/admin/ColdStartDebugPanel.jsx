import React from 'react';
import { useTranslation } from 'react-i18next';

export function ColdStartDebugPanel({ stats, loading, radiusM }) {
  const { t } = useTranslation();

  if (loading) {
    return <p className="mt-4 text-sm text-zinc-500">{t('research.debugLoading')}</p>;
  }
  if (!stats) return null;

  const histogram = [...(stats.distance_histogram || [])].sort(
    (a, b) => (a.bucket_order ?? 0) - (b.bucket_order ?? 0)
  );
  const maxBar = Math.max(...histogram.map((h) => h.report_count ?? 0), 1);

  return (
    <div className="mt-4 rounded-lg border border-dashboard-border bg-dashboard-surface/50 p-4">
      <h3 className="text-sm font-medium text-zinc-200">{t('research.debugTitle')}</h3>
      <p className="mt-1 text-xs text-zinc-500">{t('research.debugSubtitle', { radius: radiusM })}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-zinc-500">{t('research.debugSensorsWithLogs')}</dt>
          <dd className="font-medium text-zinc-100">{stats.sensors_with_logs_in_window ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t('research.debugApprovedReports')}</dt>
          <dd className="font-medium text-zinc-100">{stats.approved_reports_in_window ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t('research.debugNoSensorWithLogs')}</dt>
          <dd className="font-medium text-zinc-100">{stats.reports_no_sensor_with_logs ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t('research.debugBeyondRadius')}</dt>
          <dd className="font-medium text-zinc-100">{stats.reports_beyond_radius ?? '—'}</dd>
        </div>
      </dl>

      {histogram.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-400">{t('research.debugHistogramTitle')}</p>
          <ul className="mt-2 space-y-2">
            {histogram.map((bucket) => {
              const count = bucket.report_count ?? 0;
              const pct = Math.round((count / maxBar) * 100);
              return (
                <li key={bucket.bucket_order ?? bucket.bucket_label}>
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <span className="w-28 shrink-0">{bucket.bucket_label}</span>
                    <span className="tabular-nums text-zinc-300">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-violet-500/80" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
