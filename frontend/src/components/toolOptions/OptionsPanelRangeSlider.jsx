import PropTypes from 'prop-types';
import { OPTIONS_PANEL_RANGE_CLASSES } from '../../constants/toolOptionsConstants';

export default function OptionsPanelRangeSlider({
  id,
  label,
  value,
  min,
  max,
  valueSuffix = 'px',
  minLabel,
  maxLabel,
  labelClassName = 'text-sm font-medium text-slate-700',
  valueClassName = 'text-sm font-semibold text-blue-600',
  onChange,
  onCommit = null,
  disabled = false,
  className = '',
}) {
  const handleCommit = (event) => {
    if (onCommit) onCommit(Number(event.target.value));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      {(label || valueSuffix) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className={labelClassName}>
              {label}
            </label>
          )}
          <span className={valueClassName}>
            {value}
            {valueSuffix}
          </span>
        </div>
      )}

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onMouseUp={onCommit ? handleCommit : undefined}
        onTouchEnd={onCommit ? handleCommit : undefined}
        className={OPTIONS_PANEL_RANGE_CLASSES}
        disabled={disabled}
      />

      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

OptionsPanelRangeSlider.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  valueSuffix: PropTypes.string,
  minLabel: PropTypes.string,
  maxLabel: PropTypes.string,
  labelClassName: PropTypes.string,
  valueClassName: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onCommit: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
