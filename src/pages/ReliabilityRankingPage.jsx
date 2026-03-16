import React, { useEffect, useState } from 'react';
import { getReliabilityRanking } from '../services/api';
import { getReporterReliabilityTier } from '../utils/reliabilityHelpers';
import { FaStar, FaArrowsRotate } from 'react-icons/fa6';

export default function ReliabilityRankingPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await getReliabilityRanking(200);
    setLoading(false);
    if (res.success && Array.isArray(res.data)) setList(res.data);
    else {
      setList([]);
      setError(res.error || 'Không tải được dữ liệu');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Xếp hạng độ tin cậy người báo cáo</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        >
          <FaArrowsRotate /> Làm mới
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-2 text-sm text-red-200">{error}</div>
      )}
      {loading ? (
        <p className="text-zinc-400">Đang tải...</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-12 text-center text-zinc-400">
          <p className="font-medium">Chưa có dữ liệu xếp hạng</p>
          <p className="text-sm">Dữ liệu dựa trên avg_reliability, verified_count, approved_count từ backend.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dashboard-border bg-dashboard-surface text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Người báo cáo</th>
                <th className="px-4 py-3 font-medium">Độ tin cậy TB</th>
                <th className="px-4 py-3 font-medium">Hạng</th>
                <th className="px-4 py-3 font-medium">Tổng báo cáo</th>
                <th className="px-4 py-3 font-medium">Đã xác minh</th>
                <th className="px-4 py-3 font-medium">Đã duyệt</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, index) => {
                const score = row.avg_reliability != null ? Number(row.avg_reliability) : null;
                const tier = score != null ? getReporterReliabilityTier(score) : null;
                return (
                  <tr key={row.reporter_id || index} className="border-b border-dashboard-border last:border-0 hover:bg-white/5">
                    <td className="px-4 py-2 font-medium text-zinc-200">{index + 1}</td>
                    <td className="px-4 py-2 text-zinc-300">{row.reporter_name || `ID ${row.reporter_id}`}</td>
                    <td className="px-4 py-2 text-zinc-300">{score != null ? `${score.toFixed(1)}` : '—'}</td>
                    <td className="px-4 py-2">
                      {tier ? (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: tier.bgLight, color: tier.color }}
                        >
                          {tier.tier}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-300">{row.total_reports ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-300">{row.verified_count ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-300">{row.approved_count ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
