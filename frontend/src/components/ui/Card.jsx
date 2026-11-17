const paddings = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

export default function Card({ children, className = '', hover = false, padding = 'md', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-slate-100 shadow-sm transition-all
        ${paddings[padding] ?? paddings.md}
        ${hover ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}
