export const ROUND_IMAGE_COPY = {
  title: 'Make Round Image',
  subtitle: 'Upload an image, adjust the circle crop, then download a transparent PNG',
  editorHeading: '1. Adjust the circle',
  previewHeading: '2. Live preview',
  uploadLabel: 'Upload Image',
  applyButton: 'Apply Round Crop',
  applyingButton: 'Applying...',
  downloadButton: 'Download Round Image',
  downloadingButton: 'Preparing download...',
  editorHint:
    'Drag inside the red circle to move it. Drag the green handle on the right edge to resize.',
  previewHint: 'This is exactly what your downloaded PNG will look like.',
  emptyPreviewTitle: 'No file uploaded yet',
  emptyPreviewHint: 'Upload a file to start cropping',
  noFileError: 'Please upload an image first.',
  genericError: 'Something went wrong.',
};

export const ROUND_IMAGE_OUTPUT = {
  suffix: 'round',
  extension: 'png',
};

export const ROUND_IMAGE_LAYOUT = {
  previewMinHeight: 520,
  previewPanelMinHeight: 420,
  editorMaxWidth: 640,
  editorMaxHeight: 480,
  previewMaxSize: 380,
  previewMinDisplaySize: 160,
};

const CHECKERBOARD_TILE_SIZE = 16;
const CHECKERBOARD_TILE_OFFSET = CHECKERBOARD_TILE_SIZE / 2;

export const ROUND_IMAGE_CHECKERBOARD_STYLE = {
  backgroundColor: '#f8fafc',
  backgroundImage: `
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
  `,
  backgroundSize: `${CHECKERBOARD_TILE_SIZE}px ${CHECKERBOARD_TILE_SIZE}px`,
  backgroundPosition: `0 0, 0 ${CHECKERBOARD_TILE_OFFSET}px, ${CHECKERBOARD_TILE_OFFSET}px -${CHECKERBOARD_TILE_OFFSET}px, -${CHECKERBOARD_TILE_OFFSET}px 0px`,
};
