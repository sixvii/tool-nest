import {
  IMAGE_SPLITTER_COPY,
  IMAGE_SPLITTER_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/imageSplitter/imageSplitterConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export function getImageSplitterPreviewLabels() {
  return buildToolPreviewLabels(IMAGE_SPLITTER_COPY, IMAGE_SPLITTER_PREVIEW_LABEL_KEYS);
}

export function getSplitPieceCount(rows, cols) {
  const r = Number(rows);
  const c = Number(cols);
  if (!r || !c || r < 1 || c < 1) return 0;
  return r * c;
}

export function isValidGrid(rows, cols, min = 1) {
  const r = Number(rows);
  const c = Number(cols);
  return r >= min && c >= min;
}

export function getImageSplitterDownloadFilename(filename, rows, cols) {
  const base = filename.replace(/\.[^/.]+$/, '');
  return `${base}-split-${rows}x${cols}.zip`;
}
