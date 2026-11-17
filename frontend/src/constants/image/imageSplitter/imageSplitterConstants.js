export const IMAGE_SPLITTER_COPY = {
  title: 'Image Splitter',
  subtitle: 'Slice an image into a grid of equal tiles',
  uploadLabel: 'Upload Image',
  gridHeading: 'Grid Configuration',
  rowsLabel: 'Rows',
  colsLabel: 'Columns',
  splitButton: (count) => `Split into ${count} pieces`,
  splittingButton: 'Splitting...',
  downloadButton: 'Download All as ZIP',
  completeMessage: 'Tiles ready — download the ZIP archive.',
  noFileError: 'Please upload an image first.',
  invalidGridError: 'Please enter valid rows and columns (minimum 1).',
};

export const IMAGE_SPLITTER_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  processingLabel: 'splittingButton',
};

export const IMAGE_SPLITTER_DEFAULTS = {
  rows: 2,
  cols: 2,
  minGrid: 1,
};
