import PropTypes from 'prop-types';
import ProcessingOverlay from './ProcessingOverlay';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';

export default function PreviewPanelCanvas({
  displayUrl,
  statusLabel,
  isProcessing,
  processingLabel,
  isLoading = false,
  children = null,
  renderLoader = null,
}) {
  const hasCustomPreview = children != null && children !== false;
  const showImage = Boolean(displayUrl && !hasCustomPreview);

  if (isProcessing && renderLoader) {
    return (
      <div
        className={`relative w-full ${TOOL_LAYOUT.previewCanvas} flex items-center justify-center overflow-hidden p-4`}
      >
        <div className="w-full max-h-full overflow-auto flex items-center justify-center">
          {renderLoader()}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${TOOL_LAYOUT.previewCanvas} rounded-xl border border-slate-200 bg-slate-50 overflow-hidden`}
    >
      <div className="relative flex items-center justify-center p-4 h-full min-h-0 w-full overflow-auto">
        {hasCustomPreview && (
          <div className="w-full h-full min-h-0 flex items-center justify-center">{children}</div>
        )}

        {showImage && (
          <img
            key={displayUrl}
            src={displayUrl}
            alt={statusLabel}
            className={`block relative z-[1] ${TOOL_LAYOUT.previewImage} rounded-lg shadow-sm`}
          />
        )}

        {!hasCustomPreview && !displayUrl && isLoading && (
          <p className="text-sm text-slate-400">Loading preview…</p>
        )}

        {!hasCustomPreview && !displayUrl && !isLoading && (
          <p className="text-sm text-slate-400">Preview unavailable</p>
        )}

        {isProcessing && !renderLoader && <ProcessingOverlay label={processingLabel} />}
      </div>
    </div>
  );
}

PreviewPanelCanvas.propTypes = {
  displayUrl: PropTypes.string,
  statusLabel: PropTypes.string.isRequired,
  isProcessing: PropTypes.bool.isRequired,
  processingLabel: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
  children: PropTypes.node,
  renderLoader: PropTypes.func,
};

PreviewPanelCanvas.defaultProps = {
  displayUrl: null,
  isLoading: false,
  children: null,
};
