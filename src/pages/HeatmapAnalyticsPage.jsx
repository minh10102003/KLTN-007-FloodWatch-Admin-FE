import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FaArrowsRotate } from 'react-icons/fa6';
import { getHeatmap, getHeatmapCombined, getHeatmapTimeline24h } from '../services/api';
import { useToast } from '../components/ui/Toast';

const BBOX_KEYS = ['minLng', 'minLat', 'maxLng', 'maxLat'];

const defaultBbox = {
  minLng: '106.60',
  minLat: '10.70',
  maxLng: '106.95',
  maxLat: '10.95',
};

export default function HeatmapAnalyticsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [bbox, setBbox] = useState(defaultBbox);
  const [gridSize, setGridSize] = useState(500);
  const [heatmap, setHeatmap] = useState([]);
  const [combined, setCombined] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  const chartLocale = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN';

  const bboxParams = useMemo(() => {
    const minLng = parseFloat(bbox.minLng);
    const minLat = parseFloat(bbox.minLat);
    const maxLng = parseFloat(bbox.maxLng);
    const maxLat = parseFloat(bbox.maxLat);
    if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return null;
    if (minLng >= maxLng || minLat >= maxLat) return null;
    return { minLng, minLat, maxLng, maxLat, gridSize: Number(gridSize) || 500 };
  }, [bbox, gridSize]);

  const chartData = useMemo(
    () =>
      (timeline || []).map((row) => ({
        hour:
          row.bucket != null
            ? new Date(row.bucket).toLocaleString(chartLocale, {
                weekday: 'short',
                hour: '2-digit',
                day: '2-digit',
                month: '2-digit',
              })
            : '',
        total: row.total_points ?? 0,
        sensorPts: row.sensor_points ?? 0,
        crowdPts: row.crowd_points ?? 0,
        sensorAvg: row.sensor_avg_water_level != null ? Number(row.sensor_avg_water_level) : null,
        crowdAvg: row.crowd_avg_water_level != null ? Number(row.crowd_avg_water_level) : null,
      })),
    [timeline, chartLocale, i18n.language]
  );

  const load = async () => {
    setLoading(true);
    const p = bboxParams;
    const bb = p ? { minLng: p.minLng, minLat: p.minLat, maxLng: p.maxLng, maxLat: p.maxLat } : {};
    const heatParams = p ? { ...bb, gridSize: p.gridSize } : {};
    const [h1, h2, h3] = await Promise.all([
      getHeatmap(heatParams),
      getHeatmapCombined(bb),
      getHeatmapTimeline24h(bb),
    ]);
    setLoading(false);
    const errs = [];
    if (!h1.success) errs.push('h1');
    if (!h2.success) errs.push('h2');
    if (!h3.success) errs.push('h3');
    if (errs.length) toast(i18n.t('common.errorGeneric'), 'error');
    setHeatmap(h1.data || []);
    setCombined(h2.data || []);
    setTimeline(h3.data || []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t('heatmap.title')}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t('heatmap.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4 md:grid-cols-5">
        {BBOX_KEYS.map((k) => (
          <label key={k} className="text-xs text-zinc-400">
            <span className="block text-zinc-300">{t(`heatmap.${k}`)}</span>
            <input
              type="text"
              value={bbox[k]}
              onChange={(e) => setBbox((b) => ({ ...b, [k]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
        ))}
        <label className="text-xs text-zinc-400">
          <span className="block text-zinc-300">{t('heatmap.gridSize')}</span>
          <input
            type="number"
            value={gridSize}
            onChange={(e) => setGridSize(e.target.value)}
            className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('common.loadData')}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
        >
          <FaArrowsRotate /> {t('common.retry')}
        </button>
      </div>
      {!bboxParams && <p className="text-sm text-amber-300/90">{t('heatmap.bboxInvalid')}</p>}

      <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <h2 className="text-lg font-medium text-zinc-100">{t('heatmap.timelineTitle')}</h2>
        <p className="mb-4 text-xs text-zinc-500">{t('heatmap.timelineHint')}</p>
        {chartData.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('heatmap.timelineEmpty')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#a1a1aa' }} interval={2} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #404040', backgroundColor: '#27272a', color: '#f4f4f5' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="sensorPts" name={t('heatmap.chartSensorPts')} fill="#8b5cf6" stackId="a" />
              <Bar yAxisId="left" dataKey="crowdPts" name={t('heatmap.chartCrowdPts')} fill="#22c55e" stackId="a" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sensorAvg"
                name={t('heatmap.chartSensorAvg')}
                stroke="#fbbf24"
                dot={false}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
          <h3 className="text-sm font-medium text-zinc-200">{t('heatmap.heatmapSensorOnly')}</h3>
          <p className="mt-1 text-xs text-zinc-500">{t('common.cellCount', { count: heatmap.length })}</p>
        </section>
        <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
          <h3 className="text-sm font-medium text-zinc-200">{t('heatmap.heatmapCombined')}</h3>
          <p className="mt-1 text-xs text-zinc-500">{t('common.pointCount', { count: combined.length })}</p>
        </section>
      </div>
    </div>
  );
}
