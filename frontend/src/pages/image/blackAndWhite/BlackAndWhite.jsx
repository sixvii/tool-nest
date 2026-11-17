import { useState } from 'react';
import { BLACK_AND_WHITE_COPY } from '../../../constants/image/blackAndWhite/blackAndWhiteConstants';
import { blackAndWhiteImage } from '../../../services/imageService';
import {
  getBlackAndWhiteDownloadFilename,
  getBlackAndWhitePreviewLabels,
} from '../../../utils/image/blackAndWhite/blackAndWhiteUtils';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function BlackAndWhite() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
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
  };

  const handleConvert = async () => {
    if (!file) {
      setError(BLACK_AND_WHITE_COPY.noFileError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await blackAndWhiteImage(file);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getBlackAndWhiteDownloadFilename(file.name));
  };

  return (
    <ImageToolPage
      title={BLACK_AND_WHITE_COPY.title}
      subtitle={BLACK_AND_WHITE_COPY.subtitle}
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
            labels={getBlackAndWhitePreviewLabels()}
            showCompareToggle
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          />
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={BLACK_AND_WHITE_COPY.convertButton}
            applyingLabel={BLACK_AND_WHITE_COPY.convertingButton}
            downloadLabel={BLACK_AND_WHITE_COPY.downloadButton}
            completeMessage={BLACK_AND_WHITE_COPY.completeMessage}
            description={BLACK_AND_WHITE_COPY.subtitle}
            onApply={handleConvert}
            onDownload={handleDownload}
            showDownload
          />
        }
      />
    </ImageToolPage>
  );
}
