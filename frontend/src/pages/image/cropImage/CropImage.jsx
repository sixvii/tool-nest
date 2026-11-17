import { useEffect, useRef, useState } from 'react';
import {
  CROP_ASPECT_PRESET_IDS,
  CROP_CUSTOM_RATIO_DEFAULT,
} from '../../../constants/image/cropImage/cropAspectRatioConstants';
import { CROP_IMAGE_COPY } from '../../../constants/image/cropImage/cropImageConstants';
import { cropImage } from '../../../services/imageService';
import {
  applyAspectPresetToCrop,
  createDefaultRectCrop,
  EMPTY_RECT_CROP,
  getAspectRatioFromPreset,
  getCropDownloadFilename,
  loadImageNaturalSize,
  resolveCropConstraints,
  toCropApiParams,
} from '../../../utils/image/cropImage/cropImageUtils';
import { resolveAvailableAspectPresetId } from '../../../utils/image/cropImage/cropAspectRatioUtils';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import CropRectEditor from './components/CropRectEditor';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

const EMPTY_SIZE = { width: 0, height: 0 };

export default function CropImage() {
  const [file, setFile] = useState(null);
  const [naturalSize, setNaturalSize] = useState(EMPTY_SIZE);
  const [crop, setCrop] = useState(EMPTY_RECT_CROP);
  const [aspectPresetId, setAspectPresetId] = useState(CROP_ASPECT_PRESET_IDS.FREEFORM);
  const [customRatio, setCustomRatio] = useState(CROP_CUSTOM_RATIO_DEFAULT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const keepRestoredCropRef = useRef(false);

  useToolPersistence({
    snapshot: { file, naturalSize, crop, aspectPresetId, customRatio, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) {
        keepRestoredCropRef.current = true;
        setFile(s.file);
      }
      if (s.naturalSize) setNaturalSize(s.naturalSize);
      if (s.crop) setCrop(s.crop);
      if (s.aspectPresetId) setAspectPresetId(s.aspectPresetId);
      if (s.customRatio) setCustomRatio(s.customRatio);
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
        setCrop(createDefaultRectCrop(size.width, size.height));
        setAspectPresetId((current) =>
          resolveAvailableAspectPresetId(
            current,
            size.width,
            size.height,
            CROP_ASPECT_PRESET_IDS.FREEFORM
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setNaturalSize(EMPTY_SIZE);
          setCrop(EMPTY_RECT_CROP);
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
    setCrop(EMPTY_RECT_CROP);
    setAspectPresetId(CROP_ASPECT_PRESET_IDS.FREEFORM);
    setCustomRatio(CROP_CUSTOM_RATIO_DEFAULT);
    setResultBlob(null);
    setError('');
  };

  const handleClearImage = () => {
    setFile(null);
    setNaturalSize(EMPTY_SIZE);
    setCrop(EMPTY_RECT_CROP);
    setAspectPresetId(CROP_ASPECT_PRESET_IDS.FREEFORM);
    setCustomRatio(CROP_CUSTOM_RATIO_DEFAULT);
    setResultBlob(null);
    setError('');
  };

  const handleCropChange = (nextCrop) => {
    if (!naturalSize.width) return;
    const aspectRatio = getAspectRatioFromPreset(
      aspectPresetId,
      naturalSize.width,
      naturalSize.height,
      customRatio
    );
    setCrop(resolveCropConstraints(nextCrop, naturalSize.width, naturalSize.height, aspectRatio));
    setResultBlob(null);
  };

  const handleAspectPresetChange = (presetId) => {
    setAspectPresetId(presetId);
    setResultBlob(null);
    if (!naturalSize.width) return;
    setCrop((current) =>
      applyAspectPresetToCrop(current, presetId, naturalSize.width, naturalSize.height, customRatio)
    );
  };

  const handleCustomRatioChange = (nextCustomRatio) => {
    setCustomRatio(nextCustomRatio);
    setResultBlob(null);
    if (!naturalSize.width || aspectPresetId !== CROP_ASPECT_PRESET_IDS.CUSTOM) return;
    setCrop((current) =>
      applyAspectPresetToCrop(
        current,
        CROP_ASPECT_PRESET_IDS.CUSTOM,
        naturalSize.width,
        naturalSize.height,
        nextCustomRatio
      )
    );
  };

  const handleCrop = async () => {
    if (!file) {
      setError(CROP_IMAGE_COPY.noFileError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await cropImage(file, toCropApiParams(crop));
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getCropDownloadFilename(file.name));
  };

  return (
    <ImageToolPage title={CROP_IMAGE_COPY.title} subtitle={CROP_IMAGE_COPY.subtitle} error={error}>
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
            labels={{ uploadLabel: CROP_IMAGE_COPY.uploadLabel }}
            showCompareToggle
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          >
            {file ? (
              <CropRectEditor
                file={file}
                naturalSize={naturalSize}
                crop={crop}
                aspectPresetId={aspectPresetId}
                customRatio={customRatio}
                onAspectPresetChange={handleAspectPresetChange}
                onCustomRatioChange={handleCustomRatioChange}
                onCropChange={handleCropChange}
              />
            ) : null}
          </ImageToolPreviewPanel>
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={CROP_IMAGE_COPY.cropButton}
            applyingLabel={CROP_IMAGE_COPY.croppingButton}
            downloadLabel={CROP_IMAGE_COPY.downloadButton}
            description={CROP_IMAGE_COPY.subtitle}
            onApply={handleCrop}
            onDownload={handleDownload}
            showDownload
          />
        }
      />
    </ImageToolPage>
  );
}
