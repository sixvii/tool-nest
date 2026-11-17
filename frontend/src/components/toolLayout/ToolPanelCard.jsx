import PropTypes from 'prop-types';
import Card from '../ui/Card';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';

export default function ToolPanelCard({ children, className = '', variant = 'preview' }) {
  const shell = variant === 'options' ? TOOL_LAYOUT.optionsPanel : TOOL_LAYOUT.previewPanel;

  return (
    <Card padding="lg" className={`${shell} gap-4 ${className}`.trim()}>
      {children}
    </Card>
  );
}

ToolPanelCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['preview', 'options']),
};
