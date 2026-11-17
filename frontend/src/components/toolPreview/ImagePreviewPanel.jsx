import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';
import { IMAGE_TOOL_PREVIEW_DEFAULTS } from '../../constants/image/imageToolPreviewConstants';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import {
  getImageToolPreviewDisplayState,
  hasImageToolPreviewResult,
  isDisplayableImagePreview,
  mergeImageToolPreviewLabels,
} from '../../utils/image/imageToolPreviewUtils';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { useImageToolPreviewUrls } from '../../hooks/useBlobPreviewUrl';
import { useBeforeUnloadWarning } from '../../hooks/useBeforeUnloadWarning';
import PreviewPanelUpload from './PreviewPanelUpload';
import PreviewPanelHeader from './PreviewPanelHeader';
import PreviewPanelCanvas from './PreviewPanelCanvas';
import PreviewPanelResultActions from './PreviewPanelResultActions';

/**
 * Shared left-column preview for image tools.
 * Flow: upload (empty) -> original preview -> result preview (with optional before/after toggle).
 */
export default function ImagePreviewPanel({
  file = null,
  resultBlob = null,
  isProcessing = false,
  onFiles,
  onClearImage,
  labels = {},
  accept = IMAGE_TOOL_PREVIEW_DEFAULTS.accept,
  multiple = IMAGE_TOOL_PREVIEW_DEFAULTS.multiple,
  showCompareToggle = IMAGE_TOOL_PREVIEW_DEFAULTS.showCompareToggle,
  minHeightClass = IMAGE_TOOL_PREVIEW_DEFAULTS.minHeightClass,
  headerActions = null,
  children = null,
  onDownload = null,
  downloadLabel = '',
  secondaryResultAction = null,
  keepOriginalPreview = false,
  uploadIcon = null,
  uploadTitle = null,
  uploadSubtitle = null,
  renderLoader = null,
}) {
  const mergedLabels = mergeImageToolPreviewLabels(labels);

  // Warn before reload/close if there's an uploaded image or an unsaved result.
  useBeforeUnloadWarning(Boolean(file) || Boolean(resultBlob));

  const [viewOriginal, setViewOriginal] = useState(false);
  const replaceInputRef = useRef(null);
  const { originalUrl, resultUrl } = useImageToolPreviewUrls(file, resultBlob);

  const hasResult = hasImageToolPreviewResult(resultBlob, resultUrl);
  const canShowResultPreview = isDisplayableImagePreview(resultBlob);
  const isViewingOriginal =
    keepOriginalPreview || !canShowResultPreview || !hasResult || viewOriginal;
  const { statusLabel, displayUrlKey } = getImageToolPreviewDisplayState({
    hasResult: hasResult && canShowResultPreview,
    showOriginal: isViewingOriginal,
    labels: mergedLabels,
  });
  const urlMap = { original: originalUrl, result: resultUrl };
  const displayUrl = isViewingOriginal
    ? originalUrl
    : (urlMap[displayUrlKey] ?? originalUrl ?? resultUrl);
  const canCompare = showCompareToggle && hasResult && canShowResultPreview;
  const showOriginalContent = !hasResult || !canShowResultPreview || viewOriginal;
  const originalContent =
    typeof children === 'function' ? children({ viewOriginal, hasResult }) : children;
  const showCustomContent =
    showOriginalContent && originalContent != null && originalContent !== false;
  const resultDisplayUrl = showOriginalContent ? null : displayUrl;

  const handleReplaceChange = (event) => {
    const picked = event.target.files;
    if (picked?.length) onFiles(Array.from(picked));
    resetFileInput(event);
  };

  return (
    <Card padding="lg" className={`${TOOL_LAYOUT.previewPanel} ${minHeightClass}`.trim()}>
      {!file ? (
        <PreviewPanelUpload
          labels={mergedLabels}
          accept={accept}
          multiple={multiple}
          onFiles={onFiles}
          uploadIcon={uploadIcon}
          uploadTitle={uploadTitle}
          uploadSubtitle={uploadSubtitle}
        />
      ) : (
        <div className="flex flex-col gap-3 flex-1 w-full min-h-0">
          <PreviewPanelHeader
            statusLabel={statusLabel}
            fileName={file.name}
            labels={mergedLabels}
            isProcessing={isProcessing}
            replaceInputRef={replaceInputRef}
            onReplaceChange={handleReplaceChange}
            onOpenReplace={() => replaceInputRef.current?.click()}
            onClearImage={onClearImage}
            headerActions={headerActions}
            accept={accept}
          />

          <PreviewPanelCanvas
            displayUrl={showCustomContent ? null : (resultDisplayUrl ?? originalUrl)}
            statusLabel={statusLabel}
            isProcessing={isProcessing}
            processingLabel={mergedLabels.processingLabel}
            isLoading={Boolean(file && !showCustomContent && !resultDisplayUrl && !originalUrl)}
            renderLoader={renderLoader}
          >
            {showCustomContent ? originalContent : null}
          </PreviewPanelCanvas>

          {hasResult && (onDownload || canCompare) && (
            <PreviewPanelResultActions
              showCompare={canCompare}
              showOriginal={viewOriginal}
              onSelectView={setViewOriginal}
              compareLabels={mergedLabels}
              onDownload={onDownload}
              downloadLabel={downloadLabel || mergedLabels.downloadLabel}
              isProcessing={isProcessing}
            >
              {secondaryResultAction}
            </PreviewPanelResultActions>
          )}
        </div>
      )}
    </Card>
  );
}

ImagePreviewPanel.propTypes = {
  file: PropTypes.object,
  resultBlob: PropTypes.instanceOf(Blob),
  isProcessing: PropTypes.bool,
  onFiles: PropTypes.func.isRequired,
  onClearImage: PropTypes.func.isRequired,
  labels: PropTypes.object,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  showCompareToggle: PropTypes.bool,
  minHeightClass: PropTypes.string,
  headerActions: PropTypes.node,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onDownload: PropTypes.func,
  downloadLabel: PropTypes.string,
  secondaryResultAction: PropTypes.node,
  keepOriginalPreview: PropTypes.bool,
  uploadIcon: PropTypes.elementType,
  uploadTitle: PropTypes.node,
  uploadSubtitle: PropTypes.node,
  renderLoader: PropTypes.func,
};
