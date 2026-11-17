import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
  secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  success:
    'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
  ghost: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  tab: 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900',
  tabActive: 'bg-blue-600 text-white border border-blue-600 shadow-sm',
  icon: 'p-2 bg-slate-50 rounded-full hover:bg-blue-600 hover:text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-5 py-2 text-sm rounded-2xl',
  lg: 'w-full py-4 text-sm rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  children,
  className = '',
  type = 'button',
}) {
  const isDisabled = disabled || loading;

  const base = 'font-bold tracking-wide transition-all flex items-center justify-center gap-2';
  const disabledClass = 'bg-slate-100 text-slate-400 cursor-not-allowed';
  const variantClass = isDisabled ? disabledClass : (variants[variant] ?? variants.primary);
  const sizeClass = variant === 'icon' ? '' : (sizes[size] ?? sizes.md);
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${base} ${sizeClass} ${variantClass} ${widthClass} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
