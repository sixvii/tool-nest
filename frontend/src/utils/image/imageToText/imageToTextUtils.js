import {
  IMAGE_TO_TEXT_COPY,
  IMAGE_TO_TEXT_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/imageToText/imageToTextConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export function getImageToTextPreviewLabels() {
  return buildToolPreviewLabels(IMAGE_TO_TEXT_COPY, IMAGE_TO_TEXT_PREVIEW_LABEL_KEYS);
}
