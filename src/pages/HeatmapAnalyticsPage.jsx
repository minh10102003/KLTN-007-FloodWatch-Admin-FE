import React, { useMemo, useState } from 'react';
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

const defaultBbox = {
  minLng: '106.60',
  minLat: '10.70',
  maxLng: '106.95',
  maxLat: '10.95',
};

/** C2 — Heatmap + timeline 24h (API public; dùng trong admin để báo cáo / demo). */
export default function HeatmapAnalyticsPage() {
  const [bbox, setBbox] = useState(defaultBbox);
  const [gridSize, setGridSize] = useState(500);
  const [heatmap, setHeatmap] = useState([]);
  const [combined, setCombined] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            ? new Date(row.bucket).toLocaleString('vi-VN', {
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
    [timeline]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    const p = bboxParams;
    const bb = p
      ? { minLng: p.minLng, minLat: p.minLat, maxLng: p.maxLng, maxLat: p.maxLat }
      : {};
    const heatParams = p ? { ...bb, gridSize: p.gridSize } : {};
    const [h1, h2, h3] = await Promise.all([
      getHeatmap(heatParams),
      getHeatmapCombined(bb),
      getHeatmapTimeline24h(bb),
    ]);
    setLoading(false);
    const errs = [];
    if (!h1.success) errs.push(h1.error || 'Heatmap sensors');
    if (!h2.success) errs.push(h2.error || 'Heatmap combined');
    if (!h3.success) errs.push(h3.error || 'Timeline 24h');
    setError(errs.join(' · '));
    setHeatmap(h1.data || []);
    setCombined(h2.data || []);
    setTimeline(h3.data || []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Heatmap & timeline 24h</h1>
        <p className="mt-1 text-sm text-zinc-500">
          C2 — Dữ liệu tổng hợp không gian + chuỗi theo giờ. Endpoint public; phù hợp dashboard nội bộ (khác với cấu hình cảnh báo user C1).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4 md:grid-cols-5">
        {['minLng', 'minLat', 'maxLng', 'maxLat'].map((k) => (
          <label key={k} className="text-xs text-zinc-400">
            {k}
            <input
              type="text"
              value={bbox[k]}
              onChange={(e) => setBBox((b) => ({ ...b, [k]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
        ))}
        <label className="text-xs text-zinc-400">
          gridSize (m)
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
          {loading ? 'Đang tải...' : 'Tải dữ liệu'}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
        >
          <FaArrowsRotate /> Retry
        </button>
      </div>
      {!bboxParams && (
        <p className="text-sm text-amber-300/90">
          Bbox không hợp lệ — vẫn có thể tải toàn khu (không lọc). Nhập đủ 4 số và min nhỏ hơn max để giới hạn vùng.
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <h2 className="text-lg font-medium text-zinc-100">Timeline 24h</h2>
        <p className="text-xs text-zinc-500 mb-4">Điểm theo giờ: sensor + crowd (đã duyệt).</p>
        {chartData.length === 0 ? (
          <p className="text-sm text-zinc-500">Chưa có dữ liệu — bấm Tải dữ liệu.</p>
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
              <Bar yAxisId="left" dataKey="sensorPts" name="Điểm sensor" fill="#8b5cf6" stackId="a" />
              <Bar yAxisId="left" dataKey="crowdPts" name="Điểm crowd" fill="#22c55e" stackId="a" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sensorAvg"
                name="TB mực sensor (cm)"
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
          <h3 className="text-sm font-medium text-zinc-200">Heatmap — chỉ sensor</h3>
          <p className="mt-1 text-xs text-zinc-500">Số ô: {heatmap.length}</p>
        </section>
        <section className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
          <h3 className="text-sm font-medium text-zinc-200">Heatmap — combined</h3>
          <p className="mt-1 text-xs text-zinc-500">Số điểm: {combined.length}</p>
        </section>
      </div>
    </div>
  );
}
