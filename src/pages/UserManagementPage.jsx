import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FaXmark } from 'react-icons/fa6';
import { getUsers, assignRole, setUserActive, recomputeUserReliability, createUser } from '../services/api';
import { getCurrentUser, isAdmin } from '../utils/auth';
import { getReporterReliabilityTier } from '../utils/reliabilityHelpers';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Modal } from '../components/ui/Modal';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';

const ROLE_LABELS = { user: 'Người dùng', moderator: 'Điều hành viên', admin: 'Quản trị viên' };

const initialCreateForm = {
  username: '',
  email: '',
  password: '',
  role: 'moderator',
  full_name: '',
  phone: '',
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('user');
  const [recomputingId, setRecomputingId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [banDialog, setBanDialog] = useState(null);
  const [banReason, setBanReason] = useState('');
  const currentUser = getCurrentUser();
  const canCreateUser = isAdmin();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers(200, 0);
      if (res.success && Array.isArray(res.data)) setUsers(res.data);
      else setUsers([]);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAssignRole = async () => {
    if (!roleModal || !newRole) return;
    setMessage({ type: '', text: '' });
    try {
      const res = await assignRole(roleModal.id, newRole);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Cập nhật role thành công' });
        setRoleModal(null);
        loadUsers();
      } else {
        setMessage({ type: 'error', text: res.error || 'Cập nhật thất bại' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi kết nối',
      });
    }
  };

  const handleToggleActive = async (u) => {
    setMessage({ type: '', text: '' });
    try {
      const res = await setUserActive(u.id, !u.is_active);
      if (res.success) {
        setMessage({
          type: 'success',
          text: res.message || (u.is_active ? 'Đã vô hiệu hóa' : 'Đã kích hoạt'),
        });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: res.error || res.message || 'Thao tác thất bại' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi kết nối',
      });
    }
  };

  const handleBanConfirm = async () => {
    if (!banDialog) return;
    console.log('[UserManagement] Ban user', banDialog.id, banReason);
    await handleToggleActive(banDialog);
    setBanDialog(null);
    setBanReason('');
  };

  const handleForcePasswordReset = (userId) => {
    console.log('[UserManagement] Force Password Reset', userId);
    setMessage({ type: '', text: 'Tính năng đặt lại mật khẩu bắt buộc sẽ nối API khi BE hỗ trợ.' });
  };

  const handleRecomputeReliability = async (userId) => {
    setMessage({ type: '', text: '' });
    setRecomputingId(userId);
    try {
      const res = await recomputeUserReliability(userId);
      setRecomputingId(null);
      if (res?.success) {
        setMessage({ type: 'success', text: res.message || 'Đã tính lại điểm tin cậy' });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: res?.error || 'Tính lại thất bại' });
      }
    } catch (err) {
      setRecomputingId(null);
      setMessage({ type: 'error', text: err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi kết nối' });
    }
  };

  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
    setCreateForm(initialCreateForm);
    setCreateError('');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    const { username, email, password, role } = createForm;
    if (!username?.trim() || !email?.trim() || !password || !role) {
      setCreateError('Vui lòng điền đủ: Tên đăng nhập, Email, Mật khẩu, Vai trò.');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await createUser({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        full_name: createForm.full_name?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
      });
      if (res?.success) {
        setMessage({ type: 'success', text: res.message || 'Tạo tài khoản thành công' });
        setCreateModalOpen(false);
        setCreateForm(initialCreateForm);
        loadUsers();
      } else {
        setCreateError(res?.error || res?.message || 'Tạo tài khoản thất bại');
      }
    } catch (err) {
      setCreateError(err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi kết nối');
    }
    setCreateLoading(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Quản lý người dùng</h1>
        {canCreateUser && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Tạo tài khoản
          </button>
        )}
      </div>
      {message.text && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            message.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-red-500/20 text-red-200 border border-red-500/40'
          }`}
        >
          {message.text}
        </div>
      )}
      {loading ? (
        <p className="text-zinc-400">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dashboard-border bg-dashboard-surface text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Họ tên</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Độ tin cậy</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-dashboard-border last:border-0 hover:bg-white/5">
                  <td className="px-4 py-2 text-zinc-300">{u.id}</td>
                  <td className="px-4 py-2 font-medium text-zinc-200">{u.username}</td>
                  <td className="px-4 py-2 text-zinc-400">{u.email || '—'}</td>
                  <td className="px-4 py-2 text-zinc-300">{u.full_name || '—'}</td>
                  <td className="px-4 py-2 text-zinc-300">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-2">
                    {(() => {
                      const score = u.reporter_reliability != null ? Number(u.reporter_reliability) : null;
                      const tier = score != null ? getReporterReliabilityTier(score) : null;
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          {tier ? (
                            <span
                              className="rounded px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: tier.bgLight, color: tier.color }}
                              title={`Điểm: ${score}/100`}
                            >
                              {tier.tier} ({score})
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-xs">—</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRecomputeReliability(u.id)}
                            disabled={recomputingId === u.id}
                            className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                            title="Tính lại điểm từ lịch sử"
                          >
                            {recomputingId === u.id ? 'Đang tính...' : 'Tính lại'}
                          </button>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={u.is_active ? 'success' : 'destructive'}>
                      {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => { setRoleModal(u); setNewRole(u.role); }} className="mr-2 text-blue-600 hover:underline text-sm">
                      Đổi vai trò
                    </button>
                    {u.id !== currentUser?.id && u.is_active && (
                      <button type="button" onClick={() => setBanDialog(u)} className="mr-2 text-red-600 hover:underline text-sm font-medium">
                        Khóa tài khoản
                      </button>
                    )}
                    {u.id !== currentUser?.id && !u.is_active && (
                      <button type="button" onClick={() => handleToggleActive(u)} className="mr-2 text-amber-600 hover:underline text-sm">
                        Mở khóa
                      </button>
                    )}
                    <button type="button" onClick={() => handleForcePasswordReset(u.id)} className="text-zinc-400 hover:underline text-sm">
                      Đặt lại mật khẩu bắt buộc
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roleModal && (
        <Modal
          open={!!roleModal}
          onClose={() => setRoleModal(null)}
          title="Đổi vai trò"
          description={roleModal ? `Tài khoản: ${roleModal.username}` : ''}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAssignRole}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Lưu
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="mb-1 block text-sm font-medium text-zinc-300">Vai trò</label>
            <Menu>
              <MenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {ROLE_LABELS[newRole]}
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                }
              />
              <MenuPanel align="start" sideOffset={4}>
                {['user', 'moderator', 'admin'].map((r) => (
                  <MenuItem key={r} onSelect={() => setNewRole(r)}>
                    {ROLE_LABELS[r]}
                  </MenuItem>
                ))}
              </MenuPanel>
            </Menu>
          </div>
        </Modal>
      )}

      {createError && (
        <div className="fixed top-4 right-4 z-30 flex max-w-sm items-start gap-2 rounded-lg border border-red-300 bg-red-500 px-4 py-3 shadow-lg">
          <p className="flex-1 text-sm font-medium text-black">{createError}</p>
          <button
            type="button"
            onClick={() => setCreateError('')}
            className="shrink-0 rounded p-0.5 text-black/80 hover:bg-red-600 hover:text-black"
            aria-label="Đóng"
          >
            <FaXmark className="h-4 w-4" />
          </button>
        </div>
      )}

      <Dialog
        open={!!banDialog}
        onClose={() => { setBanDialog(null); setBanReason(''); }}
        onConfirm={handleBanConfirm}
        title="Xác nhận khóa tài khoản"
        description={
          banDialog ? (
            <div className="space-y-2">
              <p>Bạn sẽ khóa tài khoản: <strong>{banDialog.username}</strong>. Nhập lý do (tùy chọn):</p>
              <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" rows={2} placeholder="Lý do ban..." />
            </div>
          ) : null
        }
        confirmLabel="Khóa tài khoản"
        variant="destructive"
      />

      {createModalOpen && (
        <Modal
          open={createModalOpen}
          onClose={() => { setCreateModalOpen(false); setCreateError(''); }}
          title="Tạo tài khoản mới"
          description="Nhập thông tin user mới cho hệ thống. Các trường * là bắt buộc."
          footer={
            <>
              <button
                type="button"
                onClick={() => { setCreateModalOpen(false); setCreateError(''); }}
                className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={createLoading}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {createLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </>
          }
        >
          <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Tên đăng nhập *</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => { setCreateForm((f) => ({ ...f, username: e.target.value })); setCreateError(''); }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 placeholder-zinc-500"
                  placeholder="vd: mod01"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => { setCreateForm((f) => ({ ...f, email: e.target.value })); setCreateError(''); }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 placeholder-zinc-500"
                  placeholder="vd: mod01@hcmflood.vn"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Mật khẩu *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => { setCreateForm((f) => ({ ...f, password: e.target.value })); setCreateError(''); }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 placeholder-zinc-500"
                  placeholder="Mật khẩu"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Vai trò *</label>
                <Menu>
                  <MenuTrigger
                    render={
                      <button type="button" className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                        {ROLE_LABELS[createForm.role]}
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </button>
                    }
                  />
                  <MenuPanel className="min-w-[10rem]" align="start" sideOffset={4}>
                    {['user', 'moderator', 'admin'].map((r) => (
                      <MenuItem key={r} onSelect={() => setCreateForm((f) => ({ ...f, role: r }))}>
                        {ROLE_LABELS[r]}
                      </MenuItem>
                    ))}
                  </MenuPanel>
                </Menu>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Họ tên</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 placeholder-zinc-500"
                  placeholder="Họ tên"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Số điện thoại</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 placeholder-zinc-500"
                  placeholder="vd: 0901234567"
                />
              </div>
              {createError && <p className="text-sm text-red-300">{createError}</p>}
            </form>
          </Modal>
      )}
    </div>
  );
}
