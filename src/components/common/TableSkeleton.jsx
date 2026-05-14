import React from 'react';

export function TableSkeleton({ rows = 10, cols = 7 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashboard-border bg-dashboard-card">
      <div className="animate-pulse border-b border-dashboard-border bg-dashboard-surface/80 p-3">
        <div className="flex gap-3">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 flex-1 rounded bg-zinc-700/60" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-dashboard-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 p-3">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 flex-1 rounded bg-zinc-800/80" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
