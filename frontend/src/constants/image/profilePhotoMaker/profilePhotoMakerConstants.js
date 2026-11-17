import { Circle, Square } from 'lucide-react';

export const PROFILE_PHOTO_MAKER_COPY = {
  title: 'Profile Photo Maker',
  subtitle: 'Crop your photo into a perfect circle or square with custom size and background',
  uploadLabel: 'Upload Image',
  previewLabel: 'Preview',
  resultLabel: 'Result',
  beforeLabel: 'Before',
  afterLabel: 'After',
  shapeHeading: 'Shape',
  shapeHint: 'Drag the crop area to position your profile photo.',
  outputSizeHeading: 'Output Size',
  outputSizeHint: 'Final export dimensions in pixels.',
  backgroundHeading: 'Background Color',
  backgroundHint: 'Applies behind transparent areas or as the square crop fill.',
  applyButton: 'Generate Profile Photo',
  applyingButton: 'Generating...',
  completeMessage: 'Profile photo ready',
  downloadButton: 'Download Image',
  changeImageButton: 'Change image',
  removeImageAriaLabel: 'Remove image',
  noFileError: 'Please upload an image first.',
  genericError: 'Something went wrong.',
};

export const PROFILE_PHOTO_SHAPES = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
];

export const PROFILE_PHOTO_SHAPE_CONFIG = {
  circle: { label: 'Circle', icon: Circle },
  square: { label: 'Square', icon: Square },
};

export const PROFILE_PHOTO_SIZE_PRESETS = [
  { label: '200×200', value: 200 },
  { label: '400×400', value: 400 },
  { label: '800×800', value: 800 },
];

export const PROFILE_PHOTO_BG_COLORS = [
  { label: 'Transparent', value: '' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Gray', value: '#6b7280' },
];

export const PROFILE_PHOTO_OUTPUT = {
  suffix: 'profile',
  defaultSize: 400,
  extension: 'png',
};

export const PROFILE_PHOTO_DEFAULTS = {
  shape: 'circle',
  outputSize: PROFILE_PHOTO_OUTPUT.defaultSize,
  bgColor: '',
};

export const PROFILE_PHOTO_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  previewLabel: 'previewLabel',
  resultLabel: 'resultLabel',
  beforeLabel: 'beforeLabel',
  afterLabel: 'afterLabel',
  changeImageButton: 'changeImageButton',
  removeImageAriaLabel: 'removeImageAriaLabel',
  processingLabel: 'applyingButton',
};
