export default function Textarea({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  error,
  disabled = false,
  className = '',
  id,
}) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        spellCheck={false}
        className={`w-full p-4 rounded-2xl border outline-none text-sm resize-none transition-all
          ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/5'
              : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
          }
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}
          ${className}`}
      />
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}
