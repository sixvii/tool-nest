import PropTypes from 'prop-types';
import { Download, Sparkles, Upload } from 'lucide-react';
import Card from '../ui/Card';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';

const DEFAULT_ICONS = [Upload, Sparkles, Download];

export default function ToolGuide({ title = 'How it works', steps, className = '' }) {
  return (
    <Card padding="lg" className={`${TOOL_LAYOUT.guidePanel} ${className}`.trim()}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      </div>

      <ol className="divide-y divide-slate-200">
        {steps.map(({ icon: StepIcon, text }, index) => {
          const Icon = StepIcon ?? DEFAULT_ICONS[index] ?? Sparkles;
          return (
            <li
              key={`${index}-${text}`}
              className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              </span>
              <span className="text-sm text-slate-600 leading-relaxed pt-1">{text}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

ToolGuide.propTypes = {
  title: PropTypes.string,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.elementType,
      text: PropTypes.node.isRequired,
    })
  ).isRequired,
  className: PropTypes.string,
};
