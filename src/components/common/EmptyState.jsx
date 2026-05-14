import React from 'react';

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashboard-border bg-dashboard-surface/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 text-zinc-500 [&>svg]:h-12 [&>svg]:w-12">{icon}</div>}
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
