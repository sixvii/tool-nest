import {
  IMAGE_COMPRESSOR_COPY,
  IMAGE_COMPRESSOR_DEFAULTS,
  IMAGE_COMPRESSOR_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/imageCompressor/imageCompressorConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';
import { formatFileSize } from '../imageFileUtils';
import { buildDerivedFilename } from '../../fileUtils';

export function getImageCompressorPreviewLabels() {
  return buildToolPreviewLabels(IMAGE_COMPRESSOR_COPY, IMAGE_COMPRESSOR_PREVIEW_LABEL_KEYS);
}

export function getCompressionStats(originalSize, compressedSize) {
  const savedPercent =
    originalSize > 0 && compressedSize > 0
      ? Math.round((1 - compressedSize / originalSize) * 100)
      : null;

  return {
    originalLabel: formatFileSize(originalSize),
    compressedLabel: formatFileSize(compressedSize),
    savedPercent,
    savedBadge:
      savedPercent !== null && savedPercent > 0
        ? IMAGE_COMPRESSOR_COPY.smallerBadge(savedPercent)
        : IMAGE_COMPRESSOR_COPY.noReductionBadge,
    showSavedBadge: savedPercent !== null,
  };
}

export function getImageCompressorDownloadFilename(filename) {
  return buildDerivedFilename(filename, {
    suffix: IMAGE_COMPRESSOR_DEFAULTS.outputSuffix,
    extension: IMAGE_COMPRESSOR_DEFAULTS.outputExtension,
  });
}
