export function Badge({ children, variant = 'default' }) {
  const classes = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-green-100 text-green-800',
    destructive: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[variant] || classes.default}`}>
      {children}
    </span>
  );
}
