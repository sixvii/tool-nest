import PropTypes from 'prop-types';
import { X } from 'lucide-react';

export default function PreviewPanelHeader({
  statusLabel,
  fileName,
  labels,
  isProcessing,
  replaceInputRef,
  onReplaceChange,
  onOpenReplace,
  onClearImage = null,
  onClearFile = null,
  headerActions,
  accept,
}) {
  const handleClear = onClearFile ?? onClearImage;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 flex-shrink-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{statusLabel}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{fileName}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:justify-end">
        {headerActions}

        <input
          ref={replaceInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onReplaceChange}
        />
        <button
          type="button"
          disabled={isProcessing}
          onClick={onOpenReplace}
          className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {labels.changeImageButton}
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleClear}
          aria-label={labels.removeImageAriaLabel}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}

PreviewPanelHeader.propTypes = {
  statusLabel: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  labels: PropTypes.object.isRequired,
  isProcessing: PropTypes.bool.isRequired,
  replaceInputRef: PropTypes.object.isRequired,
  onReplaceChange: PropTypes.func.isRequired,
  onOpenReplace: PropTypes.func.isRequired,
  onClearImage: PropTypes.func,
  onClearFile: PropTypes.func,
  headerActions: PropTypes.node,
  accept: PropTypes.string.isRequired,
};

PreviewPanelHeader.defaultProps = {
  headerActions: null,
};
