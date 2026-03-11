import React from 'react';
import { FaSignal, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';

/**
 * Tổng quan sensor gọn cho dashboard admin.
 * Chỉ hiển thị số liệu cao cấp (tổng, hoạt động, offline); chi tiết xem 2 bảng bên dưới.
 */
export default function DashboardSensorOverview({ stats, loading, lastUpdated }) {
  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      </section>
    );
  }

  const { total = 0, normal = 0, offline = 0 } = stats || {};
  const onlineLabel = total > 0 ? `${normal}/${total} hoạt động` : '—';

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <FaSignal className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Tổng sensor</span>
            <span className="text-lg font-bold text-slate-800">{total}</span>
          </div>
          <div className="h-4 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-2">
            <FaCircleCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-slate-600">{onlineLabel}</span>
          </div>
          <div className="h-4 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-2">
            <FaCircleXmark className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              <span className="font-medium text-slate-700">{offline}</span>
              <span className="ml-1 text-slate-500">offline</span>
            </span>
          </div>
        </div>
        {lastUpdated != null && (
          <>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" aria-hidden />
            <p className="text-xs text-slate-400">
              Cập nhật: {new Date(lastUpdated).toLocaleString('vi-VN')}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
