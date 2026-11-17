import {
  BLUR_BACKGROUND_COPY,
  BLUR_BACKGROUND_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/blurBackground/blurBackgroundConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export function getBlurBackgroundPreviewLabels() {
  return buildToolPreviewLabels(BLUR_BACKGROUND_COPY, BLUR_BACKGROUND_PREVIEW_LABEL_KEYS);
}

export function getBlurDownloadFilename(filename) {
  return `blur_bg_${filename}`;
}
