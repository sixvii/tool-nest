import { useState } from 'react';
import { blurBackground } from '../../../services/imageService';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import {
  BLUR_BACKGROUND_COPY,
  BLUR_BACKGROUND_DEFAULTS,
} from '../../../constants/image/blurBackground/blurBackgroundConstants';
import {
  getBlurBackgroundPreviewLabels,
  getBlurDownloadFilename,
} from '../../../utils/image/blurBackground/blurBackgroundUtils';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelRangeSlider from '../../../components/toolOptions/OptionsPanelRangeSlider';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function BlurBackground() {
  const [file, setFile] = useState(null);
  const [radius, setRadius] = useState(BLUR_BACKGROUND_DEFAULTS.radius);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, radius, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (typeof s.radius === 'number') setRadius(s.radius);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (!nextFile) return;

    if (!nextFile.type.startsWith('image/')) {
      setError(BLUR_BACKGROUND_COPY.invalidFileError);
      return;
    }

    try {
      validateFile(nextFile, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(err.message);
      return;
    }

    setError('');
    setRadius(BLUR_BACKGROUND_DEFAULTS.radius);
    setFile(nextFile);
    setResultBlob(null);
  };

  const handleClearImage = () => {
    setFile(null);
    setResultBlob(null);
    setRadius(BLUR_BACKGROUND_DEFAULTS.radius);
    setError('');
  };

  const handleRadiusChange = (nextRadius) => {
    setRadius(nextRadius);
    setResultBlob(null);
  };

  const handleApply = async () => {
    if (!file) {
      setError(BLUR_BACKGROUND_COPY.noFileError);
      return;
    }

    setError('');

    if (radius === 0) {
      setResultBlob(file);
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await blurBackground(file, radius);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getBlurDownloadFilename(file.name));
  };

  return (
    <ImageToolPage
      title={BLUR_BACKGROUND_COPY.title}
      subtitle={BLUR_BACKGROUND_COPY.subtitle}
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
            labels={getBlurBackgroundPreviewLabels()}
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
            applyLabel={BLUR_BACKGROUND_COPY.applyButton}
            applyingLabel={BLUR_BACKGROUND_COPY.applyingButton}
            downloadLabel={BLUR_BACKGROUND_COPY.downloadButton}
            completeMessage={BLUR_BACKGROUND_COPY.completeMessage}
            description={BLUR_BACKGROUND_COPY.subtitle}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelRangeSlider
              id="blur-radius-slider"
              label={BLUR_BACKGROUND_COPY.radiusLabel}
              value={radius}
              min={BLUR_BACKGROUND_DEFAULTS.radiusMin}
              max={BLUR_BACKGROUND_DEFAULTS.radiusMax}
              minLabel={BLUR_BACKGROUND_COPY.radiusMin}
              maxLabel={BLUR_BACKGROUND_COPY.radiusMax}
              onChange={handleRadiusChange}
              disabled={isProcessing}
            />
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
