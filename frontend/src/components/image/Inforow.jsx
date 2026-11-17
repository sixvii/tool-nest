import PropTypes from 'prop-types';

export default function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 odd:bg-slate-50/60">
      <span className="text-sm text-slate-900">{label}</span>
      <span className="text-sm text-slate-900 font-medium text-right break-all">{value}</span>
    </div>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
