import React from 'react';

/**
 * Table component với phân bổ độ rộng cột rõ ràng (tránh một cột chiếm hết không gian).
 * Dùng colWidths (mảng % hoặc px) để cân bằng các cột.
 */
export function Table({ children, className = '', colWidths = [] }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm border-collapse">
        {colWidths.length > 0 && (
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: typeof w === 'number' ? `${w}%` : w }} />
            ))}
          </colgroup>
        )}
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = '' }) {
  return (
    <thead className={`border-b border-dashboard-border bg-dashboard-surface text-left text-zinc-400 ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ children, className = '' }) {
  return (
    <tr className={`border-b border-dashboard-border hover:bg-white/5 ${className}`}>
      {children}
    </tr>
  );
}

export function TableTh({ children, className = '' }) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      {children}
    </th>
  );
}

export function TableTd({ children, className = '' }) {
  return <td className={`px-4 py-2.5 align-top ${className}`}>{children}</td>;
}
