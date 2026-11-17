import PropTypes from 'prop-types';
import Heading from '../ui/Heading';

export default function OptionsPanelSection({
  title = '',
  hint = '',
  icon = null,
  headingAs = 'h4',
  className = '',
  titleClassName = 'mb-1',
  children = null,
}) {
  return (
    <div className={className}>
      {(title || hint || icon) && (
        <div className={icon ? 'flex items-center gap-2 mb-4' : 'mb-1'}>
          {icon}
          <div className="min-w-0">
            {title && (
              <Heading as={headingAs} className={hint ? titleClassName : undefined}>
                {title}
              </Heading>
            )}
            {hint && <p className="text-xs text-slate-400">{hint}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

OptionsPanelSection.propTypes = {
  title: PropTypes.string,
  hint: PropTypes.string,
  icon: PropTypes.node,
  headingAs: PropTypes.string,
  className: PropTypes.string,
  titleClassName: PropTypes.string,
  children: PropTypes.node,
};
