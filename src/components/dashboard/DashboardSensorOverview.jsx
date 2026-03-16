import React from 'react';
import { FaSignal, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';

/**
 * Tổng quan sensor gọn cho dashboard admin.
 * Chỉ hiển thị số liệu cao cấp (tổng, hoạt động, offline); chi tiết xem 2 bảng bên dưới.
 */
export default function DashboardSensorOverview({ stats, loading, lastUpdated }) {
  if (loading) {
    return (
      <section className="rounded-xl border border-dashboard-border bg-dashboard-card px-5 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="h-8 w-24 animate-pulse rounded bg-dashboard-surface" />
          <div className="h-8 w-20 animate-pulse rounded bg-dashboard-surface" />
          <div className="h-8 w-20 animate-pulse rounded bg-dashboard-surface" />
          <div className="h-8 w-32 animate-pulse rounded bg-dashboard-surface" />
        </div>
      </section>
    );
  }

  const { total = 0, normal = 0, offline = 0 } = stats || {};
  const onlineLabel = total > 0 ? `${normal}/${total} hoạt động` : '—';

  return (
    <section className="rounded-xl border border-dashboard-border bg-dashboard-card">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <FaSignal className="h-5 w-5 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-400">Tổng sensor</span>
            <span className="text-lg font-bold text-zinc-100">{total}</span>
          </div>
          <div className="h-4 w-px bg-dashboard-border" aria-hidden />
          <div className="flex items-center gap-2">
            <FaCircleCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-zinc-400">{onlineLabel}</span>
          </div>
          <div className="h-4 w-px bg-dashboard-border" aria-hidden />
          <div className="flex items-center gap-2">
            <FaCircleXmark className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              <span className="font-medium text-zinc-300">{offline}</span>
              <span className="ml-1">offline</span>
            </span>
          </div>
        </div>
        {lastUpdated != null && (
          <>
            <div className="h-4 w-px bg-dashboard-border hidden sm:block" aria-hidden />
            <p className="text-xs text-zinc-500">
              Cập nhật: {new Date(lastUpdated).toLocaleString('vi-VN')}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
