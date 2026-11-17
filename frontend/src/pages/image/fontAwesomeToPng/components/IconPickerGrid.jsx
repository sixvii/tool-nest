import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui';

export default function IconPickerGrid({
  search,
  onSearchChange,
  icons,
  selectedIcon,
  customUnicode,
  onSelectIcon,
}) {
  return (
    <>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
          Search icons
        </p>
        <Input
          placeholder="Search by name or unicode (e.g. user, f007)"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
          Select icon
        </p>
        <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-white">
          {icons.length === 0 ? (
            <p className="col-span-4 text-xs text-slate-400 text-center py-4">No icons found</p>
          ) : (
            icons.map((icon) => {
              const isSelected = !customUnicode && selectedIcon?.name === icon.name;
              return (
                <button
                  key={icon.name}
                  type="button"
                  title={`${icon.label} (${icon.unicode})`}
                  onClick={() => onSelectIcon(icon)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <i className={`fa-solid fa-${icon.name} text-lg`} aria-hidden />
                  <span className="text-[9px] font-medium truncate w-full text-center">
                    {icon.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

const faIconShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  unicode: PropTypes.string,
});

IconPickerGrid.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  icons: PropTypes.arrayOf(faIconShape).isRequired,
  selectedIcon: faIconShape,
  customUnicode: PropTypes.string.isRequired,
  onSelectIcon: PropTypes.func.isRequired,
};
