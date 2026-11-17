import {
  PIXELATE_IMAGE_COPY,
  PIXELATE_IMAGE_OUTPUT,
  PIXELATE_IMAGE_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/pixelateImage/pixelateImageConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export function getPixelateImagePreviewLabels() {
  return buildToolPreviewLabels(PIXELATE_IMAGE_COPY, PIXELATE_IMAGE_PREVIEW_LABEL_KEYS);
}

export function validateImageFile(file) {
  if (!file) return PIXELATE_IMAGE_COPY.noFileError;
  if (!file.type.startsWith('image/')) return PIXELATE_IMAGE_COPY.invalidFileError;
  return null;
}

export function getPixelateDownloadFilename(filename) {
  return `${PIXELATE_IMAGE_OUTPUT.prefix}-${filename}`;
}
