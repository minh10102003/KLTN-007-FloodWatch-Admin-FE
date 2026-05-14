import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { getReportStats } from '../services/api';
import { FaChartColumn, FaArrowsRotate } from 'react-icons/fa6';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';
import { useToast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';

export default function ReportStatsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    const params = { groupBy };
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    const res = await getReportStats(params);
    setLoading(false);
    if (res.success && res.data?.series && Array.isArray(res.data.series)) {
      setSeries(res.data.series.map((s) => ({ period: s.period, count: s.count ?? 0 })));
    } else {
      setSeries([]);
      toast(res.error || t('common.errorGeneric'), 'error');
    }
  };

  useEffect(() => {
    load();
  }, [groupBy]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Thống kê báo cáo</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Menu>
            <MenuTrigger
              render={
                <button type="button" className="flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                  {groupBy === 'hour' ? 'Theo giờ' : 'Theo ngày'}
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>
              }
            />
            <MenuPanel className="min-w-[10rem]" align="end" sideOffset={4}>
              <MenuItem onSelect={() => setGroupBy('hour')}>Theo giờ</MenuItem>
              <MenuItem onSelect={() => setGroupBy('day')}>Theo ngày</MenuItem>
            </MenuPanel>
          </Menu>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
            placeholder="Từ"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
            placeholder="Đến"
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            <FaArrowsRotate /> Làm mới
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-zinc-400">Đang tải...</p>
      ) : series.length === 0 ? (
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-12 text-center text-zinc-400">
          <FaChartColumn className="mx-auto mb-2 h-10 w-10 text-zinc-500" />
          <p className="font-medium">Chưa có dữ liệu thống kê</p>
          <p className="text-sm">Thử đổi khoảng thời gian hoặc groupBy (giờ/ngày).</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#52525b" />
              <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
              <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #404040', backgroundColor: '#27272a', color: '#f4f4f5' }}
                formatter={(value) => [value, 'Số báo cáo']}
                labelFormatter={(label) => `Kỳ: ${label}`}
              />
              <Bar dataKey="count" fill="#8b5cf6" name="Số báo cáo" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
