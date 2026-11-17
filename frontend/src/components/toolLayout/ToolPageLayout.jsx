import PropTypes from 'prop-types';
import Heading from '../ui/Heading';
import Alert from '../ui/Alert';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';

export default function ToolPageLayout({ title, subtitle, children, error = '' }) {
  return (
    <div className={TOOL_LAYOUT.pageShell}>
      <Heading as="h1" className="mb-1">
        {title}
      </Heading>
      <p className="text-slate-400 text-sm mb-5">{subtitle}</p>

      <div className={TOOL_LAYOUT.contentWidth}>
        <Alert variant="error" message={error} show={!!error} />
        {children}
      </div>
    </div>
  );
}

ToolPageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
};
