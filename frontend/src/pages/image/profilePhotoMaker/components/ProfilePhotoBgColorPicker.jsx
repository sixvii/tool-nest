import PropTypes from 'prop-types';
import { PROFILE_PHOTO_BG_COLORS } from '../../../../constants/image/profilePhotoMaker/profilePhotoMakerConstants';

export default function ProfilePhotoBgColorPicker({ bgColor, isProcessing, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROFILE_PHOTO_BG_COLORS.map((color) => (
        <button
          key={color.label}
          type="button"
          disabled={isProcessing}
          onClick={() => onChange(color.value)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all
                      flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        bgColor === color.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
        >
          {color.value && (
            <span
              className="inline-block w-3 h-3 rounded-full border border-slate-200 flex-shrink-0"
              style={{ backgroundColor: color.value }}
            />
          )}
          {color.label}
        </button>
      ))}
    </div>
  );
}

ProfilePhotoBgColorPicker.propTypes = {
  bgColor: PropTypes.string.isRequired,
  isProcessing: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
