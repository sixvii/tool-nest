const variants = {
  default: 'bg-blue-50 text-blue-600 border border-blue-100',
  success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  error: 'bg-red-50 text-red-600 border border-red-100',
  muted: 'bg-slate-100 text-slate-500 border border-slate-200',
};

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span
      className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
      ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </span>
  );
}
