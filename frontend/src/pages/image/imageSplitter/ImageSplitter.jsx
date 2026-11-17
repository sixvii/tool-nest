import { useState } from 'react';
import { splitImage } from '../../../services/imageService';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import {
  IMAGE_SPLITTER_COPY,
  IMAGE_SPLITTER_DEFAULTS,
} from '../../../constants/image/imageSplitter/imageSplitterConstants';
import {
  getImageSplitterDownloadFilename,
  getImageSplitterPreviewLabels,
  getSplitPieceCount,
  isValidGrid,
} from '../../../utils/image/imageSplitter/imageSplitterUtils';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../../components/toolOptions/OptionsPanelSection';
import { Grid3x3 } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function ImageSplitter() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(IMAGE_SPLITTER_DEFAULTS.rows);
  const [cols, setCols] = useState(IMAGE_SPLITTER_DEFAULTS.cols);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, rows, cols, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (s.rows != null) setRows(s.rows);
      if (s.cols != null) setCols(s.cols);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      try {
        validateFile(nextFile, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFile(nextFile);
    setResultBlob(null);
    setError('');
  };

  const handleClearImage = () => {
    setFile(null);
    setResultBlob(null);
    setError('');
    setRows(IMAGE_SPLITTER_DEFAULTS.rows);
    setCols(IMAGE_SPLITTER_DEFAULTS.cols);
  };

  const handleGridChange = (setter) => (value) => {
    setter(value);
    setResultBlob(null);
  };

  const handleSplit = async () => {
    if (!file) {
      setError(IMAGE_SPLITTER_COPY.noFileError);
      return;
    }
    if (!isValidGrid(rows, cols, IMAGE_SPLITTER_DEFAULTS.minGrid)) {
      setError(IMAGE_SPLITTER_COPY.invalidGridError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await splitImage(file, Number(rows), Number(cols));
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getImageSplitterDownloadFilename(file.name, rows, cols));
  };

  const pieceCount = getSplitPieceCount(rows, cols);

  return (
    <ImageToolPage
      title={IMAGE_SPLITTER_COPY.title}
      subtitle={IMAGE_SPLITTER_COPY.subtitle}
      error={error}
    >
      <ImageToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <ImageToolPreviewPanel
            file={file}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearImage={handleClearImage}
            labels={getImageSplitterPreviewLabels()}
            showCompareToggle={false}
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          />
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            canApply={pieceCount > 0}
            hasResult={!!resultBlob}
            applyLabel={IMAGE_SPLITTER_COPY.splitButton(pieceCount)}
            applyingLabel={IMAGE_SPLITTER_COPY.splittingButton}
            downloadLabel={IMAGE_SPLITTER_COPY.downloadButton}
            completeMessage={
              resultBlob ? (
                <span className="flex items-center gap-2 flex-wrap">
                  {IMAGE_SPLITTER_COPY.completeMessage}
                  <Badge variant="success">
                    {rows} × {cols} grid
                  </Badge>
                </span>
              ) : (
                ''
              )
            }
            description={IMAGE_SPLITTER_COPY.subtitle}
            onApply={handleSplit}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelSection
              title={IMAGE_SPLITTER_COPY.gridHeading}
              icon={<Grid3x3 className="w-5 h-5 text-blue-500" />}
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={IMAGE_SPLITTER_COPY.rowsLabel}
                  type="number"
                  min={1}
                  placeholder="e.g. 2"
                  value={rows}
                  onChange={(e) => handleGridChange(setRows)(e.target.value)}
                />
                <Input
                  label={IMAGE_SPLITTER_COPY.colsLabel}
                  type="number"
                  min={1}
                  placeholder="e.g. 2"
                  value={cols}
                  onChange={(e) => handleGridChange(setCols)(e.target.value)}
                />
              </div>
            </OptionsPanelSection>
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
