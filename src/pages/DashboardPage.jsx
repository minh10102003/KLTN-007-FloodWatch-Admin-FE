import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaMagnifyingGlass, FaDroplet, FaSignal, FaCircleExclamation, FaClipboardList, FaGaugeHigh } from 'react-icons/fa6';
import { ChevronDown } from 'lucide-react';
import { getCurrentUser, isModerator } from '../utils/auth';
import { fetchSensors, fetchSensorReadings, fetchPendingReports } from '../services/api';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';

const statusConfig = {
  normal: { label: 'Hoạt động', color: '#10b981', icon: FaGaugeHigh },
  warning: { label: 'Cảnh báo', color: '#f59e0b', icon: FaCircleExclamation },
  danger: { label: 'Nguy hiểm', color: '#ef4444', icon: FaCircleExclamation },
  offline: { label: 'Mất kết nối', color: '#94a3b8', icon: FaSignal },
};

function normalizeSensor(item) {
  const rawTemp = item.temperature ?? item.temp ?? item.dht?.temperature;
  const rawHum = item.humidity ?? item.humidity_pct ?? item.dht?.humidity;
  return {
    id: item.sensor_id,
    sensor_id: item.sensor_id,
    name: item.sensor_id,
    location: item.location_name || item.sensor_id,
    status: item.status || 'offline',
    last_value_cm: item.water_level != null ? Number(item.water_level) : null,
    last_seen: item.last_data_time || item.created_at || null,
    temperature: rawTemp != null && rawTemp !== '' ? Number(rawTemp) : null,
    humidity: rawHum != null && rawHum !== '' ? Number(rawHum) : null,
  };
}

export default function DashboardPage() {
  const user = getCurrentUser();
  const [sensors, setSensors] = useState([]);
  const [sensorsLoading, setSensorsLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState([]);
  const [chartSensorId, setChartSensorId] = useState(null);
  const [dateRange, setDateRange] = useState('today');
  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateRangeOptions = [
    { value: 'today', label: 'Hôm nay' },
    { value: '7d', label: '7 ngày' },
    { value: '30d', label: '30 ngày' },
  ];
  const dateRangeLabel = dateRangeOptions.find((o) => o.value === dateRange)?.label ?? 'Hôm nay';

  const loadSensors = React.useCallback(async () => {
    setSensorsLoading(true);
    const res = await fetchSensors();
    if (res.success && Array.isArray(res.data)) {
      setSensors(res.data.map(normalizeSensor));
    } else {
      setSensors([]);
    }
    setSensorsLoading(false);
  }, []);

  useEffect(() => {
    loadSensors();
    const t = setInterval(loadSensors, 30000);
    return () => clearInterval(t);
  }, [loadSensors]);

  const canFetchReports = isModerator();
  useEffect(() => {
    if (!canFetchReports) return;
    (async () => {
      try {
        const res = await fetchPendingReports(100);
        setPendingReports(res.success && Array.isArray(res.data) ? res.data : []);
      } catch {
        setPendingReports([]);
      }
    })();
  }, [canFetchReports]);

  const stats = useMemo(() => {
    const total = sensors.length;
    const normal = sensors.filter((s) => s.status === 'normal').length;
    const warning = sensors.filter((s) => s.status === 'warning').length;
    const danger = sensors.filter((s) => s.status === 'danger').length;
    const offline = sensors.filter((s) => s.status === 'offline').length;
    return { total, normal, warning, danger, offline, alertCount: warning + danger };
  }, [sensors]);

  const pendingCount = pendingReports.length;

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
            name: d.created_at
              ? new Date(d.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '',
            mực_nước: d.water_level != null ? Number(d.water_level) : 0,
          }))
        );
      } else setReadings([]);
      setReadingsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [chartSensorId, sensors]);

  const chartData = useMemo(() => readings.map((r) => ({ ...r, mực_nước: r.value ?? r.mực_nước })), [readings]);

  const statusBreakdown = useMemo(() => {
    const { total, normal, warning, danger, offline } = stats;
    if (total === 0) return [];
    return [
      { ...statusConfig.normal, count: normal, pct: ((normal / total) * 100).toFixed(1) },
      { ...statusConfig.warning, count: warning, pct: ((warning / total) * 100).toFixed(1) },
      { ...statusConfig.danger, count: danger, pct: ((danger / total) * 100).toFixed(1) },
      { ...statusConfig.offline, count: offline, pct: ((offline / total) * 100).toFixed(1) },
    ].filter((r) => r.count > 0);
  }, [stats]);

  const pieData = useMemo(
    () =>
      statusBreakdown.map((r) => ({ name: r.label, value: r.count, color: r.color, pct: r.pct })),
    [statusBreakdown]
  );

  const filteredSensors = useMemo(() => {
    if (!searchQuery.trim()) return sensors;
    const q = searchQuery.trim().toLowerCase();
    return sensors.filter(
      (s) =>
        (s.sensor_id && s.sensor_id.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q))
    );
  }, [sensors, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header: Overview + greeting, search + Today — Snow UI */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tổng quan</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Xin chào, {user?.full_name || user?.username}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-52 sm:w-60">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sensor, vị trí..."
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <Menu>
            <MenuTrigger
              render={
                <button type="button" className="flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                  {dateRangeLabel}
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>
              }
            />
            <MenuPanel className="min-w-[8rem]" align="end" sideOffset={4}>
              {dateRangeOptions.map((o) => (
                <MenuItem key={o.value} onSelect={() => setDateRange(o.value)}>
                  {o.label}
                </MenuItem>
              ))}
            </MenuPanel>
          </Menu>
        </div>
      </div>

      {/* KPI: 4 thẻ sáng #EBEBF0, flat, bo góc — Snow UI Kit */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200/60 bg-dashboard-metricCard p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <FaSignal className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng sensor</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-violet-500" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/60 bg-dashboard-metricCard p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <FaGaugeHigh className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Sensor hoạt động</p>
              <p className="text-2xl font-bold text-slate-800">{stats.normal}</p>
            </div>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: stats.total ? `${(stats.normal / stats.total) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/60 bg-dashboard-metricCard p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <FaCircleExclamation className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Cảnh báo / Nguy hiểm</p>
              <p className="text-2xl font-bold text-slate-800">{stats.alertCount}</p>
            </div>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: stats.total ? `${(stats.alertCount / stats.total) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/60 bg-dashboard-metricCard p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FaClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Báo cáo chờ duyệt</p>
              <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
            </div>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-500" style={{ width: pendingCount > 0 ? '100%' : '0%' }} />
          </div>
        </div>
      </div>

      {/* Hàng giữa: 1 chart chính + phân bố trạng thái (list) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card tối #2D2D2D, flat — Snow UI */}
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-100">Mực nước 24h</h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-violet-500" /> Mực nước
              </span>
              <Menu>
                <MenuTrigger
                  render={
                    <button type="button" className="flex min-w-0 max-w-[220px] items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                      <span className="truncate">
                        {(() => {
                          const id = chartSensorId || sensors[0]?.id;
                          const s = sensors.find((x) => x.id === id);
                          return s ? `${s.name} – ${s.location}` : 'Chọn sensor';
                        })()}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                    </button>
                  }
                />
                <MenuPanel className="max-h-[280px] min-w-[14rem] overflow-y-auto" align="end" sideOffset={4}>
                  {sensors.map((s) => (
                    <MenuItem key={s.id} onSelect={() => setChartSensorId(s.id)}>
                      {s.name} – {s.location}
                    </MenuItem>
                  ))}
                </MenuPanel>
              </Menu>
            </div>
          </div>
          {readingsLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-dashboard-surface" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#52525b" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#52525b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} domain={[0, 'auto']} unit=" cm" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #404040',
                    backgroundColor: '#27272a',
                    color: '#f4f4f5',
                    padding: '10px 14px',
                  }}
                  formatter={(value) => [value != null ? `${Number(value).toFixed(1)} cm` : '—', 'Mực nước']}
                  cursor={{ stroke: '#8b5cf6', strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="mực_nước" stroke="#8b5cf6" strokeWidth={2} fill="url(#waterFill)" name="Mực nước" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-dashboard-surface text-zinc-400 text-sm">
              {sensors.length === 0 ? 'Chưa có sensor.' : 'Chưa có dữ liệu mực nước.'}
            </div>
          )}
        </div>

        {/* Pie: card tối, flat */}
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Phân bố trạng thái</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="55%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #404040', backgroundColor: '#27272a', color: '#f4f4f5' }}
                    formatter={(value, name, props) => [`${value} sensor (${props?.payload?.pct ?? props?.pct ?? ''}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {pieData.map((r) => (
                  <span key={r.name} className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.pct}% {r.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400">Chưa có dữ liệu sensor.</p>
          )}
        </div>
      </div>

      {/* Danh sách sensor — card tối, flat */}
      <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Danh sách sensor</h2>
        {sensorsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-dashboard-surface" />
            ))}
          </div>
        ) : filteredSensors.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            {searchQuery.trim() ? 'Không có sensor khớp tìm kiếm.' : 'Chưa có sensor.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dashboard-border text-left text-zinc-400">
                  <th className="pb-3 font-medium">Trạng thái</th>
                  <th className="pb-3 font-medium">Mã sensor</th>
                  <th className="pb-3 font-medium">Vị trí</th>
                  <th className="pb-3 font-medium text-right">Mực nước</th>
                </tr>
              </thead>
              <tbody>
                {filteredSensors.map((s) => {
                  const sc = statusConfig[s.status] || statusConfig.offline;
                  return (
                    <tr key={s.id} className="border-b border-dashboard-border hover:bg-white/5">
                      <td className="py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ color: sc.color, backgroundColor: `${sc.color}25` }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-zinc-200">{s.sensor_id}</td>
                      <td className="py-3 text-zinc-400">{s.location}</td>
                      <td className="py-3 text-right font-medium text-zinc-200">
                        {s.last_value_cm != null ? `${s.last_value_cm} cm` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
