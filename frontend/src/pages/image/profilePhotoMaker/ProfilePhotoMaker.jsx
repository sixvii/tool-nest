import { useEffect, useRef, useState } from 'react';
import {
  PROFILE_PHOTO_DEFAULTS,
  PROFILE_PHOTO_MAKER_COPY,
} from '../../../constants/image/profilePhotoMaker/profilePhotoMakerConstants';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import {
  clampCircleCrop,
  createDefaultCircleCrop,
  loadImageNaturalSize,
} from '../../../utils/image/circleCropUtils';
import {
  clampSquareCrop,
  createDefaultSquareCrop,
  cropCircleProfilePhoto,
  cropSquareFromImage,
} from '../../../utils/image/profilePhotoMaker/profilePhotoMakerUtils';
import {
  getProfilePhotoDownloadFilename,
  getProfilePhotoPreviewLabels,
} from '../../../utils/image/profilePhotoMaker/profilePhotoMakerPageUtils';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../../components/toolOptions/OptionsPanelSection';
import CircleCropEditor from '../roundImage/components/CircleCropEditor';
import SquareCropEditor from './components/SquareCropEditor';
import ProfilePhotoShapeGrid from './components/ProfilePhotoShapeGrid';
import ProfilePhotoSizeGrid from './components/ProfilePhotoSizeGrid';
import ProfilePhotoBgColorPicker from './components/ProfilePhotoBgColorPicker';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

const EMPTY_SIZE = { width: 0, height: 0 };
const EMPTY_CROP = { centerX: 0, centerY: 0, radius: 0 };
const EMPTY_SQUARE_CROP = { x: 0, y: 0, size: 0 };

export default function ProfilePhotoMaker() {
  const [file, setFile] = useState(null);
  const [naturalSize, setNaturalSize] = useState(EMPTY_SIZE);
  const [crop, setCrop] = useState(EMPTY_CROP);
  const [squareCrop, setSquareCrop] = useState(EMPTY_SQUARE_CROP);
  const [shape, setShape] = useState(PROFILE_PHOTO_DEFAULTS.shape);
  const [outputSize, setOutputSize] = useState(PROFILE_PHOTO_DEFAULTS.outputSize);
  const [bgColor, setBgColor] = useState(PROFILE_PHOTO_DEFAULTS.bgColor);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  // When true, the next image-load effect keeps the restored crop instead of
  // resetting it to a default (used after restoring a persisted session).
  const keepRestoredCropRef = useRef(false);

  useToolPersistence({
    snapshot: { file, shape, outputSize, bgColor, naturalSize, crop, squareCrop, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) {
        keepRestoredCropRef.current = true;
        setFile(s.file);
      }
      if (s.shape) setShape(s.shape);
      if (typeof s.outputSize === 'number') setOutputSize(s.outputSize);
      if (typeof s.bgColor === 'string') setBgColor(s.bgColor);
      if (s.naturalSize) setNaturalSize(s.naturalSize);
      if (s.crop) setCrop(s.crop);
      if (s.squareCrop) setSquareCrop(s.squareCrop);
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
        setSquareCrop(createDefaultSquareCrop(size.width, size.height));
      })
      .catch(() => {
        if (!cancelled) {
          setNaturalSize(EMPTY_SIZE);
          setCrop(EMPTY_CROP);
          setSquareCrop(EMPTY_SQUARE_CROP);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const clearResult = () => setResultBlob(null);

  const resetCropState = () => {
    setNaturalSize(EMPTY_SIZE);
    setCrop(EMPTY_CROP);
    setSquareCrop(EMPTY_SQUARE_CROP);
  };

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
    resetCropState();
    setBgColor(PROFILE_PHOTO_DEFAULTS.bgColor);
    setOutputSize(PROFILE_PHOTO_DEFAULTS.outputSize);
    clearResult();
    setError('');
  };

  const handleClearImage = () => {
    setFile(null);
    resetCropState();
    setShape(PROFILE_PHOTO_DEFAULTS.shape);
    setBgColor(PROFILE_PHOTO_DEFAULTS.bgColor);
    setOutputSize(PROFILE_PHOTO_DEFAULTS.outputSize);
    clearResult();
    setError('');
  };

  const handleShapeChange = (nextShape) => {
    setShape(nextShape);
    setBgColor(PROFILE_PHOTO_DEFAULTS.bgColor);
    clearResult();
    setError('');
  };

  const handleOutputSizeChange = (nextSize) => {
    setOutputSize(nextSize);
    clearResult();
  };

  const handleBgColorChange = (nextColor) => {
    setBgColor(nextColor);
    clearResult();
  };

  const handleCropChange = (nextCrop) => {
    if (!naturalSize.width) return;
    setCrop(clampCircleCrop(nextCrop, naturalSize.width, naturalSize.height));
    clearResult();
  };

  const handleSquareCropChange = (nextCrop) => {
    if (!naturalSize.width) return;
    setSquareCrop(clampSquareCrop(nextCrop, naturalSize.width, naturalSize.height));
    clearResult();
  };

  const handleApply = async () => {
    if (!file) {
      setError(PROFILE_PHOTO_MAKER_COPY.noFileError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob =
        shape === 'circle'
          ? await cropCircleProfilePhoto(file, crop, bgColor, outputSize)
          : await cropSquareFromImage(file, squareCrop, bgColor, outputSize);

      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getProfilePhotoDownloadFilename(file.name, shape, outputSize));
  };

  const renderCropEditor = () => {
    if (!file) return null;

    if (shape === 'circle') {
      return (
        <CircleCropEditor
          file={file}
          naturalSize={naturalSize}
          crop={crop}
          onCropChange={handleCropChange}
        />
      );
    }

    return (
      <SquareCropEditor
        file={file}
        naturalSize={naturalSize}
        crop={squareCrop}
        onCropChange={handleSquareCropChange}
      />
    );
  };

  return (
    <ImageToolPage
      title={PROFILE_PHOTO_MAKER_COPY.title}
      subtitle={PROFILE_PHOTO_MAKER_COPY.subtitle}
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
            labels={getProfilePhotoPreviewLabels()}
            showCompareToggle
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          >
            {renderCropEditor()}
          </ImageToolPreviewPanel>
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={PROFILE_PHOTO_MAKER_COPY.applyButton}
            applyingLabel={PROFILE_PHOTO_MAKER_COPY.applyingButton}
            downloadLabel={PROFILE_PHOTO_MAKER_COPY.downloadButton}
            completeMessage={PROFILE_PHOTO_MAKER_COPY.completeMessage}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelSection
              title={PROFILE_PHOTO_MAKER_COPY.shapeHeading}
              hint={PROFILE_PHOTO_MAKER_COPY.shapeHint}
            >
              <ProfilePhotoShapeGrid
                shape={shape}
                isProcessing={isProcessing}
                onChange={handleShapeChange}
              />
            </OptionsPanelSection>

            <OptionsPanelSection
              title={PROFILE_PHOTO_MAKER_COPY.outputSizeHeading}
              hint={PROFILE_PHOTO_MAKER_COPY.outputSizeHint}
            >
              <ProfilePhotoSizeGrid
                outputSize={outputSize}
                isProcessing={isProcessing}
                onChange={handleOutputSizeChange}
              />
            </OptionsPanelSection>

            <OptionsPanelSection
              title={PROFILE_PHOTO_MAKER_COPY.backgroundHeading}
              hint={PROFILE_PHOTO_MAKER_COPY.backgroundHint}
            >
              <ProfilePhotoBgColorPicker
                bgColor={bgColor}
                isProcessing={isProcessing}
                onChange={handleBgColorChange}
              />
            </OptionsPanelSection>
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
