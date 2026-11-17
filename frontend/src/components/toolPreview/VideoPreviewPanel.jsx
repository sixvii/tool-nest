import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { VideoOff } from 'lucide-react';
import Card from '../ui/Card';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { useImageToolPreviewUrls } from '../../hooks/useBlobPreviewUrl';
import VideoPreviewPlayer from '../VideoPreviewPlayer';
import PreviewPanelUpload from './PreviewPanelUpload';
import PreviewPanelHeader from './PreviewPanelHeader';
import PreviewPanelCanvas from './PreviewPanelCanvas';
import PreviewPanelResultActions from './PreviewPanelResultActions';

const DEFAULT_LABELS = {
  uploadLabel: 'Upload Video',
  previewLabel: 'Preview',
  resultLabel: 'Result',
  beforeLabel: 'Before',
  afterLabel: 'After',
  changeImageButton: 'Change video',
  removeImageAriaLabel: 'Remove video',
  processingLabel: 'Processing...',
  downloadLabel: 'Download',
};

export default function VideoPreviewPanel({
  file = null,
  resultBlob = null,
  isProcessing = false,
  onFiles,
  onClearFile,
  labels = {},
  accept = 'video/*',
  multiple = false,
  showCompareToggle = true,
  minHeightClass = 'min-h-fit',
  headerActions = null,
  onDownload = null,
  downloadLabel = '',
  secondaryResultAction = null,
  videoRef = null,
  duration = null,
  resolution = null,
  onLoadedMetadata = null,
  hasNoResultPreview = false,
  uploadIcon = null,
  uploadTitle = null,
  uploadSubtitle = null,
  renderLoader = null,
  renderResultPlayer = null,
  resultFileName = null,
}) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const [viewOriginal, setViewOriginal] = useState(false);
  const replaceInputRef = useRef(null);
  const internalOriginalRef = useRef(null);
  const internalResultRef = useRef(null);
  const activeOriginalRef = videoRef ?? internalOriginalRef;
  const [originalFailed, setOriginalFailed] = useState(false);
  const [resultFailed, setResultFailed] = useState(false);

  const { originalUrl, resultUrl } = useImageToolPreviewUrls(file, resultBlob);

  const hasResult = Boolean(resultBlob) || Boolean(resultUrl);
  const isViewingOriginal = !hasResult || viewOriginal;
  const statusLabel = isViewingOriginal ? mergedLabels.previewLabel : mergedLabels.resultLabel;
  const displayFileName = isViewingOriginal ? file?.name : (resultFileName ?? file?.name);
  const canCompare = showCompareToggle && hasResult && !hasNoResultPreview;

  useEffect(() => {
    if (!isProcessing) return;
    const activeRef = isViewingOriginal ? activeOriginalRef : internalResultRef;
    activeRef.current?.pause();
  }, [isProcessing, isViewingOriginal, activeOriginalRef]);

  const handleReplaceChange = (event) => {
    const picked = event.target.files;
    if (picked?.length) onFiles(Array.from(picked));
    resetFileInput(event);
  };

  const renderPlayer = () => {
    if (hasNoResultPreview && !isViewingOriginal) return null;

    const src = isViewingOriginal ? originalUrl : resultUrl;
    const failed = isViewingOriginal ? originalFailed : resultFailed;
    const setFailed = isViewingOriginal ? setOriginalFailed : setResultFailed;
    if (!src) return null;

    if (!isViewingOriginal && renderResultPlayer) {
      return renderResultPlayer({ src, disabled: isProcessing });
    }

    if (failed) {
      return (
        <div className="w-full bg-slate-900 rounded-xl p-2">
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
            <VideoOff className="w-8 h-8 text-slate-600" />
            <p className="text-xs">Preview not available for this format</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full min-h-0 bg-slate-900 rounded-xl p-2 overflow-hidden">
        <VideoPreviewPlayer
          src={src}
          videoRef={isViewingOriginal ? activeOriginalRef : internalResultRef}
          videoClassName="w-full h-full"
          containerClassName="h-full min-h-0"
          onLoadedMetadata={isViewingOriginal ? onLoadedMetadata : undefined}
          onError={() => setFailed(true)}
          disabled={isProcessing && isViewingOriginal}
        />
      </div>
    );
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
            statusLabel={
              duration || resolution
                ? `${statusLabel} · ${[resolution, duration].filter(Boolean).join(' · ')}`
                : statusLabel
            }
            fileName={displayFileName}
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

VideoPreviewPanel.propTypes = {
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
  videoRef: PropTypes.object,
  duration: PropTypes.string,
  resolution: PropTypes.string,
  onLoadedMetadata: PropTypes.func,
  hasNoResultPreview: PropTypes.bool,
  uploadIcon: PropTypes.elementType,
  uploadTitle: PropTypes.node,
  uploadSubtitle: PropTypes.node,
  renderLoader: PropTypes.func,
  renderResultPlayer: PropTypes.func,
  resultFileName: PropTypes.string,
};
