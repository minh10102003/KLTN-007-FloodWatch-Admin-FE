import React, { useEffect, useMemo, useState } from 'react';
import { FaArrowsRotate, FaDownload, FaFlaskVial } from 'react-icons/fa6';
import { getResearchColdStartHotspots, getResearchEvaluation } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';

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
  const [filters, setFilters] = useState(defaultFilters);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationMeta, setEvaluationMeta] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotsMeta, setHotspotsMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const queryCommonBbox = {
    ...(numberOrNull(filters.min_lng) != null ? { min_lng: numberOrNull(filters.min_lng) } : {}),
    ...(numberOrNull(filters.max_lng) != null ? { max_lng: numberOrNull(filters.max_lng) } : {}),
    ...(numberOrNull(filters.min_lat) != null ? { min_lat: numberOrNull(filters.min_lat) } : {}),
    ...(numberOrNull(filters.max_lat) != null ? { max_lat: numberOrNull(filters.max_lat) } : {}),
  };

  const load = async () => {
    setLoading(true);
    setError('');
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
      setError((prev) => prev || d1.error || 'Không tải được dữ liệu D1');
    }

    if (d2.success) {
      const sorted = [...(d2.data || [])].sort((a, b) => (b.report_count || 0) - (a.report_count || 0));
      setHotspots(sorted);
      setHotspotsMeta(d2.meta);
    } else {
      setHotspots([]);
      setHotspotsMeta(null);
      setError((prev) => prev || d2.error || 'Không tải được dữ liệu D2');
    }
  };

  const reset = () => {
    setFilters(defaultFilters);
    setEvaluation(null);
    setEvaluationMeta(null);
    setHotspots([]);
    setHotspotsMeta(null);
    setError('');
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
      let level = 'Thấp';
      if (s.priority_score >= q80) level = 'Cao';
      else if (s.priority_score >= q40) level = 'Trung bình';
      return { ...s, priority_level: level };
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
      h.priority_level ?? '',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Research Analytics</h1>
        <p className="text-xs text-zinc-500">
          D1: MAE/RMSE/Bias (crowd_only vs fused) · D2: cold-start hotspots
        </p>
      </div>

      <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-zinc-300">
            crowd_hours
            <input
              type="number"
              min={1}
              value={filters.crowd_hours}
              onChange={(e) => setFilters((f) => ({ ...f, crowd_hours: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            sensor_hours
            <input
              type="number"
              min={1}
              value={filters.sensor_hours}
              onChange={(e) => setFilters((f) => ({ ...f, sensor_hours: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            report_hours
            <input
              type="number"
              min={1}
              value={filters.report_hours}
              onChange={(e) => setFilters((f) => ({ ...f, report_hours: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            no_sensor_radius_m
            <input
              type="number"
              min={100}
              value={filters.no_sensor_radius_m}
              onChange={(e) => setFilters((f) => ({ ...f, no_sensor_radius_m: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            min_reports
            <input
              type="number"
              min={1}
              value={filters.min_reports}
              onChange={(e) => setFilters((f) => ({ ...f, min_reports: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-sm text-zinc-300">
            min_lng
            <input
              type="number"
              step="any"
              value={filters.min_lng}
              onChange={(e) => setFilters((f) => ({ ...f, min_lng: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            max_lng
            <input
              type="number"
              step="any"
              value={filters.max_lng}
              onChange={(e) => setFilters((f) => ({ ...f, max_lng: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            min_lat
            <input
              type="number"
              step="any"
              value={filters.min_lat}
              onChange={(e) => setFilters((f) => ({ ...f, min_lat: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-300">
            max_lat
            <input
              type="number"
              step="any"
              value={filters.max_lat}
              onChange={(e) => setFilters((f) => ({ ...f, max_lat: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Áp dụng'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!hotspotsWithPriority.length}
            className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            <FaDownload /> Xuất CSV
          </button>
          {loaded && (
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
            >
              <FaArrowsRotate /> Retry
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
          <p className="text-xs text-zinc-500">Sample count</p>
          <p className="mt-1 text-2xl font-semibold">{evaluation?.sample_count ?? '—'}</p>
          <p className="mt-2 text-xs text-zinc-500">
            crowd_hours: {evaluationMeta?.crowd_report_hours ?? filters.crowd_hours}, sensor_hours:{' '}
            {evaluationMeta?.sensor_log_hours ?? filters.sensor_hours}
          </p>
        </div>
        <MetricCard
          label="MAE (cm)"
          baseline={evaluation?.baseline_crowd_only?.mae_cm}
          fused={evaluation?.fused_model?.mae_cm}
          improvement={maeImprovement}
        />
        <MetricCard
          label="RMSE (cm)"
          baseline={evaluation?.baseline_crowd_only?.rmse_cm}
          fused={evaluation?.fused_model?.rmse_cm}
          improvement={rmseImprovement}
        />
        <MetricCard
          label="Bias (cm)"
          baseline={evaluation?.baseline_crowd_only?.bias_cm}
          fused={evaluation?.fused_model?.bias_cm}
          improvement={null}
        />
      </section>

      <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-100">D2 Cold-start Hotspots</h2>
          <span className="text-xs text-zinc-500">
            report_hours: {hotspotsMeta?.report_hours ?? filters.report_hours}, radius:{' '}
            {hotspotsMeta?.no_sensor_radius_m ?? filters.no_sensor_radius_m}m
          </span>
        </div>

        {!loaded ? (
          <div className="rounded-lg border border-dashboard-border bg-dashboard-surface p-8 text-center text-zinc-400">
            Chọn bộ lọc và bấm <strong>Áp dụng</strong> để tải dữ liệu research.
          </div>
        ) : !loading && hotspotsWithPriority.length === 0 ? (
          <div className="rounded-lg border border-dashboard-border bg-dashboard-surface p-8 text-center text-zinc-400">
            <FaFlaskVial className="mx-auto mb-2 h-8 w-8 text-zinc-500" />
            <p className="font-medium">Chưa đủ dữ liệu trong khoảng thời gian đã chọn</p>
            <p className="text-sm">Thử tăng report_hours hoặc giảm min_reports để lấy thêm hotspot.</p>
          </div>
        ) : (
          <Table
            colWidths={[5, 15, 10, 12, 12, 16, 10, 10, 10]}
            className="rounded-lg border border-dashboard-border"
          >
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableTh>#</TableTh>
                <TableTh>Tọa độ</TableTh>
                <TableTh>Report</TableTh>
                <TableTh>Avg (cm)</TableTh>
                <TableTh>Max (cm)</TableTh>
                <TableTh>Nearest sensor (m)</TableTh>
                <TableTh>Priority</TableTh>
                <TableTh>Score</TableTh>
                <TableTh>Mới nhất</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {hotspotsWithPriority.map((h, idx) => {
                const levelClass =
                  h.priority_level === 'Cao'
                    ? 'bg-red-100 text-red-800'
                    : h.priority_level === 'Trung bình'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-800';
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
                        {h.priority_level}
                      </span>
                    </TableTd>
                    <TableTd>{fmt(h.priority_score, 1)}</TableTd>
                    <TableTd className="text-xs text-zinc-400">
                      {h.latest_report_at ? new Date(h.latest_report_at).toLocaleString('vi-VN') : '—'}
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

function MetricCard({ label, baseline, fused, improvement }) {
  const improved = improvement != null && improvement > 0;
  return (
    <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-zinc-500">Baseline</p>
          <p className="text-zinc-100 font-medium">{fmt(baseline)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Fused</p>
          <p className="text-zinc-100 font-medium">{fmt(fused)}</p>
        </div>
      </div>
      <p className={`mt-3 text-xs font-medium ${improved ? 'text-emerald-400' : 'text-amber-300'}`}>
        {improvement == null ? 'Không áp dụng cải thiện %' : `Cải thiện: ${fmt(improvement)}%`}
      </p>
    </div>
  );
}
