import React from 'react';

function FloodLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        className="h-12 w-12 shrink-0 drop-shadow-[0_0_18px_rgba(56,189,248,0.55)]"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <path
          d="M8 30c4-6 8-8 14-6 4 1 7-1 10-5 3-4 6-5 10-3v14H8v0z"
          fill="url(#lg)"
          opacity="0.9"
        />
        <path
          d="M6 34c5-4 10-5 16-2 5 2 9 1 14-3 2-2 4-3 6-3v10H6z"
          fill="url(#lg)"
          opacity="0.55"
        />
        <circle cx="36" cy="14" r="3" fill="#7dd3fc" opacity="0.9" />
      </svg>
      <div>
        <p className="text-xl font-bold tracking-tight text-white drop-shadow-md">FLOODSIGHT</p>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-200/80">Admin Console</p>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a]">
      <div
        className="auth-bg-animated pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(125deg, #0c1222 0%, #111827 25%, #0f172a 50%, #1e1b4b 75%, #0f172a 100%)',
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl" />

      <div className="login-wave-wrap pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] min-h-[200px] opacity-40">
        <div className="login-wave login-wave--1" />
        <div className="login-wave login-wave--2" />
        <div className="login-wave login-wave--3" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between p-10 text-white lg:flex">
          <FloodLogo />
          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-semibold leading-tight text-white/95">
              Giám sát lũ lụt thời gian thực — một nền tảng cho điều hành an toàn.
            </h1>
            <p className="text-sm leading-relaxed text-slate-300/90">
              Bảng điều khiển dành cho quản trị viên và điều hành viên: phân tích, cảnh báo và vận hành dữ liệu
              cảm biến — bảo mật và ổn định.
            </p>
          </div>
          <p className="text-xs text-slate-500">© FLOODSIGHT</p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}

export { FloodLogo };
