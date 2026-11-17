import PropTypes from 'prop-types';

export default function ProfilePhotoShapeOption({ label, icon: Icon, active, disabled, onSelect }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <Icon className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
      <span className={`text-xs font-bold ${active ? 'text-blue-700' : 'text-slate-500'}`}>
        {label}
      </span>
    </button>
  );
}

ProfilePhotoShapeOption.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  active: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

ProfilePhotoShapeOption.defaultProps = {
  disabled: false,
};
