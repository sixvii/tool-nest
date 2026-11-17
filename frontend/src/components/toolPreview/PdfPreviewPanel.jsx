import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import Card from '../ui/Card';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { detectFileType } from '../../utils/detectFileType';
import { PdfPreview, ImagePreview, FileCard, FileTabs } from './PdfPreviewPrimitives';
import PreviewPanelUpload from './PreviewPanelUpload';
import PreviewPanelHeader from './PreviewPanelHeader';
import PreviewPanelCanvas from './PreviewPanelCanvas';
import PreviewPanelResultActions from './PreviewPanelResultActions';

const DEFAULT_LABELS = {
  uploadLabel: 'Upload PDF',
  previewLabel: 'Preview',
  resultLabel: 'Result',
  beforeLabel: 'Before',
  afterLabel: 'After',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
  processingLabel: 'Processing...',
  downloadLabel: 'Download',
};

function renderByType(activeFile) {
  if (!activeFile) return null;
  const type = detectFileType(activeFile);
  if (type === 'pdf') return <PdfPreview file={activeFile} />;
  if (type === 'image') return <ImagePreview file={activeFile} />;
  return <FileCard file={activeFile} fileType={type} />;
}

function renderPdfWithSelection(
  activeFile,
  { selectedPages, onPageClick, highlightRanges, previewOverlay, overlayPageRange }
) {
  const type = detectFileType(activeFile);
  if (type !== 'pdf') return renderByType(activeFile);
  return (
    <PdfPreview
      file={activeFile}
      selectedPages={selectedPages}
      onPageClick={onPageClick}
      highlightRanges={highlightRanges}
      previewOverlay={previewOverlay}
      overlayPageRange={overlayPageRange}
    />
  );
}

export default function PdfPreviewPanel({
  file = null,
  files = null,
  resultBlob = null,
  isProcessing = false,
  onFiles,
  onClearFile,
  labels = {},
  accept = '.pdf',
  multiple = false,
  showCompareToggle = true,
  minHeightClass = 'min-h-fit',
  headerActions = null,
  onDownload = null,
  downloadLabel = '',
  secondaryResultAction = null,
  uploadIcon = null,
  uploadTitle = null,
  uploadSubtitle = null,
  renderLoader = null,
  selectedPages = null,
  onPageClick = null,
  highlightRanges = null,
  previewOverlay = null,
  overlayPageRange = null,
}) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const [viewOriginal, setViewOriginal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const replaceInputRef = useRef(null);
  const addInputRef = useRef(null);

  const fileList = files?.length ? files : file ? [file] : [];
  const isMulti = fileList.length > 1;
  const primaryFile = fileList[0] ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [fileList.length]);

  const hasResult = Boolean(resultBlob);
  const isViewingOriginal = !hasResult || viewOriginal;
  const statusLabel = isViewingOriginal ? mergedLabels.previewLabel : mergedLabels.resultLabel;
  const canCompare = showCompareToggle && hasResult;

  const handleReplaceChange = (event) => {
    const picked = event.target.files;
    if (picked?.length) onFiles(Array.from(picked));
    resetFileInput(event);
  };

  const handleAddFiles = (event) => {
    const picked = event.target.files;
    if (picked?.length) onFiles([...fileList, ...Array.from(picked)]);
    resetFileInput(event);
  };

  const handleRemoveFile = (index) => {
    const next = fileList.filter((_, i) => i !== index);
    onFiles(next);
  };

  const renderContent = () => {
    if (!isViewingOriginal) return renderByType(resultBlob);
    const activeFile = fileList[activeIndex] ?? primaryFile;
    return renderPdfWithSelection(activeFile, {
      selectedPages,
      onPageClick,
      highlightRanges,
      previewOverlay,
      overlayPageRange,
    });
  };

  return (
    <Card padding="lg" className={`${TOOL_LAYOUT.previewPanel} ${minHeightClass}`.trim()}>
      {!primaryFile ? (
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
              isMulti && isViewingOriginal
                ? `${statusLabel} · ${fileList.length} files`
                : statusLabel
            }
            fileName={
              isViewingOriginal
                ? (fileList[activeIndex]?.name ?? primaryFile.name)
                : primaryFile.name
            }
            labels={mergedLabels}
            isProcessing={isProcessing}
            replaceInputRef={replaceInputRef}
            onReplaceChange={handleReplaceChange}
            onOpenReplace={() => replaceInputRef.current?.click()}
            onClearFile={onClearFile}
            headerActions={
              multiple && isViewingOriginal ? (
                <>
                  <input
                    ref={addInputRef}
                    type="file"
                    accept={accept}
                    multiple
                    className="hidden"
                    onChange={handleAddFiles}
                  />
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => addInputRef.current?.click()}
                    className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add files
                  </button>
                  {headerActions}
                </>
              ) : (
                headerActions
              )
            }
            accept={accept}
          />

          {isMulti && isViewingOriginal && (
            <FileTabs
              files={fileList}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              onRemove={handleRemoveFile}
              disabled={isProcessing}
            />
          )}

          <PreviewPanelCanvas
            statusLabel={statusLabel}
            isProcessing={isProcessing}
            processingLabel={mergedLabels.processingLabel}
            renderLoader={renderLoader}
          >
            {renderContent()}
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

PdfPreviewPanel.propTypes = {
  file: PropTypes.object,
  files: PropTypes.arrayOf(PropTypes.object),
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
  uploadIcon: PropTypes.elementType,
  uploadTitle: PropTypes.node,
  uploadSubtitle: PropTypes.node,
  renderLoader: PropTypes.func,
  selectedPages: PropTypes.instanceOf(Set),
  onPageClick: PropTypes.func,
  highlightRanges: PropTypes.arrayOf(
    PropTypes.shape({ from: PropTypes.number, to: PropTypes.number })
  ),
  previewOverlay: PropTypes.node,
  overlayPageRange: PropTypes.shape({ from: PropTypes.number, to: PropTypes.number }),
};
