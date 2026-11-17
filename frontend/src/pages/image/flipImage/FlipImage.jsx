import { useState } from 'react';
import {
  FLIP_DEFAULT_SELECTION,
  FLIP_IMAGE_COPY,
} from '../../../constants/image/flipImage/flipImageConstants';
import {
  applyImageFlips,
  getFlipDownloadFilename,
  getFlipPreviewLabels,
  hasFlipSelection,
} from '../../../utils/image/flipImage/flipImageUtils';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../../components/toolOptions/OptionsPanelSection';
import FlipDirectionGrid from './components/FlipDirectionGrid';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function FlipImage() {
  const [file, setFile] = useState(null);
  const [selection, setSelection] = useState(FLIP_DEFAULT_SELECTION);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const flipSelected = hasFlipSelection(selection);

  useToolPersistence({
    snapshot: { file, selection, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (s.selection) setSelection(s.selection);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const clearResult = () => setResultBlob(null);

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
    clearResult();
    setError('');
  };

  const handleClearImage = () => {
    setFile(null);
    clearResult();
    setError('');
    setSelection(FLIP_DEFAULT_SELECTION);
  };

  const handleToggle = (axis) => {
    setSelection((prev) => ({ ...prev, [axis]: !prev[axis] }));
    clearResult();
  };

  const handleApply = async () => {
    if (!file) {
      setError(FLIP_IMAGE_COPY.noFileError);
      return;
    }
    if (!flipSelected) {
      setError(FLIP_IMAGE_COPY.noDirectionError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await applyImageFlips(file, selection);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file || !flipSelected) return;
    downloadBlob(resultBlob, getFlipDownloadFilename(file.name, selection));
  };

  return (
    <ImageToolPage title={FLIP_IMAGE_COPY.title} subtitle={FLIP_IMAGE_COPY.subtitle} error={error}>
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
            labels={getFlipPreviewLabels()}
            showCompareToggle
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          />
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            canApply={flipSelected}
            hasResult={!!resultBlob}
            applyLabel={FLIP_IMAGE_COPY.applyButton}
            applyingLabel={FLIP_IMAGE_COPY.applyingButton}
            downloadLabel={FLIP_IMAGE_COPY.downloadButton}
            completeMessage={FLIP_IMAGE_COPY.completeMessage}
            description={FLIP_IMAGE_COPY.subtitle}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelSection
              title={FLIP_IMAGE_COPY.directionHeading}
              hint={FLIP_IMAGE_COPY.directionHint}
            >
              <FlipDirectionGrid
                selection={selection}
                isProcessing={isProcessing}
                onToggle={handleToggle}
              />
            </OptionsPanelSection>
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
