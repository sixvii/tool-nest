import PropTypes from 'prop-types';
import { PROFILE_PHOTO_SIZE_PRESETS } from '../../../../constants/image/profilePhotoMaker/profilePhotoMakerConstants';

export default function ProfilePhotoSizeGrid({ outputSize, isProcessing, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {PROFILE_PHOTO_SIZE_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          disabled={isProcessing}
          onClick={() => onChange(preset.value)}
          className={`py-3 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            outputSize === preset.value
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

ProfilePhotoSizeGrid.propTypes = {
  outputSize: PropTypes.number.isRequired,
  isProcessing: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
