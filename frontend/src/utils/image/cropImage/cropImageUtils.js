import {
  CROP_DEFAULT_RATIO,
  CROP_DRAG_MODES,
  CROP_IMAGE_OUTPUT,
} from '../../../constants/image/cropImage/cropImageConstants';
import { CROP_ASPECT_PRESET_MAP } from '../../../constants/image/cropImage/cropAspectRatioConstants';
import { buildDerivedFilename } from '../../fileUtils';
import {
  getImageDisplayLayout,
  getNaturalPointerFromEvent,
  loadImageNaturalSize,
} from '../circleCropUtils';

export { getImageDisplayLayout, getNaturalPointerFromEvent, loadImageNaturalSize };

export const CROP_RECT_MIN_SIZE = 32;
export const CROP_HANDLE_SIZE = 14;

export const EMPTY_RECT_CROP = { x: 0, y: 0, width: 0, height: 0 };

const CROP_POINTER_UPDATERS = {
  [CROP_DRAG_MODES.MOVE]: (startCrop, pointerDelta, scale) => ({
    x: startCrop.x + pointerDelta.x / scale,
    y: startCrop.y + pointerDelta.y / scale,
    width: startCrop.width,
    height: startCrop.height,
  }),
  [CROP_DRAG_MODES.RESIZE]: (startCrop, _pointerDelta, _scale, pointerNatural) => ({
    x: startCrop.x,
    y: startCrop.y,
    width: Math.max(CROP_RECT_MIN_SIZE, pointerNatural.x - startCrop.x),
    height: Math.max(CROP_RECT_MIN_SIZE, pointerNatural.y - startCrop.y),
  }),
};

const RATIO_KIND_RESOLVERS = {
  freeform: () => null,
  original: (_preset, imageWidth, imageHeight) =>
    imageHeight > 0 ? imageWidth / imageHeight : null,
  custom: (_preset, _imageWidth, _imageHeight, customRatio = { x: 1, y: 1 }) => {
    const y = customRatio.y > 0 ? customRatio.y : 1;
    const x = customRatio.x > 0 ? customRatio.x : 1;
    return x / y;
  },
};

export function getAspectRatioFromPreset(
  presetId,
  imageWidth = 0,
  imageHeight = 0,
  customRatio = { x: 1, y: 1 }
) {
  const preset = CROP_ASPECT_PRESET_MAP[presetId];
  if (!preset) return null;

  if (preset.ratioKind) {
    const resolver = RATIO_KIND_RESOLVERS[preset.ratioKind];
    return resolver ? resolver(preset, imageWidth, imageHeight, customRatio) : null;
  }

  return preset.ratio ?? null;
}

export function isAspectRatioLocked(presetId) {
  const preset = CROP_ASPECT_PRESET_MAP[presetId];
  return preset?.ratioKind !== 'freeform';
}

export function getOriginalAspectCrop(imageWidth, imageHeight) {
  return clampRectCrop(
    { x: 0, y: 0, width: imageWidth, height: imageHeight },
    imageWidth,
    imageHeight
  );
}

export function createDefaultRectCrop(imageWidth, imageHeight) {
  const width = Math.round(imageWidth * CROP_DEFAULT_RATIO);
  const height = Math.round(imageHeight * CROP_DEFAULT_RATIO);
  return clampRectCrop(
    {
      x: Math.round((imageWidth - width) / 2),
      y: Math.round((imageHeight - height) / 2),
      width,
      height,
    },
    imageWidth,
    imageHeight
  );
}

export function createMaxFitRectCrop(aspectRatio, imageWidth, imageHeight) {
  const maxWidth = imageWidth / imageHeight >= aspectRatio ? imageHeight * aspectRatio : imageWidth;
  const maxHeight =
    imageWidth / imageHeight >= aspectRatio ? imageHeight : imageWidth / aspectRatio;

  const width = maxWidth * CROP_DEFAULT_RATIO;
  const height = maxHeight * CROP_DEFAULT_RATIO;

  return clampRectCropWithAspect(
    {
      x: (imageWidth - width) / 2,
      y: (imageHeight - height) / 2,
      width,
      height,
    },
    aspectRatio,
    imageWidth,
    imageHeight
  );
}

export function fitCropToAspectRatio(crop, aspectRatio, imageWidth, imageHeight) {
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const area = Math.max(crop.width * crop.height, CROP_RECT_MIN_SIZE * CROP_RECT_MIN_SIZE);

  let width = Math.sqrt(area * aspectRatio);
  let height = width / aspectRatio;

  if (width > imageWidth) {
    width = imageWidth;
    height = width / aspectRatio;
  }
  if (height > imageHeight) {
    height = imageHeight;
    width = height * aspectRatio;
  }

  return clampRectCropWithAspect(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    aspectRatio,
    imageWidth,
    imageHeight
  );
}

export function clampRectCrop(crop, imageWidth, imageHeight) {
  const width = Math.min(Math.max(CROP_RECT_MIN_SIZE, crop.width), imageWidth);
  const height = Math.min(Math.max(CROP_RECT_MIN_SIZE, crop.height), imageHeight);
  const x = Math.min(Math.max(0, crop.x), imageWidth - width);
  const y = Math.min(Math.max(0, crop.y), imageHeight - height);

  return { x, y, width, height };
}

export function clampRectCropWithAspect(crop, aspectRatio, imageWidth, imageHeight) {
  const maxWidth = Math.min(imageWidth, imageHeight * aspectRatio);
  const maxHeight = Math.min(imageHeight, imageWidth / aspectRatio);

  let width = Math.max(CROP_RECT_MIN_SIZE, Math.min(crop.width, maxWidth));
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = Math.max(CROP_RECT_MIN_SIZE, Math.min(maxHeight, crop.height));
    width = height * aspectRatio;
  }

  const x = Math.min(Math.max(0, crop.x), imageWidth - width);
  const y = Math.min(Math.max(0, crop.y), imageHeight - height);

  return { x, y, width, height };
}

export function resolveCropConstraints(crop, imageWidth, imageHeight, aspectRatio) {
  return aspectRatio != null
    ? clampRectCropWithAspect(crop, aspectRatio, imageWidth, imageHeight)
    : clampRectCrop(crop, imageWidth, imageHeight);
}

function resizeCropWithAspect(startCrop, pointerNatural, aspectRatio) {
  const rawWidth = Math.max(CROP_RECT_MIN_SIZE, pointerNatural.x - startCrop.x);
  const rawHeight = Math.max(CROP_RECT_MIN_SIZE, pointerNatural.y - startCrop.y);
  const widthFromWidth = rawWidth;
  const heightFromWidth = widthFromWidth / aspectRatio;
  const heightFromHeight = rawHeight;
  const widthFromHeight = heightFromHeight * aspectRatio;

  const useWidthAxis = rawWidth / aspectRatio >= rawHeight;
  const width = useWidthAxis ? widthFromWidth : widthFromHeight;
  const height = useWidthAxis ? heightFromWidth : heightFromHeight;

  return {
    x: startCrop.x,
    y: startCrop.y,
    width,
    height,
  };
}

export function rectCropToDisplay(crop, scale) {
  return {
    x: crop.x * scale,
    y: crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  };
}

export function getPointerRectCropUpdate(
  mode,
  startCrop,
  pointerDelta,
  scale,
  pointerNatural,
  aspectRatio = null
) {
  if (mode === CROP_DRAG_MODES.RESIZE && aspectRatio != null) {
    return resizeCropWithAspect(startCrop, pointerNatural, aspectRatio);
  }

  const updater = CROP_POINTER_UPDATERS[mode];
  return updater ? updater(startCrop, pointerDelta, scale, pointerNatural) : startCrop;
}

export function getCropDownloadFilename(filename) {
  const extension = filename.match(/\.[^/.]+$/)?.[0]?.slice(1) ?? 'png';
  return buildDerivedFilename(filename, {
    suffix: CROP_IMAGE_OUTPUT.suffix,
    extension,
  });
}

export function getResizeHandlePosition(displayCrop, handleSize) {
  return {
    left: displayCrop.x + displayCrop.width - handleSize / 2,
    top: displayCrop.y + displayCrop.height - handleSize / 2,
  };
}

export function toCropApiParams(crop) {
  return {
    x: Math.round(crop.x),
    y: Math.round(crop.y),
    width: Math.round(crop.width),
    height: Math.round(crop.height),
  };
}

export function applyAspectPresetToCrop(
  crop,
  presetId,
  imageWidth,
  imageHeight,
  customRatio = { x: 1, y: 1 }
) {
  const preset = CROP_ASPECT_PRESET_MAP[presetId];
  if (!preset || preset.ratioKind === 'freeform') {
    return clampRectCrop(crop, imageWidth, imageHeight);
  }

  if (preset.ratioKind === 'original') {
    return getOriginalAspectCrop(imageWidth, imageHeight);
  }

  const aspectRatio = getAspectRatioFromPreset(presetId, imageWidth, imageHeight, customRatio);
  if (aspectRatio == null) {
    return clampRectCrop(crop, imageWidth, imageHeight);
  }

  const hasCrop = crop.width > 0 && crop.height > 0;
  return hasCrop
    ? fitCropToAspectRatio(crop, aspectRatio, imageWidth, imageHeight)
    : createMaxFitRectCrop(aspectRatio, imageWidth, imageHeight);
}
