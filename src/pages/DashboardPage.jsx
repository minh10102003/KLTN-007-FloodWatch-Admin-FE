import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  FaUsers,
  FaMagnifyingGlass,
  FaCircle,
  FaDroplet,
  FaLocationDot,
  FaSignal,
  FaStar,
} from 'react-icons/fa6';
import { getCurrentUser, isAdmin } from '../utils/auth';
import { fetchSensors, fetchSensorReadings } from '../services/api';

/** BE trả về: normal | warning | danger | offline */
const statusConfig = {
  normal: {
    label: 'Hoạt động',
    color: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: 'Cảnh báo',
    color: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  danger: {
    label: 'Nguy hiểm',
    color: 'text-red-600',
    dot: 'bg-red-500',
  },
  offline: {
    label: 'Mất kết nối',
    color: 'text-slate-500',
    dot: 'bg-slate-400',
  },
};

/** Chuẩn hóa dữ liệu từ BE GET /api/v1/flood-data/realtime */
function normalizeSensor(item) {
  return {
    id: item.sensor_id,
    name: item.sensor_id,
    location: item.location_name || item.sensor_id,
    status: item.status || 'offline',
    last_value_cm: item.water_level != null ? Number(item.water_level) : null,
    last_seen: item.last_data_time || item.created_at || null,
  };
}

function useSensors() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchSensors();
    if (res.success && Array.isArray(res.data)) {
      setSensors(res.data.map(normalizeSensor));
    } else {
      setSensors([]);
      if (res.error) setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return { sensors, loading, error, refresh: load };
}

export default function DashboardPage() {
  const user = getCurrentUser();
  const { sensors, loading, error, refresh } = useSensors();
  const [chartSensorId, setChartSensorId] = useState(null);
  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(false);

  const stats = useMemo(() => {
    const total = sensors.length;
    const normal = sensors.filter((s) => s.status === 'normal').length;
    const warning = sensors.filter((s) => s.status === 'warning').length;
    const danger = sensors.filter((s) => s.status === 'danger').length;
    const offline = sensors.filter((s) => s.status === 'offline').length;
    return { total, normal, warning, danger, offline };
  }, [sensors]);

  const chartData = useMemo(() => {
    return readings.map((r) => ({
      ...r,
      name: r.label,
      mực_nước: r.value,
    }));
  }, [readings]);

  useEffect(() => {
    const id = chartSensorId || sensors[0]?.id;
    if (!id) {
      setReadings([]);
      return;
    }
    let cancelled = false;
    setReadingsLoading(true);
    (async () => {
      const res = await fetchSensorReadings(id, 24);
      if (cancelled) return;
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setReadings(
          res.data.map((d) => ({
            time: d.created_at,
            value: d.water_level != null ? Number(d.water_level) : 0,
            label: d.created_at
              ? new Date(d.created_at).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
          }))
        );
      } else {
        setReadings([]);
      }
      setReadingsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [chartSensorId, sensors]);

  const currentSensor = sensors.find((s) => s.id === (chartSensorId || sensors[0]?.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Tổng quan</h1>
          <p className="text-slate-600">
            Xin chào, {user?.full_name || user?.username}. Theo dõi sensor và chọn chức năng bên trái.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:shadow disabled:opacity-50"
          >
            Làm mới
          </button>
          <Link
            to="/moderation"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-amber-300 hover:shadow"
          >
            <FaMagnifyingGlass className="text-amber-600" /> Kiểm duyệt
          </Link>
          <Link
            to="/reliability-ranking"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-amber-300 hover:shadow"
          >
            <FaStar className="text-amber-600" /> Xếp hạng tin cậy
          </Link>
          {isAdmin() && (
            <Link
              to="/users"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:shadow"
            >
              <FaUsers className="text-blue-600" /> Quản lý user
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Lỗi tải sensor: {error}
        </div>
      )}

      {/* Sensor summary cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Tình trạng sensor</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Tổng sensor</span>
                <FaSignal className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700">Hoạt động</span>
                <FaCircle className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.normal}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-700">Cảnh báo</span>
                <FaCircle className="h-3 w-3 text-amber-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-700">{stats.warning}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Nguy hiểm</span>
                <FaCircle className="h-3 w-3 text-red-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-red-700">{stats.danger}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Mất kết nối</span>
                <FaCircle className="h-3 w-3 text-slate-400" />
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-600">{stats.offline}</p>
            </div>
          </div>
        )}
      </section>

      {/* Chart: water level trend */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaDroplet className="h-5 w-5 text-sky-500" />
            <h2 className="text-lg font-semibold text-slate-800">Mực nước 24h (cm)</h2>
          </div>
          <select
            value={chartSensorId || (sensors[0]?.id ?? '')}
            onChange={(e) => setChartSensorId(e.target.value || null)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} – {s.location}
              </option>
            ))}
          </select>
        </div>
        {readingsLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                unit=" cm"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#334155' }}
                formatter={(value) => [`${value} cm`, 'Mực nước']}
                labelFormatter={(_, payload) =>
                  payload[0]?.payload?.time
                    ? new Date(payload[0].payload.time).toLocaleString('vi-VN')
                    : ''
                }
              />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="mực_nước"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#waterGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            {sensors.length === 0
              ? 'Chưa có sensor. Dữ liệu từ API /api/v1/flood-data/realtime.'
              : 'Chưa có lịch sử mực nước cho sensor này.'}
          </div>
        )}
        {currentSensor?.last_seen && (
          <p className="mt-2 text-xs text-slate-400">
            Cập nhật lần cuối:{' '}
            {new Date(currentSensor.last_seen).toLocaleString('vi-VN')}
          </p>
        )}
      </section>

      {/* Sensor list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Danh sách sensor</h2>
          <p className="text-sm text-slate-500">Trạng thái và giá trị mới nhất từ API</p>
        </div>
        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
        ) : sensors.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Chưa có sensor. Kiểm tra backend GET /api/v1/flood-data/realtime.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3 font-medium text-slate-600">Trạng thái</th>
                  <th className="px-5 py-3 font-medium text-slate-600">ID</th>
                  <th className="px-5 py-3 font-medium text-slate-600">Vị trí</th>
                  <th className="px-5 py-3 font-medium text-slate-600">Mực nước</th>
                  <th className="px-5 py-3 font-medium text-slate-600">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {sensors.map((s) => {
                  const sc = statusConfig[s.status] || statusConfig.offline;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.color} bg-slate-100`}
                        >
                          <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-5 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <FaLocationDot className="h-3.5 w-3.5 text-slate-400" />
                          {s.location}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {s.last_value_cm != null ? (
                          <span className="font-medium text-slate-800">{s.last_value_cm} cm</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {s.last_seen
                          ? new Date(s.last_seen).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
