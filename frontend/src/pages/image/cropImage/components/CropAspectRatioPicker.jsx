import PropTypes from 'prop-types';
import Select from '../../../../components/ui/Select';
import { CROP_ASPECT_PRESET_IDS } from '../../../../constants/image/cropImage/cropAspectRatioConstants';
import { CROP_IMAGE_COPY } from '../../../../constants/image/cropImage/cropImageConstants';
import { getAvailableAspectPresetOptions } from '../../../../utils/image/cropImage/cropAspectRatioUtils';
import CropCustomRatioInputs from './CropCustomRatioInputs';

export default function CropAspectRatioPicker({
  selectedPresetId,
  customRatio,
  imageWidth,
  imageHeight,
  onSelect,
  onCustomRatioChange,
}) {
  const options = getAvailableAspectPresetOptions(imageWidth, imageHeight);

  return (
    <div className="w-full mb-4 shrink-0 space-y-3">
      <Select
        label={CROP_IMAGE_COPY.aspectRatioLabel}
        value={selectedPresetId}
        onChange={(event) => onSelect(event.target.value)}
        options={options}
        disabled={options.length === 0}
      />

      {options.length === 0 && (
        <p className="text-xs text-slate-400 text-center">
          {CROP_IMAGE_COPY.aspectRatioLoadingHint}
        </p>
      )}

      {selectedPresetId === CROP_ASPECT_PRESET_IDS.CUSTOM && (
        <CropCustomRatioInputs customRatio={customRatio} onChange={onCustomRatioChange} />
      )}
    </div>
  );
}

CropAspectRatioPicker.propTypes = {
  selectedPresetId: PropTypes.string.isRequired,
  customRatio: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  imageWidth: PropTypes.number.isRequired,
  imageHeight: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  onCustomRatioChange: PropTypes.func.isRequired,
};
