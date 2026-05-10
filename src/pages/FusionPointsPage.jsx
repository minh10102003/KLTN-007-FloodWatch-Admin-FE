import React, { useState } from 'react';
import { FaArrowsRotate } from 'react-icons/fa6';
import { getFusionPoints } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';

const defaultBbox = {
  min_lng: '106.60',
  max_lng: '106.95',
  min_lat: '10.70',
  max_lat: '10.95',
};

/** A1 — Điểm fusion (crowd + sensor). Admin/Mod xem nội bộ; user app có thể dùng cùng API trên bản đồ. */
export default function FusionPointsPage() {
  const [bbox, setBbox] = useState(defaultBbox);
  const [crowdHours, setCrowdHours] = useState(72);
  const [sensorHours, setSensorHours] = useState(6);
  const [includeSensors, setIncludeSensors] = useState(true);
  const [sensors, setSensors] = useState([]);
  const [crowd, setCrowd] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await getFusionPoints({
      crowd_hours: crowdHours,
      sensor_hours: sensorHours,
      include_sensors: includeSensors,
      min_lng: bbox.min_lng,
      max_lng: bbox.max_lng,
      min_lat: bbox.min_lat,
      max_lat: bbox.max_lat,
    });
    setLoading(false);
    if (res.success && res.data) {
      setSensors(res.data.sensors || []);
      setCrowd(res.data.crowd || []);
      setMeta(res.meta || null);
    } else {
      setSensors([]);
      setCrowd([]);
      setMeta(null);
      setError(res.error || 'Không tải được (kiểm tra bbox và quyền).');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Fusion điểm (A1)</h1>
        <p className="mt-1 text-sm text-zinc-500">
          So sánh crowd_only vs fused theo vùng bbox. Tham số fusion server đọc từ env (FUSION_*), không chỉnh trên FE.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4 md:grid-cols-6">
        <label className="text-xs text-zinc-400 md:col-span-1">
          crowd_hours
          <input
            type="number"
            value={crowdHours}
            onChange={(e) => setCrowdHours(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-400 md:col-span-1">
          sensor_hours
          <input
            type="number"
            value={sensorHours}
            onChange={(e) => setSensorHours(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        {['min_lng', 'max_lng', 'min_lat', 'max_lat'].map((k) => (
          <label key={k} className="text-xs text-zinc-400">
            {k}
            <input
              value={bbox[k]}
              onChange={(e) => setBbox((b) => ({ ...b, [k]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
        ))}
        <label className="flex items-end gap-2 text-sm text-zinc-300 md:col-span-2">
          <input type="checkbox" checked={includeSensors} onChange={(e) => setIncludeSensors(e.target.checked)} />
          Gồm lớp sensor
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Tải fusion'}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
        >
          <FaArrowsRotate /> Retry
        </button>
      </div>

      {meta?.fusion_params && (
        <p className="text-xs text-zinc-500">
          Fusion params (server): rMaxM={meta.fusion_params.rMaxM}, decayDistM={meta.fusion_params.decayDistM},
          disagreeScaleCm={meta.fusion_params.disagreeScaleCm}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <section className="rounded-xl border border-dashboard-border bg-dashboard-card overflow-hidden">
        <div className="border-b border-dashboard-border bg-dashboard-surface px-4 py-3">
          <h2 className="text-lg font-medium text-zinc-100">Crowd (đã duyệt trong cửa sổ)</h2>
          <p className="text-xs text-zinc-500">{crowd.length} điểm</p>
        </div>
        <Table colWidths={[8, 12, 12, 12, 14, 14, 18, 10]}>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableTh>#</TableTh>
              <TableTh>report</TableTh>
              <TableTh>coverage</TableTh>
              <TableTh>crowd cm</TableTh>
              <TableTh>fused cm</TableTh>
              <TableTh>sensor gần</TableTh>
              <TableTh>Trọng số (s/c)</TableTh>
              <TableTh>Thời gian</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {crowd.map((c, i) => (
              <TableRow key={c.report_id ?? i}>
                <TableTd>{i + 1}</TableTd>
                <TableTd className="font-mono text-xs">#{c.report_id}</TableTd>
                <TableTd className="text-xs">{c.coverage}</TableTd>
                <TableTd>{c.crowd_only_cm}</TableTd>
                <TableTd>{c.fused_cm}</TableTd>
                <TableTd className="text-xs text-zinc-400">
                  {c.nearest_sensor
                    ? `${c.nearest_sensor.sensor_id} · ${c.nearest_sensor.water_level_cm}cm · ${c.nearest_sensor.distance_m}m`
                    : '—'}
                </TableTd>
                <TableTd className="text-xs">
                  {c.weights ? `${c.weights.sensor} / ${c.weights.crowd}` : '—'}
                </TableTd>
                <TableTd className="text-xs text-zinc-500">
                  {c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : '—'}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {crowd.length === 0 && !loading && (
          <p className="p-4 text-center text-sm text-zinc-500">Chưa có dữ liệu — bấm Tải fusion.</p>
        )}
      </section>

      {includeSensors && (
        <section className="rounded-xl border border-dashboard-border bg-dashboard-card overflow-hidden">
          <div className="border-b border-dashboard-border bg-dashboard-surface px-4 py-3">
            <h2 className="text-lg font-medium text-zinc-100">Sensor (log gần nhất)</h2>
            <p className="text-xs text-zinc-500">{sensors.length} điểm</p>
          </div>
          <Table colWidths={[8, 22, 16, 16, 38]}>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableTh>#</TableTh>
                <TableTh>sensor_id</TableTh>
                <TableTh>mực (cm)</TableTh>
                <TableTh>status</TableTh>
                <TableTh>Thời gian log</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {sensors.map((s, i) => (
                <TableRow key={s.sensor_id ?? i}>
                  <TableTd>{i + 1}</TableTd>
                  <TableTd className="font-mono text-sm">{s.sensor_id}</TableTd>
                  <TableTd>{s.water_level_sensor_only_cm ?? '—'}</TableTd>
                  <TableTd className="text-xs">{s.log_status || '—'}</TableTd>
                  <TableTd className="text-xs text-zinc-500">
                    {s.log_created_at ? new Date(s.log_created_at).toLocaleString('vi-VN') : '—'}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
