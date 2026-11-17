import { ArrowRight } from 'lucide-react';
import PropTypes from 'prop-types';
import { useRef } from 'react';
import {
  IMAGE_RESIZER_PREVIEW_LAYOUT,
  IMAGE_TOOL_PREVIEW_COPY,
} from '../../../../constants/image/imageToolPreviewConstants';
import { mergeImageToolPreviewLabels } from '../../../../utils/image/imageToolPreviewUtils';
import { resetFileInput } from '../../../../utils/image/imageFileUtils';
import PreviewPanelHeader from '../../../../components/toolPreview/PreviewPanelHeader';
import PreviewPanelResultActions from '../../../../components/toolPreview/PreviewPanelResultActions';

const MAX_W = 560;
const MAX_H = 480;

export default function ImageResizerPreview({
  file,
  previewUrl,
  activeW,
  activeH,
  targetW,
  targetH,
  origW,
  origH,
  isProcessing = false,
  hasResult = false,
  showCompare = false,
  showOriginal = false,
  onSelectView,
  onFiles,
  onClearImage,
  onNewImage, // new alias supported
  onDownload,
  downloadLabel,
  secondaryResultAction = null,
  children, // render children as overlay in preview area
  renderLoader = null,
}) {
  const replaceInputRef = useRef(null);
  const labels = mergeImageToolPreviewLabels({});
  const showSizeChange = targetW > 0 && targetH > 0;

  const dispW = Math.max(1, activeW || origW);
  const dispH = Math.max(1, activeH || origH);
  const scale = Math.min(1, MAX_W / dispW, MAX_H / dispH);
  const scaledW = Math.round(dispW * scale);
  const scaledH = Math.round(dispH * scale);
  const displayW = scaledW > 1 ? scaledW : undefined;
  const displayH = scaledH > 1 ? scaledH : undefined;

  const handleReplaceChange = (event) => {
    const picked = event.target.files;
    if (picked?.length) onFiles(Array.from(picked));
    resetFileInput(event);
  };

  // prefer explicit onClearImage, fallback to onNewImage for compatibility
  const handleClear = onClearImage || onNewImage || (() => {});

  return (
    <div className="flex flex-col gap-3 w-full min-h-[45vh] max-h-fit">
      <PreviewPanelHeader
        statusLabel={hasResult ? labels.resultLabel : labels.previewLabel}
        fileName={file?.name}
        labels={labels}
        isProcessing={isProcessing}
        replaceInputRef={replaceInputRef}
        onReplaceChange={handleReplaceChange}
        onOpenReplace={() => replaceInputRef.current?.click()}
        onClearImage={handleClear}
        accept="image/*"
      />

      <div className={IMAGE_RESIZER_PREVIEW_LAYOUT.stage}>
        <div className={IMAGE_RESIZER_PREVIEW_LAYOUT.imageArea}>
          {previewUrl && (
            <img
              key={previewUrl}
              src={previewUrl}
              alt="preview"
              style={displayW && displayH ? { width: displayW, height: displayH } : undefined}
              className={IMAGE_RESIZER_PREVIEW_LAYOUT.image}
            />
          )}

          {children && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {children}
            </div>
          )}
        </div>

        {showSizeChange && (
          <div className={IMAGE_RESIZER_PREVIEW_LAYOUT.dimensions}>
            <span>
              {origW} × {origH}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-blue-600">
              {targetW} × {targetH}
            </span>
          </div>
        )}
      </div>
      {isProcessing && renderLoader ? (
        <div className="flex items-center min-h-[45vh] max-h-fit w-full">
          <div className="w-full">{renderLoader()}</div>
        </div>
      ) : null}

      {hasResult && (onDownload || showCompare) && (
        <PreviewPanelResultActions
          showCompare={showCompare}
          showOriginal={showOriginal}
          onSelectView={onSelectView}
          compareLabels={labels}
          onDownload={onDownload}
          downloadLabel={
            downloadLabel || labels.downloadLabel || IMAGE_TOOL_PREVIEW_COPY.downloadLabel
          }
          isProcessing={isProcessing}
        >
          {secondaryResultAction}
        </PreviewPanelResultActions>
      )}
    </div>
  );
}

ImageResizerPreview.propTypes = {
  file: PropTypes.object,
  previewUrl: PropTypes.string,
  activeW: PropTypes.number,
  activeH: PropTypes.number,
  targetW: PropTypes.number,
  targetH: PropTypes.number,
  origW: PropTypes.number,
  origH: PropTypes.number,
  isProcessing: PropTypes.bool,
  hasResult: PropTypes.bool,
  showCompare: PropTypes.bool,
  showOriginal: PropTypes.bool,
  onSelectView: PropTypes.func,
  onFiles: PropTypes.func.isRequired,
  onClearImage: PropTypes.func,
  onNewImage: PropTypes.func, // alias
  onDownload: PropTypes.func,
  downloadLabel: PropTypes.string,
  secondaryResultAction: PropTypes.node,
  children: PropTypes.node,
  renderLoader: PropTypes.func,
};

ImageResizerPreview.defaultProps = {
  file: null,
  previewUrl: null,
  activeW: 0,
  activeH: 0,
  targetW: 0,
  targetH: 0,
  origW: 0,
  origH: 0,
  isProcessing: false,
  hasResult: false,
  showCompare: false,
  showOriginal: false,
  onSelectView: null,
  onClearImage: null,
  onNewImage: null,
  onDownload: null,
  downloadLabel: '',
  secondaryResultAction: null,
  children: null,
};
