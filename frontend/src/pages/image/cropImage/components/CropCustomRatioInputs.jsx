import PropTypes from 'prop-types';
import { CROP_IMAGE_COPY } from '../../../../constants/image/cropImage/cropImageConstants';

export default function CropCustomRatioInputs({ customRatio, onChange }) {
  const handleChange = (axis, value) => {
    const parsed = Number(value);
    onChange({
      ...customRatio,
      [axis]: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label
          htmlFor="crop-custom-ratio-x"
          className="text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase block"
        >
          {CROP_IMAGE_COPY.customRatioXLabel}
        </label>
        <input
          id="crop-custom-ratio-x"
          type="number"
          min="0.1"
          step="0.1"
          value={customRatio.x}
          onChange={(event) => handleChange('x', event.target.value)}
          className="w-full p-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="crop-custom-ratio-y"
          className="text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase block"
        >
          {CROP_IMAGE_COPY.customRatioYLabel}
        </label>
        <input
          id="crop-custom-ratio-y"
          type="number"
          min="0.1"
          step="0.1"
          value={customRatio.y}
          onChange={(event) => handleChange('y', event.target.value)}
          className="w-full p-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none text-sm"
        />
      </div>
    </div>
  );
}

CropCustomRatioInputs.propTypes = {
  customRatio: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};
