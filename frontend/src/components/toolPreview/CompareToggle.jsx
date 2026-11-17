import PropTypes from 'prop-types';
import { COMPARE_TOGGLE_BUTTONS } from '../../constants/toolPreviewConstants';

const ACTIVE_CLASS = 'bg-white shadow text-slate-800';
const INACTIVE_CLASS = 'text-slate-500 hover:text-slate-700';

export default function CompareToggle({ showOriginal, onSelectView, labels, disabled = false }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
      {COMPARE_TOGGLE_BUTTONS.map(({ id, labelKey, isOriginal }) => {
        const isActive = showOriginal === isOriginal;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectView(isOriginal)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? ACTIVE_CLASS : INACTIVE_CLASS
            }`}
          >
            {labels[labelKey]}
          </button>
        );
      })}
    </div>
  );
}

CompareToggle.propTypes = {
  showOriginal: PropTypes.bool.isRequired,
  onSelectView: PropTypes.func.isRequired,
  labels: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
};
