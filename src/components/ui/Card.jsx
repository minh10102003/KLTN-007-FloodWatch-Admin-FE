export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-dashboard-border bg-dashboard-card ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = '' }) {
  return <div className={`border-b border-dashboard-border px-6 py-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children }) {
  return <h3 className="text-lg font-semibold text-zinc-100">{children}</h3>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`px-6 py-4 text-zinc-300 ${className}`}>{children}</div>;
}
