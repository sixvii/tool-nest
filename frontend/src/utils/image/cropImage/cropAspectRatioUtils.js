import { CROP_ASPECT_PRESETS } from '../../../constants/image/cropImage/cropAspectRatioConstants';
import { CROP_RECT_MIN_SIZE } from './cropImageUtils';

const BASE_PRESET_KINDS = new Set(['freeform', 'original', 'custom']);

export function getMaxFitCropSize(aspectRatio, imageWidth, imageHeight) {
  const maxWidth = Math.min(imageWidth, imageHeight * aspectRatio);
  const maxHeight = Math.min(imageHeight, imageWidth / aspectRatio);
  return { width: maxWidth, height: maxHeight };
}

export function canFitAspectPreset(preset, imageWidth, imageHeight, minSize = CROP_RECT_MIN_SIZE) {
  if (preset.ratioKind && BASE_PRESET_KINDS.has(preset.ratioKind)) {
    return true;
  }

  if (!imageWidth || !imageHeight || preset.ratio == null) {
    return false;
  }

  const { width, height } = getMaxFitCropSize(preset.ratio, imageWidth, imageHeight);
  return width >= minSize && height >= minSize;
}

export function getAvailableAspectPresets(imageWidth, imageHeight) {
  if (!imageWidth || !imageHeight) {
    return [];
  }

  return CROP_ASPECT_PRESETS.filter((preset) =>
    canFitAspectPreset(preset, imageWidth, imageHeight)
  );
}

export function getAvailableAspectPresetOptions(imageWidth, imageHeight) {
  return getAvailableAspectPresets(imageWidth, imageHeight).map(({ id, label }) => ({
    value: id,
    label,
  }));
}

export function isAspectPresetAvailable(presetId, imageWidth, imageHeight) {
  return getAvailableAspectPresets(imageWidth, imageHeight).some(
    (preset) => preset.id === presetId
  );
}

export function resolveAvailableAspectPresetId(presetId, imageWidth, imageHeight, fallbackId) {
  return isAspectPresetAvailable(presetId, imageWidth, imageHeight) ? presetId : fallbackId;
}
