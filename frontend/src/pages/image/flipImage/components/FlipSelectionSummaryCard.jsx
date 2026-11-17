import PropTypes from 'prop-types';

export default function FlipSelectionSummaryCard({ heading, title, description }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">{heading}</p>
      <p className="text-sm font-semibold text-slate-800 mt-1">{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

FlipSelectionSummaryCard.propTypes = {
  heading: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};
