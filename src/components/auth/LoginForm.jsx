import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { login, logout } from '../../services/api';
import { canAccessAdminApp } from '../../utils/auth';
import { FloodLogo } from './AuthLayout';
import { useToast } from '../ui/Toast';

export default function LoginForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (canAccessAdminApp()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (canAccessAdminApp()) {
    return null;
  }

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError(false);
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      if (result.user?.role === 'user') {
        toast(t('auth.noAdminAccess'), 'error');
        setFieldError(true);
        triggerShake();
        await logout();
        return;
      }
      navigate('/', { replace: true });
      return;
    }
    toast(result.error || t('auth.invalidCredentials'), 'error');
    setFieldError(true);
    triggerShake();
  };

  return (
    <div
      className={`w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl transition-transform ${
        shake ? 'animate-shake' : ''
      }`}
    >
      <div className="mb-8 lg:hidden">
        <FloodLogo />
      </div>

      <p className="mb-6 text-sm text-slate-300">{t('auth.loginHint')}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-slate-200">
            {t('auth.username')}
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setFieldError(false);
              }}
              autoComplete="username"
              required
              className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-200">
            {t('auth.password')}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldError(false);
              }}
              autoComplete="current-password"
              required
              className={`w-full rounded-xl border bg-black/25 py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 ${
                fieldError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
                  : 'border-white/10 focus:border-sky-500/60 focus:ring-sky-500/50'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:brightness-110 disabled:opacity-60"
        >
          <span className="relative z-10 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t('auth.loggingIn') : t('auth.signIn')}
          </span>
        </button>
      </form>

      <div className="mt-8 flex items-start gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-xs text-slate-400">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-sky-400/90" aria-hidden />
        <span>{t('auth.adminOnlyNote')}</span>
      </div>
    </div>
  );
}
