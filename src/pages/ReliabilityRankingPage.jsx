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
        <h1 className="text-2xl font-semibold text-slate-800">Xếp hạng độ tin cậy người báo cáo</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FaArrowsRotate /> Làm mới
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">{error}</div>
      )}
      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <p className="font-medium">Chưa có dữ liệu xếp hạng</p>
          <p className="text-sm">Dữ liệu dựa trên avg_reliability, verified_count, approved_count từ backend.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
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
                  <tr key={row.reporter_id || index} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{index + 1}</td>
                    <td className="px-4 py-2">{row.reporter_name || `ID ${row.reporter_id}`}</td>
                    <td className="px-4 py-2">{score != null ? `${score.toFixed(1)}` : '—'}</td>
                    <td className="px-4 py-2">
                      {tier ? (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: tier.bgLight, color: tier.color }}
                        >
                          {tier.tier}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2">{row.total_reports ?? '—'}</td>
                    <td className="px-4 py-2">{row.verified_count ?? '—'}</td>
                    <td className="px-4 py-2">{row.approved_count ?? '—'}</td>
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
