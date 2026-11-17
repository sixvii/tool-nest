import PropTypes from 'prop-types';
import {
  getChipPreviewStyle,
  normalizeHexColor,
} from '../../../../utils/image/addBorder/borderStyleUtils';

export default function BorderStyleChip({ style, active, color, onSelect }) {
  const chipColor = normalizeHexColor(color);
  const previewStyle = getChipPreviewStyle(style.id, chipColor);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
        active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center p-1.5">
        <div style={previewStyle} className="w-full h-full bg-white rounded-sm" />
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-blue-700' : 'text-slate-500'}`}>
        {style.label}
      </span>
    </button>
  );
}

BorderStyleChip.propTypes = {
  style: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  active: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};
