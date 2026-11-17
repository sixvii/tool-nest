import { useState } from 'react';
import { pixelateImage } from '../../../services/pixelateImageService';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import {
  PIXELATE_IMAGE_COPY,
  PIXEL_SIZE_DEFAULT,
  PIXEL_SIZE_MIN,
  PIXEL_SIZE_MAX,
} from '../../../constants/image/pixelateImage/pixelateImageConstants';
import {
  getPixelateDownloadFilename,
  getPixelateImagePreviewLabels,
  validateImageFile,
} from '../../../utils/image/pixelateImage/pixelateImagePageUtils';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelRangeSlider from '../../../components/toolOptions/OptionsPanelRangeSlider';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function PixelateImage() {
  const [file, setFile] = useState(null);
  const [pixelSize, setPixelSize] = useState(PIXEL_SIZE_DEFAULT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, pixelSize, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (typeof s.pixelSize === 'number') setPixelSize(s.pixelSize);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (!nextFile) return;

    const validationError = validateImageFile(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      validateFile(nextFile, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(err.message);
      return;
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

  const handlePixelSizeChange = (nextSize) => {
    setPixelSize(nextSize);
    setResultBlob(null);
  };

  const handleApply = async () => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await pixelateImage(file, pixelSize);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getPixelateDownloadFilename(file.name));
  };

  return (
    <ImageToolPage
      title={PIXELATE_IMAGE_COPY.title}
      subtitle={PIXELATE_IMAGE_COPY.subtitle}
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
            labels={getPixelateImagePreviewLabels()}
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
            applyLabel={PIXELATE_IMAGE_COPY.applyButton}
            applyingLabel={PIXELATE_IMAGE_COPY.applyingButton}
            downloadLabel={PIXELATE_IMAGE_COPY.downloadButton}
            completeMessage={PIXELATE_IMAGE_COPY.completeMessage}
            description={PIXELATE_IMAGE_COPY.subtitle}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelRangeSlider
              id="pixel-size"
              label={PIXELATE_IMAGE_COPY.intensityLabel}
              value={pixelSize}
              min={PIXEL_SIZE_MIN}
              max={PIXEL_SIZE_MAX}
              labelClassName="text-xs font-bold text-slate-400 uppercase"
              valueClassName="text-xs font-bold text-blue-600"
              minLabel={PIXELATE_IMAGE_COPY.intensityLow(PIXEL_SIZE_MIN)}
              maxLabel={PIXELATE_IMAGE_COPY.intensityHigh(PIXEL_SIZE_MAX)}
              onChange={handlePixelSizeChange}
            />
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
