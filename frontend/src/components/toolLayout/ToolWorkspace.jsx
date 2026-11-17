import PropTypes from 'prop-types';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';

export default function ToolWorkspace({
  preview,
  options = null,
  secondary = null,
  showOptions = false,
  variant = 'options',
}) {
  const shouldShowSidePanel = Boolean(secondary) || (Boolean(options) && showOptions);

  if (!shouldShowSidePanel) {
    return <div className={TOOL_LAYOUT.previewColumn}>{preview}</div>;
  }

  return (
    <div className={TOOL_LAYOUT.workspace}>
      <div className={TOOL_LAYOUT.previewColumn}>{preview}</div>
      <div className={TOOL_LAYOUT.optionsColumn} data-variant={variant}>
        {secondary}
        {showOptions && options}
      </div>
    </div>
  );
}

ToolWorkspace.propTypes = {
  preview: PropTypes.node.isRequired,
  options: PropTypes.node,
  secondary: PropTypes.node,
  showOptions: PropTypes.bool,
  variant: PropTypes.oneOf(['options', 'guide', 'simple']),
};
