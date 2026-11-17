import {
  ADD_BORDER_COPY,
  ADD_BORDER_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/addBorder/addBorderConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export function getAddBorderPreviewLabels() {
  return buildToolPreviewLabels(ADD_BORDER_COPY, ADD_BORDER_PREVIEW_LABEL_KEYS);
}

export function getAddBorderDownloadFilename(filename) {
  const ext = filename.match(/\.[^/.]+$/)?.[0] ?? '.png';
  const base = filename.replace(/\.[^/.]+$/, '');
  return `${base}-bordered${ext}`;
}
