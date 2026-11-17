import PropTypes from 'prop-types';
import {
  FLIP_APPLY_ORDER,
  FLIP_AXIS_CONFIG,
} from '../../../../constants/image/flipImage/flipImageConstants';
import FlipDirectionOption from './FlipDirectionOption';

export default function FlipDirectionGrid({ selection, isProcessing, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FLIP_APPLY_ORDER.map((axis) => {
        const config = FLIP_AXIS_CONFIG[axis];
        return (
          <FlipDirectionOption
            key={config.id}
            label={config.label}
            icon={config.icon}
            active={selection[axis]}
            disabled={isProcessing}
            onToggle={() => onToggle(axis)}
          />
        );
      })}
    </div>
  );
}

FlipDirectionGrid.propTypes = {
  selection: PropTypes.shape({
    horizontal: PropTypes.bool.isRequired,
    vertical: PropTypes.bool.isRequired,
  }).isRequired,
  isProcessing: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
