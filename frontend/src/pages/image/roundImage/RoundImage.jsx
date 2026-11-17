import { useEffect, useRef, useState } from 'react';
import {
  ROUND_IMAGE_COPY,
  ROUND_IMAGE_OUTPUT,
} from '../../../constants/image/roundImage/roundImageConstants';
import { buildDerivedFilename, downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import {
  clampCircleCrop,
  createDefaultCircleCrop,
  cropCircleFromImage,
  loadImageNaturalSize,
} from '../../../utils/image/circleCropUtils';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import CircleCropEditor from './components/CircleCropEditor';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

const EMPTY_SIZE = { width: 0, height: 0 };
const EMPTY_CROP = { centerX: 0, centerY: 0, radius: 0 };

export default function RoundImage() {
  const [file, setFile] = useState(null);
  const [naturalSize, setNaturalSize] = useState(EMPTY_SIZE);
  const [crop, setCrop] = useState(EMPTY_CROP);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const keepRestoredCropRef = useRef(false);

  useToolPersistence({
    snapshot: { file, naturalSize, crop, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) {
        keepRestoredCropRef.current = true;
        setFile(s.file);
      }
      if (s.naturalSize) setNaturalSize(s.naturalSize);
      if (s.crop) setCrop(s.crop);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  useEffect(() => {
    if (!file) return undefined;

    let cancelled = false;
    loadImageNaturalSize(file)
      .then((size) => {
        if (cancelled) return;
        setNaturalSize(size);
        if (keepRestoredCropRef.current) {
          keepRestoredCropRef.current = false;
          return;
        }
        setCrop(createDefaultCircleCrop(size.width, size.height));
      })
      .catch(() => {
        if (!cancelled) {
          setNaturalSize(EMPTY_SIZE);
          setCrop(EMPTY_CROP);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

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
    setNaturalSize(EMPTY_SIZE);
    setCrop(EMPTY_CROP);
    setResultBlob(null);
    setError('');
  };

  const handleClearImage = () => {
    setFile(null);
    setNaturalSize(EMPTY_SIZE);
    setCrop(EMPTY_CROP);
    setResultBlob(null);
    setError('');
  };

  const handleCropChange = (nextCrop) => {
    if (!naturalSize.width) return;
    setCrop(clampCircleCrop(nextCrop, naturalSize.width, naturalSize.height));
    setResultBlob(null);
  };

  const handleApply = async () => {
    if (!file) {
      setError(ROUND_IMAGE_COPY.noFileError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await cropCircleFromImage(file, crop);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, buildDerivedFilename(file.name, ROUND_IMAGE_OUTPUT));
  };

  return (
    <ImageToolPage
      title={ROUND_IMAGE_COPY.title}
      subtitle={ROUND_IMAGE_COPY.subtitle}
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
            labels={{ uploadLabel: ROUND_IMAGE_COPY.uploadLabel }}
            showCompareToggle
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          >
            {file ? (
              <CircleCropEditor
                file={file}
                naturalSize={naturalSize}
                crop={crop}
                onCropChange={handleCropChange}
              />
            ) : null}
          </ImageToolPreviewPanel>
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={ROUND_IMAGE_COPY.applyButton}
            applyingLabel={ROUND_IMAGE_COPY.applyingButton}
            downloadLabel={ROUND_IMAGE_COPY.downloadButton}
            description={ROUND_IMAGE_COPY.subtitle}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          />
        }
      />
    </ImageToolPage>
  );
}
