import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled = false,
  className = '',
  id,
}) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full p-3 pr-10 rounded-2xl border outline-none text-sm transition-all appearance-none
            ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/5'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
            }
            ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white cursor-pointer'}
            ${className}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={val} value={val}>
                {label}
              </option>
            );
          })}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}
