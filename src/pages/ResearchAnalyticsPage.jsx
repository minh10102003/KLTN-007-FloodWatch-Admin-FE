import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFlaskVial } from 'react-icons/fa6';
import { Droplets } from 'lucide-react';
import { getResearchColdStartHotspots, getResearchEvaluation } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';
import ResearchFilters from '../components/admin/ResearchFilters';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { formatMetersToKm } from '../utils/formatters';
import { formatAdminDateTime } from '../utils/formatDateTime';
import i18n from '../i18n/config';
import { useToast } from '../components/ui/Toast';

const defaultFilters = {
  crowd_hours: 72,
  sensor_hours: 6,
  report_hours: 72,
  no_sensor_radius_m: 1500,
  min_reports: 2,
  min_lng: '',
  max_lng: '',
  min_lat: '',
  max_lat: '',
};

const numberOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pctImprovement = (baseline, fused) => {
  if (baseline == null || fused == null) return null;
  if (Number(baseline) === 0) return null;
  return ((Number(baseline) - Number(fused)) / Number(baseline)) * 100;
};

const fmt = (v, digits = 2) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits));

export default function ResearchAnalyticsPage() {
  const { t, i18n: i18nReact } = useTranslation();
  const { toast } = useToast();
  const [filters, setFilters] = useState(defaultFilters);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationMeta, setEvaluationMeta] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotsMeta, setHotspotsMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const queryCommonBbox = {
    ...(numberOrNull(filters.min_lng) != null ? { min_lng: numberOrNull(filters.min_lng) } : {}),
    ...(numberOrNull(filters.max_lng) != null ? { max_lng: numberOrNull(filters.max_lng) } : {}),
    ...(numberOrNull(filters.min_lat) != null ? { min_lat: numberOrNull(filters.min_lat) } : {}),
    ...(numberOrNull(filters.max_lat) != null ? { max_lat: numberOrNull(filters.max_lat) } : {}),
  };

  const load = async () => {
    setLoading(true);
    const [d1, d2] = await Promise.all([
      getResearchEvaluation({
        crowd_hours: Number(filters.crowd_hours),
        sensor_hours: Number(filters.sensor_hours),
        ...queryCommonBbox,
      }),
      getResearchColdStartHotspots({
        report_hours: Number(filters.report_hours),
        no_sensor_radius_m: Number(filters.no_sensor_radius_m),
        min_reports: Number(filters.min_reports),
        ...queryCommonBbox,
      }),
    ]);
    setLoading(false);
    setLoaded(true);

    if (d1.success) {
      setEvaluation(d1.data);
      setEvaluationMeta(d1.meta);
    } else {
      setEvaluation(null);
      setEvaluationMeta(null);
      toast(i18n.t('common.errorGeneric'), 'error');
    }

    if (d2.success) {
      const sorted = [...(d2.data || [])].sort((a, b) => (b.report_count || 0) - (a.report_count || 0));
      setHotspots(sorted);
      setHotspotsMeta(d2.meta);
    } else {
      setHotspots([]);
      setHotspotsMeta(null);
      toast(i18n.t('common.errorGeneric'), 'error');
    }
  };

  const reset = () => {
    setFilters(defaultFilters);
    setEvaluation(null);
    setEvaluationMeta(null);
    setHotspots([]);
    setHotspotsMeta(null);
    setLoaded(false);
  };

  const hotspotsWithPriority = useMemo(() => {
    if (!hotspots.length) return [];
    const scored = hotspots.map((h) => ({
      ...h,
      priority_score: Number(h.report_count || 0) * Number(h.avg_crowd_cm || 0),
    }));
    const values = scored.map((x) => x.priority_score).sort((a, b) => a - b);
    const q40 = values[Math.max(0, Math.floor(values.length * 0.4) - 1)] ?? values[0] ?? 0;
    const q80 = values[Math.max(0, Math.floor(values.length * 0.8) - 1)] ?? values[values.length - 1] ?? 0;
    return scored.map((s) => {
      let levelKey = 'low';
      if (s.priority_score >= q80) levelKey = 'high';
      else if (s.priority_score >= q40) levelKey = 'medium';
      return { ...s, priority_level_key: levelKey };
    });
  }, [hotspots]);

  const rmseImprovement = pctImprovement(evaluation?.baseline_crowd_only?.rmse_cm, evaluation?.fused_model?.rmse_cm);
  const maeImprovement = pctImprovement(evaluation?.baseline_crowd_only?.mae_cm, evaluation?.fused_model?.mae_cm);

  const exportCsv = () => {
    if (!hotspotsWithPriority.length) return;
    const header = [
      '#',
      'hotspot_lng',
      'hotspot_lat',
      'report_count',
      'avg_crowd_cm',
      'max_crowd_cm',
      'nearest_sensor_min_dist_m',
      'latest_report_at',
      'priority_score',
      'priority_level',
    ];
    const rows = hotspotsWithPriority.map((h, idx) => [
      String(idx + 1),
      String(h.hotspot_lng ?? ''),
      String(h.hotspot_lat ?? ''),
      String(h.report_count ?? 0),
      String(h.avg_crowd_cm ?? ''),
      String(h.max_crowd_cm ?? ''),
      String(h.nearest_sensor_min_dist_m ?? ''),
      String(h.latest_report_at ?? ''),
      String(h.priority_score ?? ''),
      h.priority_level_key ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-hotspots-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crowdH = evaluationMeta?.crowd_report_hours ?? filters.crowd_hours;
  const sensorH = evaluationMeta?.sensor_log_hours ?? filters.sensor_hours;
  const reportH = hotspotsMeta?.report_hours ?? filters.report_hours;
  const radiusM = hotspotsMeta?.no_sensor_radius_m ?? filters.no_sensor_radius_m;
  const lng = i18nReact.language?.startsWith('en') ? 'en' : 'vi';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t('research.title')}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t('research.subtitle')}</p>
        </div>
      </div>

      <ResearchFilters
        filters={filters}
        setFilters={setFilters}
        onApply={load}
        onReset={reset}
        loading={loading}
        onExportCsv={exportCsv}
        exportDisabled={!hotspotsWithPriority.length}
        onRetry={load}
        loaded={loaded}
      />

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
          <p className="text-xs font-medium text-zinc-500">{t('research.sampleCount')}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{evaluation?.sample_count ?? '—'}</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {t('research.summaryHours', { crowd: crowdH, sensor: sensorH })}
          </p>
        </div>
        {loading && !evaluation ? (
          <>
            <div className="h-28 animate-pulse rounded-xl border border-dashboard-border bg-dashboard-surface/60" />
            <div className="h-28 animate-pulse rounded-xl border border-dashboard-border bg-dashboard-surface/60" />
            <div className="h-28 animate-pulse rounded-xl border border-dashboard-border bg-dashboard-surface/60" />
          </>
        ) : (
          <>
            <MetricCard
              metricHelp="mae"
              label={t('research.metricMae')}
              baseline={evaluation?.baseline_crowd_only?.mae_cm}
              fused={evaluation?.fused_model?.mae_cm}
              improvement={maeImprovement}
            />
            <MetricCard
              metricHelp="rmse"
              label={t('research.metricRmse')}
              baseline={evaluation?.baseline_crowd_only?.rmse_cm}
              fused={evaluation?.fused_model?.rmse_cm}
              improvement={rmseImprovement}
            />
            <MetricCard
              metricHelp="bias"
              label={t('research.metricBias')}
              baseline={evaluation?.baseline_crowd_only?.bias_cm}
              fused={evaluation?.fused_model?.bias_cm}
              improvement={null}
            />
          </>
        )}
      </section>

      <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">{t('research.d2Title')}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {t('research.d2Subtitle', { hours: reportH, radius: formatMetersToKm(radiusM) })}
            </p>
          </div>
        </div>

        {!loaded ? (
          loading ? (
            <TableSkeleton rows={8} cols={9} />
          ) : (
            <EmptyState
              icon={<FaFlaskVial />}
              title={t('research.notLoadedTitle')}
              description={t('research.notLoadedHint')}
              action={
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  {t('research.adjustFilters')}
                </button>
              }
            />
          )
        ) : loading ? (
          <TableSkeleton rows={8} cols={9} />
        ) : !hotspotsWithPriority.length ? (
          <EmptyState
            icon={<Droplets className="mx-auto h-12 w-12" />}
            title={t('research.emptyData')}
            description={t('research.emptyHint')}
            action={
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                {t('research.adjustFilters')}
              </button>
            }
          />
        ) : (
          <Table
            colWidths={[5, 15, 10, 12, 12, 16, 10, 10, 10]}
            className="rounded-lg border border-dashboard-border"
          >
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableTh>#</TableTh>
                <TableTh>{t('research.tableCoord')}</TableTh>
                <TableTh>{t('research.tableReports')}</TableTh>
                <TableTh>{t('research.tableAvgCm')}</TableTh>
                <TableTh>{t('research.tableMaxCm')}</TableTh>
                <TableTh>{t('research.tableNearestM')}</TableTh>
                <TableTh>{t('research.tablePriority')}</TableTh>
                <TableTh>{t('research.tableScore')}</TableTh>
                <TableTh>{t('research.tableLatest')}</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {hotspotsWithPriority.map((h, idx) => {
                const levelKey = h.priority_level_key || 'low';
                const levelClass =
                  levelKey === 'high'
                    ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                    : levelKey === 'medium'
                      ? 'bg-amber-500/15 text-amber-100 border border-amber-500/25'
                      : 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/40';
                return (
                  <TableRow key={`${h.hotspot_lng}-${h.hotspot_lat}-${idx}`}>
                    <TableTd>{idx + 1}</TableTd>
                    <TableTd className="font-mono text-xs">
                      {fmt(h.hotspot_lng, 6)}, {fmt(h.hotspot_lat, 6)}
                    </TableTd>
                    <TableTd>{h.report_count ?? 0}</TableTd>
                    <TableTd>{fmt(h.avg_crowd_cm)}</TableTd>
                    <TableTd>{fmt(h.max_crowd_cm)}</TableTd>
                    <TableTd>{fmt(h.nearest_sensor_min_dist_m, 1)}</TableTd>
                    <TableTd>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelClass}`}>
                        {t(`research.priority.${levelKey}`)}
                      </span>
                    </TableTd>
                    <TableTd>{fmt(h.priority_score, 1)}</TableTd>
                    <TableTd className="text-xs text-zinc-400">
                      {formatAdminDateTime(h.latest_report_at, lng)}
                    </TableTd>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
