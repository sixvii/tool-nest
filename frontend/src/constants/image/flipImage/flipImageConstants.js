import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';

export const FLIP_IMAGE_COPY = {
  title: 'Flip Image',
  subtitle: 'Mirror horizontally, vertically, or both at once',
  uploadLabel: 'Upload Image',
  previewLabel: 'Preview',
  resultLabel: 'Result',
  beforeLabel: 'Before',
  afterLabel: 'After',
  directionHeading: 'Flip Direction',
  directionHint: 'Select one or both. Both together flips the image on both axes.',
  applyButton: 'Apply Flip',
  applyingButton: 'Flipping...',
  completeMessage: 'Processing complete',
  downloadButton: 'Download Image',
  changeImageButton: 'Change image',
  removeImageAriaLabel: 'Remove image',
  processingLabel: 'Flipping...',
  noFileError: 'Please upload an image first.',
  noDirectionError: 'Select at least one flip direction.',
  genericError: 'Something went wrong.',
  fileInfoHeading: 'Current image',
  selectionHeading: 'Selected transform',
  noSelectionSummary: 'No direction selected',
  noSelectionDescription: 'Pick at least one flip option above.',
  horizontalSummary: 'Flip Horizontal',
  horizontalDescription: 'Creates a left-right mirror of your image.',
  verticalSummary: 'Flip Vertical',
  verticalDescription: 'Creates an upside-down mirror of your image.',
  bothSummary: 'Horizontal + Vertical',
  bothDescription: 'Mirrors on both axes — equivalent to a 180° rotation.',
  tipsHeading: 'Quick tips',
  tipBothAxes: 'Select both axes for a full 180° flip.',
  tipCompare: 'Use Before / After on the preview to compare results.',
  tipDownload: 'Download saves the flipped image in its original format.',
};

export const FLIP_IMAGE_OUTPUT = {
  suffix: 'flipped',
};

export const FLIP_APPLY_ORDER = ['horizontal', 'vertical'];

export const FLIP_AXIS_CONFIG = {
  horizontal: {
    id: 'horizontal',
    label: 'Flip Horizontal',
    icon: FlipHorizontal2,
    apiDirection: 'horizontal',
  },
  vertical: {
    id: 'vertical',
    label: 'Flip Vertical',
    icon: FlipVertical2,
    apiDirection: 'vertical',
  },
};

export const FLIP_DOWNLOAD_SUFFIX = {
  horizontal: 'horizontal',
  vertical: 'vertical',
  'horizontal-vertical': 'horizontal-and-vertical',
};

export const FLIP_DEFAULT_SELECTION = {
  horizontal: true,
  vertical: false,
};

export const FLIP_SELECTION_SUMMARY_MAP = {
  '': {
    titleKey: 'noSelectionSummary',
    descriptionKey: 'noSelectionDescription',
  },
  horizontal: {
    titleKey: 'horizontalSummary',
    descriptionKey: 'horizontalDescription',
  },
  vertical: {
    titleKey: 'verticalSummary',
    descriptionKey: 'verticalDescription',
  },
  'horizontal-vertical': {
    titleKey: 'bothSummary',
    descriptionKey: 'bothDescription',
  },
};

export const FLIP_IMAGE_TIPS = ['tipBothAxes', 'tipCompare', 'tipDownload'];

export const FLIP_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  previewLabel: 'previewLabel',
  resultLabel: 'resultLabel',
  beforeLabel: 'beforeLabel',
  afterLabel: 'afterLabel',
  changeImageButton: 'changeImageButton',
  removeImageAriaLabel: 'removeImageAriaLabel',
  processingLabel: 'applyingButton',
};
