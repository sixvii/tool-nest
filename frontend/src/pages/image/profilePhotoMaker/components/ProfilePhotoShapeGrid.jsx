import PropTypes from 'prop-types';
import {
  PROFILE_PHOTO_SHAPE_CONFIG,
  PROFILE_PHOTO_SHAPES,
} from '../../../../constants/image/profilePhotoMaker/profilePhotoMakerConstants';
import ProfilePhotoShapeOption from './ProfilePhotoShapeOption';

export default function ProfilePhotoShapeGrid({ shape, isProcessing, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PROFILE_PHOTO_SHAPES.map((option) => {
        const config = PROFILE_PHOTO_SHAPE_CONFIG[option.value];
        return (
          <ProfilePhotoShapeOption
            key={option.value}
            label={config.label}
            icon={config.icon}
            active={shape === option.value}
            disabled={isProcessing}
            onSelect={() => onChange(option.value)}
          />
        );
      })}
    </div>
  );
}

ProfilePhotoShapeGrid.propTypes = {
  shape: PropTypes.string.isRequired,
  isProcessing: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
