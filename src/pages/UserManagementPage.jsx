import React, { useEffect, useState } from 'react';
import { getUsers, assignRole, setUserActive, recomputeUserReliability, createUser } from '../services/api';
import { getCurrentUser, isAdmin } from '../utils/auth';
import { getReporterReliabilityTier } from '../utils/reliabilityHelpers';

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
        text: err.response?.data?.error || err.message || 'Lỗi kết nối',
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
        setMessage({ type: 'error', text: res.error || 'Thao tác thất bại' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Lỗi kết nối',
      });
    }
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
      setMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Lỗi kết nối' });
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
        setCreateError(res?.error || 'Tạo tài khoản thất bại');
      }
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message || 'Lỗi kết nối');
    }
    setCreateLoading(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Quản lý user</h1>
        {canCreateUser && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Tạo tài khoản
          </button>
        )}
      </div>
      {message.text && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
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
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{u.id}</td>
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email || '—'}</td>
                  <td className="px-4 py-2">{u.full_name || '—'}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[u.role] || u.role}</td>
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
                            <span className="text-slate-400 text-xs">—</span>
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
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        u.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {u.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRoleModal(u);
                        setNewRole(u.role);
                      }}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Đổi vai trò
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className="text-amber-600 hover:underline"
                      >
                        {u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roleModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-slate-800 mb-2">Đổi vai trò: {roleModal.username}</h3>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {['user', 'moderator', 'admin'].map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAssignRole}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-semibold text-slate-800">Tạo tài khoản mới</h3>
            {createError && (
              <div className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tên đăng nhập *</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="vd: mod01"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="vd: mod01@hcmflood.vn"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Mật khẩu"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vai trò *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {['user', 'moderator', 'admin'].map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Họ tên</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Họ tên"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số điện thoại</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="vd: 0901234567"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateModalOpen(false); setCreateError(''); }}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
