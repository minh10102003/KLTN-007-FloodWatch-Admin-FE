import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/api';
import { FaClipboardList, FaArrowsRotate } from 'react-icons/fa6';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const params = { limit, offset: 0 };
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entity_type = entityFilter;
    const res = await getAuditLogs(params);
    setLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setLogs(res.data);
    } else {
      setLogs([]);
      setError(res.error || 'Không tải được nhật ký (chỉ Admin).');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Nhật ký hệ thống</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Lọc action"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="Lọc entity"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <FaClipboardList className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="font-medium">Chưa có bản ghi nhật ký</p>
          <p className="text-sm">Các thao tác xóa dữ liệu, đổi cấu hình sensor, đổi role, khóa user sẽ được ghi tại đây.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3">{log.user_id ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{log.action ?? '—'}</td>
                  <td className="px-4 py-3">{log.entity_type ?? '—'} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
