import { flipImage } from '../../../services/imageService';
import {
  FLIP_APPLY_ORDER,
  FLIP_DOWNLOAD_SUFFIX,
  FLIP_IMAGE_COPY,
  FLIP_IMAGE_OUTPUT,
  FLIP_IMAGE_TIPS,
  FLIP_PREVIEW_LABEL_KEYS,
  FLIP_SELECTION_SUMMARY_MAP,
} from '../../../constants/image/flipImage/flipImageConstants';
import { buildDerivedFilename } from '../../fileUtils';
import { pickPreviewLabelsFromCopy, mergeImageToolPreviewLabels } from '../imageToolPreviewUtils';

export function blobToFile(blob, filename) {
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

export function hasFlipSelection(selection) {
  return FLIP_APPLY_ORDER.some((axis) => selection[axis]);
}

export function getActiveFlipAxes(selection) {
  return FLIP_APPLY_ORDER.filter((axis) => selection[axis]);
}

export function getFlipDownloadSuffix(selection) {
  const key = getActiveFlipAxes(selection).join('-');
  return FLIP_DOWNLOAD_SUFFIX[key] ?? FLIP_IMAGE_OUTPUT.suffix;
}

export function getFlipDownloadFilename(filename, selection) {
  return buildDerivedFilename(filename, {
    suffix: getFlipDownloadSuffix(selection),
    extension: filename.match(/\.[^/.]+$/)?.[0]?.slice(1) ?? 'png',
  });
}

export async function applyImageFlips(file, selection) {
  const axes = getActiveFlipAxes(selection);
  if (!axes.length) {
    throw new Error('Select at least one flip direction.');
  }

  let current = file;
  let result = null;

  for (const axis of axes) {
    result = await flipImage(current, axis);
    current = blobToFile(result, file.name);
  }

  return result;
}

export function getFlipSelectionSummary(selection) {
  const key = getActiveFlipAxes(selection).join('-');
  const config = FLIP_SELECTION_SUMMARY_MAP[key] ?? FLIP_SELECTION_SUMMARY_MAP[''];
  return {
    title: FLIP_IMAGE_COPY[config.titleKey],
    description: FLIP_IMAGE_COPY[config.descriptionKey],
  };
}

export function getFlipPreviewLabels(copy = FLIP_IMAGE_COPY) {
  return mergeImageToolPreviewLabels(pickPreviewLabelsFromCopy(copy, FLIP_PREVIEW_LABEL_KEYS));
}

export function getFlipTips(copy = FLIP_IMAGE_COPY) {
  return FLIP_IMAGE_TIPS.map((key) => copy[key]);
}
