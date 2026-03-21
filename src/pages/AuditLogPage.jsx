import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/api';
import { FaClipboardList, FaArrowsRotate } from 'react-icons/fa6';

const ACTION_LABELS = {
  user_active_changed: 'Thay đổi trạng thái tài khoản',
  user_role_changed: 'Thay đổi vai trò người dùng',
  user_created: 'Tạo tài khoản người dùng',
  user_password_reset_forced: 'Bắt buộc đặt lại mật khẩu',
  sensor_calibrated: 'Hiệu chuẩn sensor',
  sensor_created: 'Thêm sensor',
  sensor_updated: 'Cập nhật cấu hình sensor',
  sensor_deleted: 'Xóa sensor',
  report_approved: 'Duyệt báo cáo',
  report_rejected: 'Từ chối báo cáo',
};

const ENTITY_LABELS = {
  user: 'Người dùng',
  sensor: 'Sensor',
  report: 'Báo cáo',
};

function getActionLabel(action) {
  if (!action) return '—';
  return ACTION_LABELS[action] || action.replaceAll('_', ' ');
}

function getEntityLabel(entityType, entityId) {
  if (!entityType && !entityId) return '—';
  const label = ENTITY_LABELS[entityType] || entityType || 'Đối tượng';
  return entityId ? `${label} #${entityId}` : label;
}

function formatDetails(details) {
  if (details == null || details === '') return '—';

  const raw = typeof details === 'string' ? details : JSON.stringify(details);
  if (!raw) return '—';

  const normalized = raw.replaceAll('"', '');

  if (normalized.includes('is_active=true')) return 'Trạng thái tài khoản: Hoạt động';
  if (normalized.includes('is_active=false')) return 'Trạng thái tài khoản: Đã khóa';

  const roleMatch = normalized.match(/role=([a-z_]+)/i);
  if (roleMatch?.[1]) {
    const roleValue = roleMatch[1].toLowerCase();
    const roleLabel =
      roleValue === 'admin'
        ? 'Quản trị viên'
        : roleValue === 'moderator'
          ? 'Điều hành viên'
          : roleValue === 'user'
            ? 'Người dùng'
            : roleValue;
    return `Vai trò mới: ${roleLabel}`;
  }

  return normalized
    .replaceAll('location_name=', 'Vị trí: ')
    .replaceAll('sensor_id=', 'Mã sensor: ')
    .replaceAll('warning_threshold=', 'Ngưỡng cảnh báo: ')
    .replaceAll('danger_threshold=', 'Ngưỡng nguy hiểm: ')
    .replaceAll(',', ' | ');
}

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
        <h1 className="text-2xl font-semibold text-zinc-100">Nhật ký hệ thống</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Lọc thao tác"
            className="w-32 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <input
            type="text"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="Lọc đối tượng"
            className="w-32 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
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
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-2 text-sm text-red-200">{error}</div>
      )}
      {loading ? (
        <p className="text-zinc-400">Đang tải...</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-12 text-center text-zinc-400">
          <FaClipboardList className="mx-auto mb-2 h-10 w-10 text-zinc-500" />
          <p className="font-medium">Chưa có bản ghi nhật ký</p>
          <p className="text-sm">Các thao tác xóa dữ liệu, đổi cấu hình sensor, đổi role, khóa user sẽ được ghi tại đây.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dashboard-border bg-dashboard-surface text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
                <th className="px-4 py-3 font-medium">Đối tượng</th>
                <th className="px-4 py-3 font-medium">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashboard-border">
              {logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-zinc-400">
                    {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{log.user_id ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{getActionLabel(log.action)}</td>
                  <td className="px-4 py-3 text-zinc-300">{getEntityLabel(log.entity_type, log.entity_id)}</td>
                  <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">
                    {formatDetails(log.details)}
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
