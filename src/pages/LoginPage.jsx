import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { MotionButton } from '../components/ui/MotionButton';
import { login, logout, register, verifyOtp, resendOtp } from '../services/api';
import { canAccessAdminApp } from '../utils/auth';

/** Đăng nhập | đăng ký | xác minh OTP — khớp BE: register không token; login 403 nếu chưa verify email. */
export default function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // login | register | verify

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [verifyEmail, setVerifyEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (canAccessAdminApp()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (canAccessAdminApp()) {
    return null;
  }

  const clearMessages = () => {
    setError('');
    setInfo('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
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
      if (result.needsEmailVerification) {
        setVerifyEmail('');
        setOtpCode('');
        setView('verify');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setError('Vui lòng điền tên đăng nhập, email và mật khẩu.');
      return;
    }
    setLoading(true);
    const result = await register({
      username: regUsername.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      full_name: regFullName.trim() || undefined,
      phone: regPhone.trim() || undefined,
    });
    setLoading(false);
    if (result.success) {
      setVerifyEmail(regEmail.trim().toLowerCase());
      setOtpCode('');
      setInfo(result.message || 'Kiểm tra email và nhập mã OTP.');
      setView('verify');
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!verifyEmail.trim() || !otpCode.trim()) {
      setError('Nhập email và mã OTP.');
      return;
    }
    setLoading(true);
    const result = await verifyOtp({ email: verifyEmail, otp_code: otpCode });
    setLoading(false);
    if (result.success) {
      setUsername((u) => u || regUsername);
      setInfo(result.message || 'Đã xác minh. Vui lòng đăng nhập.');
      setOtpCode('');
      setView('login');
      setError('');
    } else {
      setError(result.error || 'Xác minh thất bại');
    }
  };

  const handleResendOtp = async () => {
    clearMessages();
    if (!verifyEmail.trim()) {
      setError('Nhập email đã đăng ký.');
      return;
    }
    setResendLoading(true);
    const result = await resendOtp(verifyEmail.trim().toLowerCase());
    setResendLoading(false);
    if (result.success) {
      setInfo(result.message || 'Đã gửi lại mã OTP.');
    } else {
      setError(result.error || 'Gửi lại thất bại');
    }
  };

  const goLogin = () => {
    clearMessages();
    setView('login');
  };

  const goRegister = () => {
    clearMessages();
    setView('register');
  };

  const goVerifyFromLogin = () => {
    clearMessages();
    setView('verify');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-bg p-4">
      <div className="w-full max-w-sm rounded-xl border border-dashboard-border bg-dashboard-card p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">FLOODSIGHT Admin</h1>

        {view === 'login' && (
          <>
            <p className="text-zinc-400 text-sm mb-6">Đăng nhập với tài khoản Admin hoặc Điều hành viên</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  placeholder="username"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            <p className="mt-4 text-center text-sm text-zinc-500">
              <button
                type="button"
                onClick={goRegister}
                className="text-violet-400 hover:text-violet-300 underline-offset-2 hover:underline"
              >
                Đăng ký tài khoản mới
              </button>
              {' · '}
              <button
                type="button"
                onClick={goVerifyFromLogin}
                className="text-zinc-400 hover:text-zinc-300 underline-offset-2 hover:underline"
              >
                Đã có tài khoản — xác minh OTP
              </button>
            </p>
          </>
        )}

        {view === 'register' && (
          <>
            <p className="text-zinc-400 text-sm mb-6">
              Đăng ký — sau khi gửi form bạn sẽ nhận mã OTP qua email; xác minh xong mới đăng nhập được.
            </p>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tên đăng nhập *</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mật khẩu *</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Họ tên</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => {
                    setRegFullName(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => {
                    setRegPhone(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <MotionButton
                type="submit"
                disabled={loading}
                hoverScale={1.02}
                tapScale={0.98}
                className="w-full rounded-xl bg-violet-600 py-2.5 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Đăng ký'}
              </MotionButton>
            </form>
            <button
              type="button"
              onClick={goLogin}
              className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-zinc-300"
            >
              ← Quay lại đăng nhập
            </button>
          </>
        )}

        {view === 'verify' && (
          <>
            <p className="text-zinc-400 text-sm mb-6">
              Nhập email đã đăng ký và mã OTP trong thư (email gửi lên API sẽ được chuyển chữ thường).
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={verifyEmail}
                  onChange={(e) => {
                    setVerifyEmail(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mã OTP</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    clearMessages();
                  }}
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2.5 text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  placeholder="Nhập mã trong email"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <MotionButton
                type="submit"
                disabled={loading}
                hoverScale={1.02}
                tapScale={0.98}
                className="w-full rounded-xl bg-violet-600 py-2.5 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? 'Đang xác minh...' : 'Xác minh email'}
              </MotionButton>
            </form>
            <button
              type="button"
              disabled={resendLoading}
              onClick={handleResendOtp}
              className="mt-4 w-full rounded-xl border border-dashboard-border bg-dashboard-surface py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            >
              {resendLoading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
            </button>
            <button
              type="button"
              onClick={goLogin}
              className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-zinc-300"
            >
              ← Quay lại đăng nhập
            </button>
          </>
        )}
      </div>

      {(error || info) && (
        <div
          className={`fixed top-4 right-4 z-30 flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 shadow-lg ${
            error
              ? 'border-red-500/40 bg-red-500/20'
              : 'border-emerald-500/40 bg-emerald-500/20'
          }`}
        >
          <p
            className={`flex-1 text-sm font-medium ${error ? 'text-red-200' : 'text-emerald-200'}`}
          >
            {error || info}
          </p>
          <button
            type="button"
            onClick={() => {
              setError('');
              setInfo('');
            }}
            className={`shrink-0 rounded p-0.5 hover:bg-white/10 ${
              error ? 'text-red-300 hover:text-red-100' : 'text-emerald-300 hover:text-emerald-100'
            }`}
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
