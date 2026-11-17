export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  className = '',
  id,
  icon,
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase">
          {label}
        </label>
      )}
      <div
        className={`flex items-center rounded-2xl border transition-all
        ${
          error
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/5'
            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5'
        }
        ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
      >
        {icon && (
          <>
            <span className="pl-3 text-slate-400 flex-shrink-0">{icon}</span>
            <div className="w-px h-5 bg-slate-200 mx-2 flex-shrink-0" />
          </>
        )}
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full py-3 outline-none text-sm bg-transparent
            ${icon ? 'pr-3' : 'px-3'}
            ${disabled ? 'text-slate-400 cursor-not-allowed' : ''}
            ${className}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}
