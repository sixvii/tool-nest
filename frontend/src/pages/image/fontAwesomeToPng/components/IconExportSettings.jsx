import PropTypes from 'prop-types';
import { Input } from '../../../../components/ui';
import { FA_SIZE_LIMITS, SIZE_PRESETS } from '../../../../constants/image/fontAwesomeIcons';

export default function IconExportSettings({
  customUnicode,
  onCustomUnicodeChange,
  size,
  onSizeChange,
  color,
  onColorChange,
}) {
  return (
    <>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
          Custom unicode
        </p>
        <Input
          placeholder="e.g. f007 or \uf007"
          value={customUnicode}
          onChange={(e) => onCustomUnicodeChange(e.target.value)}
        />
        <p className="text-[10px] text-slate-400 mt-1 ml-1">Overrides selected icon when set</p>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Size</p>
        <div className="relative">
          <input
            type="number"
            min={FA_SIZE_LIMITS.min}
            max={FA_SIZE_LIMITS.max}
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            px
          </span>
        </div>
        <div className="flex gap-1.5 mt-2">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onSizeChange(preset)}
              className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition-all ${
                size === preset
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Color</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
          />
          <Input
            placeholder="#000000"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="font-mono"
          />
        </div>
      </div>
    </>
  );
}

IconExportSettings.propTypes = {
  customUnicode: PropTypes.string.isRequired,
  onCustomUnicodeChange: PropTypes.func.isRequired,
  size: PropTypes.number.isRequired,
  onSizeChange: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  onColorChange: PropTypes.func.isRequired,
};
