import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getReportStats } from '../services/api';
import { FaChartColumn, FaArrowsRotate } from 'react-icons/fa6';

export default function ReportStatsPage() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const params = { groupBy };
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    const res = await getReportStats(params);
    setLoading(false);
    if (res.success && res.data?.series && Array.isArray(res.data.series)) {
      setSeries(res.data.series.map((s) => ({ period: s.period, count: s.count ?? 0 })));
    } else {
      setSeries([]);
      setError(res.error || 'Không tải được dữ liệu');
    }
  };

  useEffect(() => {
    load();
  }, [groupBy]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Thống kê báo cáo</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="hour">Theo giờ</option>
            <option value="day">Theo ngày</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Từ"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Đến"
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FaArrowsRotate /> Làm mới
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">{error}</div>
      )}
      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : series.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <FaChartColumn className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="font-medium">Chưa có dữ liệu thống kê</p>
          <p className="text-sm">Thử đổi khoảng thời gian hoặc groupBy (giờ/ngày).</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value, 'Số báo cáo']}
                labelFormatter={(label) => `Kỳ: ${label}`}
              />
              <Bar dataKey="count" fill="#3b82f6" name="Số báo cáo" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
