import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { MotionButton } from '../components/ui/MotionButton';
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
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg p-4">
      <div className="w-full max-w-sm rounded-xl border border-dashboard-border bg-dashboard-card p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">FLOODSIGHT Admin</h1>
        <p className="text-zinc-400 text-sm mb-6">Đăng nhập với tài khoản Admin hoặc Điều hành viên</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
              placeholder="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <MotionButton
            type="submit"
            disabled={loading}
            hoverScale={1.02}
            tapScale={0.98}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-white font-medium hover:bg-violet-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-dashboard-bg"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </MotionButton>
        </form>
      </div>

      {error && (
        <div className="fixed top-4 right-4 z-30 flex max-w-sm items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-3 shadow-lg">
          <p className="flex-1 text-sm font-medium text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            className="shrink-0 rounded p-0.5 text-red-300 hover:bg-red-500/30 hover:text-red-100"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
