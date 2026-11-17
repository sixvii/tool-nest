import {
  BLACK_AND_WHITE_OUTPUT,
  BLACK_AND_WHITE_COPY,
  BLACK_AND_WHITE_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/blackAndWhite/blackAndWhiteConstants';
import { buildDerivedFilename } from '../../fileUtils';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export function getBlackAndWhitePreviewLabels() {
  return buildToolPreviewLabels(BLACK_AND_WHITE_COPY, BLACK_AND_WHITE_PREVIEW_LABEL_KEYS);
}

export function getBlackAndWhiteDownloadFilename(filename) {
  const extension = filename.match(/\.[^/.]+$/)?.[0]?.slice(1) ?? 'png';
  return buildDerivedFilename(filename, {
    suffix: BLACK_AND_WHITE_OUTPUT.suffix,
    extension,
  });
}
