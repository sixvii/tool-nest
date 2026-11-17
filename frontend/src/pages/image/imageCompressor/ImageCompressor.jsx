import { useState } from 'react';
import { compressImage } from '../../../services/imageService';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import {
  IMAGE_COMPRESSOR_COPY,
  IMAGE_COMPRESSOR_DEFAULTS,
} from '../../../constants/image/imageCompressor/imageCompressorConstants';
import {
  getImageCompressorDownloadFilename,
  getImageCompressorPreviewLabels,
} from '../../../utils/image/imageCompressor/imageCompressorUtils';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../../components/toolOptions/OptionsPanelSection';
import OptionsPanelRangeSlider from '../../../components/toolOptions/OptionsPanelRangeSlider';
import Badge from '../../../components/ui/Badge';
import Heading from '../../../components/ui/Heading';
import ImageCompressorSizeStats from './components/ImageCompressorSizeStats';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function ImageCompressor() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(IMAGE_COMPRESSOR_DEFAULTS.quality);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, quality, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (typeof s.quality === 'number') setQuality(s.quality);
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

  const handleQualityChange = (nextQuality) => {
    setQuality(nextQuality);
    setResultBlob(null);
  };

  const handleCompress = async () => {
    if (!file) {
      setError(IMAGE_COMPRESSOR_COPY.noFileError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await compressImage(file, quality);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getImageCompressorDownloadFilename(file.name));
  };

  return (
    <ImageToolPage
      title={IMAGE_COMPRESSOR_COPY.title}
      subtitle={IMAGE_COMPRESSOR_COPY.subtitle}
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
            labels={getImageCompressorPreviewLabels()}
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
            applyLabel={IMAGE_COMPRESSOR_COPY.compressButton}
            applyingLabel={IMAGE_COMPRESSOR_COPY.compressingButton}
            downloadLabel={IMAGE_COMPRESSOR_COPY.downloadButton}
            completeMessage={IMAGE_COMPRESSOR_COPY.completeMessage}
            description={IMAGE_COMPRESSOR_COPY.subtitle}
            onApply={handleCompress}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelSection>
              <div className="flex items-center justify-between mb-3">
                <Heading as="h4">{IMAGE_COMPRESSOR_COPY.qualityHeading}</Heading>
                <Badge variant="default">{quality}%</Badge>
              </div>
              <OptionsPanelRangeSlider
                value={quality}
                min={IMAGE_COMPRESSOR_DEFAULTS.qualityMin}
                max={IMAGE_COMPRESSOR_DEFAULTS.qualityMax}
                valueSuffix="%"
                minLabel={IMAGE_COMPRESSOR_COPY.qualitySmaller}
                maxLabel={IMAGE_COMPRESSOR_COPY.qualityHigher}
                labelClassName="sr-only"
                valueClassName="sr-only"
                onChange={handleQualityChange}
              />
            </OptionsPanelSection>

            {resultBlob && (
              <ImageCompressorSizeStats
                originalSize={file?.size ?? 0}
                compressedSize={resultBlob.size}
              />
            )}
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
