export const PIXELATE_IMAGE_COPY = {
  title: 'Pixelate Image',
  subtitle: 'Upload an image, set pixelation intensity and download the result',
  uploadLabel: 'Upload Image',
  intensityLabel: 'Pixelation Intensity',
  intensityLow: (min) => `Low (${min}px)`,
  intensityHigh: (max) => `High (${max}px)`,
  applyButton: 'Apply Pixelation',
  applyingButton: 'Applying...',
  downloadButton: 'Download',
  completeMessage: 'Pixelation applied successfully.',
  noFileError: 'Please upload an image.',
  invalidFileError: 'Only image files are allowed.',
};

export const PIXELATE_IMAGE_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  processingLabel: 'applyingButton',
};

export const PIXEL_SIZE_MIN = 5;
export const PIXEL_SIZE_MAX = 50;
export const PIXEL_SIZE_DEFAULT = 10;

export const PIXELATE_IMAGE_OUTPUT = {
  prefix: 'pixelated',
};
