export const IMAGE_COMPRESSOR_COPY = {
  title: 'Image Compressor',
  subtitle: 'Reduce image file size while controlling quality',
  uploadLabel: 'Upload Image',
  qualityHeading: 'Quality',
  qualitySmaller: 'Smaller file',
  qualityHigher: 'Higher quality',
  compressButton: 'Compress Image',
  compressingButton: 'Compressing...',
  downloadButton: 'Download',
  completeMessage: 'Image compressed successfully.',
  noFileError: 'Please upload an image first.',
  originalSizeLabel: 'Original',
  compressedSizeLabel: 'Compressed',
  smallerBadge: (percent) => `${percent}% smaller`,
  noReductionBadge: 'No size reduction',
};

export const IMAGE_COMPRESSOR_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  processingLabel: 'compressingButton',
};

export const IMAGE_COMPRESSOR_DEFAULTS = {
  quality: 80,
  qualityMin: 1,
  qualityMax: 100,
  outputSuffix: 'compressed',
  outputExtension: 'jpg',
};
