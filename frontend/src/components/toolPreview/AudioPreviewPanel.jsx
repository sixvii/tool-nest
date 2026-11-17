import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { useImageToolPreviewUrls } from '../../hooks/useBlobPreviewUrl';
import AudioPreviewPlayer from '../AudioPreviewPlayer';
import PreviewPanelUpload from './PreviewPanelUpload';
import PreviewPanelHeader from './PreviewPanelHeader';
import PreviewPanelCanvas from './PreviewPanelCanvas';
import PreviewPanelResultActions from './PreviewPanelResultActions';

const DEFAULT_LABELS = {
  uploadLabel: 'Upload Audio',
  previewLabel: 'Preview',
  resultLabel: 'Result',
  beforeLabel: 'Before',
  afterLabel: 'After',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
  processingLabel: 'Processing...',
  downloadLabel: 'Download',
};

export default function AudioPreviewPanel({
  file = null,
  resultBlob = null,
  isProcessing = false,
  onFiles,
  onClearFile,
  labels = {},
  accept = 'audio/*',
  multiple = false,
  showCompareToggle = true,
  minHeightClass = 'min-h-fit',
  headerActions = null,
  onDownload = null,
  downloadLabel = '',
  secondaryResultAction = null,
  hasNoResultPreview = false,
  uploadIcon = null,
  uploadTitle = null,
  uploadSubtitle = null,
  renderResultPlayer = null,
  renderLoader = null,
}) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const [viewOriginal, setViewOriginal] = useState(false);
  const replaceInputRef = useRef(null);

  const { originalUrl, resultUrl } = useImageToolPreviewUrls(file, resultBlob);

  const hasResult = Boolean(resultBlob) || Boolean(resultUrl);
  const isViewingOriginal = !hasResult || viewOriginal;
  const statusLabel = isViewingOriginal ? mergedLabels.previewLabel : mergedLabels.resultLabel;
  const canCompare = showCompareToggle && hasResult && !hasNoResultPreview;

  const handleReplaceChange = (event) => {
    const picked = event.target.files;
    if (picked?.length) onFiles(Array.from(picked));
    resetFileInput(event);
  };

  const renderPlayer = () => {
    if (hasNoResultPreview && !isViewingOriginal) return null;

    const src = isViewingOriginal ? originalUrl : resultUrl;
    if (!src) return null;

    if (!isViewingOriginal && renderResultPlayer) {
      return renderResultPlayer({ src, disabled: isProcessing });
    }

    return <AudioPreviewPlayer src={src} disabled={isProcessing && isViewingOriginal} />;
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
            onClearFile={onClearFile}
            headerActions={headerActions}
            accept={accept}
          />

          <PreviewPanelCanvas
            statusLabel={statusLabel}
            isProcessing={isProcessing}
            processingLabel={mergedLabels.processingLabel}
            isLoading={Boolean(file && !originalUrl && !resultUrl)}
            renderLoader={renderLoader}
          >
            {renderPlayer()}
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

AudioPreviewPanel.propTypes = {
  file: PropTypes.object,
  resultBlob: PropTypes.instanceOf(Blob),
  isProcessing: PropTypes.bool,
  onFiles: PropTypes.func.isRequired,
  onClearFile: PropTypes.func.isRequired,
  labels: PropTypes.object,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  showCompareToggle: PropTypes.bool,
  minHeightClass: PropTypes.string,
  headerActions: PropTypes.node,
  onDownload: PropTypes.func,
  downloadLabel: PropTypes.string,
  secondaryResultAction: PropTypes.node,
  hasNoResultPreview: PropTypes.bool,
  uploadIcon: PropTypes.elementType,
  uploadTitle: PropTypes.node,
  uploadSubtitle: PropTypes.node,
  renderResultPlayer: PropTypes.func,
  renderLoader: PropTypes.func,
};
