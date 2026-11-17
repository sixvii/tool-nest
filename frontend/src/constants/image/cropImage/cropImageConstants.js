export const CROP_IMAGE_COPY = {
  title: 'Crop Image',
  subtitle: 'Select an area to crop, then download the result',
  uploadLabel: 'Upload Image',
  editorHeading: '1. Select crop area',
  previewHeading: '2. Cropped result',
  editorHint:
    'Drag inside the box to move it. Drag the handle on the bottom-right corner to resize.',
  editorHintLocked:
    'Aspect ratio is locked. Drag to move or resize while keeping the selected ratio.',
  aspectRatioLabel: 'Aspect Ratio',
  aspectRatioLoadingHint: 'Loading aspect ratio options…',
  customRatioXLabel: 'Ratio (X)',
  customRatioYLabel: 'Ratio (Y)',
  previewHint: 'This is exactly what your downloaded image will look like.',
  cropButton: 'Crop Image',
  croppingButton: 'Cropping...',
  downloadButton: 'Download',
  emptyPreviewTitle: 'No file uploaded yet',
  emptyPreviewHint: 'Upload a file to start cropping',
  noFileError: 'Please upload an image first.',
  genericError: 'Something went wrong.',
};

export const CROP_IMAGE_OUTPUT = {
  suffix: 'cropped',
};

export const CROP_IMAGE_LAYOUT = {
  previewMinHeight: 520,
  previewPanelMinHeight: 420,
  editorMaxWidth: 640,
  editorMaxHeight: 480,
  previewMaxSize: 380,
};

export const CROP_DRAG_MODES = {
  MOVE: 'move',
  RESIZE: 'resize',
};

export const CROP_DEFAULT_RATIO = 0.8;

export const CROP_OVERLAY_STYLE = {
  dim: 'rgba(15, 23, 42, 0.55)',
  border: '#3b82f6',
  handle: '#34d399',
};
