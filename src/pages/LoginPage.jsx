import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, logout } from '../services/api';
import { canAccessAdminApp } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (canAccessAdminApp()) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      if (result.user?.role === 'user') {
        setError('Bạn không có quyền truy cập trang quản trị. Chỉ Admin và Điều hành viên mới được vào.');
        await logout();
        return;
      }
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white mb-2">FLOODSIGHT Admin</h1>
        <p className="text-slate-400 text-sm mb-6">Đăng nhập với tài khoản Admin hoặc Điều hành viên</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
