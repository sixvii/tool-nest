import PropTypes from 'prop-types';
import { Lightbulb } from 'lucide-react';

export default function FlipTipsCard({ heading, tips }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {heading}
        </p>
      </div>
      <ul className="space-y-1.5">
        {tips.map((tip) => (
          <li key={tip} className="text-xs text-slate-500 leading-relaxed flex gap-2">
            <span className="text-slate-300 flex-shrink-0">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

FlipTipsCard.propTypes = {
  heading: PropTypes.string.isRequired,
  tips: PropTypes.arrayOf(PropTypes.string).isRequired,
};
