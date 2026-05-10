import React, { useState } from 'react';
import { FaArrowsRotate } from 'react-icons/fa6';
import { getEmergencyAlertsSummary } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';

/** C1 (admin) — Thống kê log gửi cảnh báo khẩn thành công. */
export default function EmergencyAlertsSummaryPage() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await getEmergencyAlertsSummary(hours);
    setLoading(false);
    if (res.success) {
      setData(res.data);
    } else {
      setData(null);
      setError(res.error || 'Không tải được (cần quyền admin).');
    }
  };

  const byKind = data?.by_alert_kind || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Thống kê cảnh báo đa kênh</h1>
        <p className="mt-1 text-sm text-zinc-500">
          C1 — Số lần gửi thành công đã ghi log, nhóm theo loại cảnh báo. User app dùng luồng đăng ký / Telegram riêng; đây chỉ tổng hợp cho quản trị.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <label className="text-sm text-zinc-300">
          Cửa sổ (giờ, 1–168)
          <input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 block w-32 rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Tải thống kê'}
        </button>
        {data && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            <FaArrowsRotate /> Retry
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {data && (
        <>
          <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
            <p className="text-sm text-zinc-500">Tổng số bản ghi gửi thành công</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">{data.total ?? 0}</p>
            <p className="mt-2 text-xs text-zinc-500">Cửa sổ thực tế: {data.hours ?? hours} giờ</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
            <Table colWidths={[70, 30]}>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableTh>Loại cảnh báo (alert_kind)</TableTh>
                  <TableTh>Số lần gửi</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {byKind.length === 0 ? (
                  <TableRow>
                    <TableTd colSpan={2} className="text-center text-zinc-500">
                      Chưa có log trong khoảng thời gian đã chọn.
                    </TableTd>
                  </TableRow>
                ) : (
                  byKind.map((row) => (
                    <TableRow key={String(row.alert_kind)}>
                      <TableTd className="font-mono text-sm text-zinc-200">{row.alert_kind}</TableTd>
                      <TableTd className="text-zinc-100">{row.send_count}</TableTd>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
