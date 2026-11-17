import PropTypes from 'prop-types';

export default function PageNavigator({ pageNum, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-2 border-t border-slate-100 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, pageNum - 1))}
        disabled={pageNum === 1}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 8 12">
          <path
            d="M6 1L2 6l4 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="text-xs text-slate-500 font-medium">
        {pageNum} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, pageNum + 1))}
        disabled={pageNum === totalPages}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 8 12">
          <path
            d="M2 1l4 5-4 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

PageNavigator.propTypes = {
  pageNum: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
