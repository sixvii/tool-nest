export const IMAGE_TOOL_PREVIEW_COPY = {
  uploadLabel: 'Upload Image',
  previewLabel: 'Preview',
  resultLabel: 'Result',
  beforeLabel: 'Before',
  afterLabel: 'After',
  changeImageButton: 'Change image',
  removeImageAriaLabel: 'Remove image',
  downloadLabel: 'Download',
  processingLabel: 'Processing...',
};

export const IMAGE_TOOL_PREVIEW_DEFAULTS = {
  accept: 'image/*,.webp,.tif,.tiff',
  multiple: false,
  showCompareToggle: true,
  minHeightClass: 'min-h-fit',
};

export const IMAGE_RESIZER_PREVIEW_LAYOUT = {
  stage:
    'relative flex flex-col gap-2 h-[clamp(320px,55vh,520px)] min-h-0 p-3 rounded-xl border border-slate-200 bg-slate-50',
  imageArea:
    'relative flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200/80 bg-white/60',
  image: 'block max-w-full max-h-full rounded-lg border border-slate-100 shadow-sm object-contain',
  dimensions: 'flex flex-shrink-0 items-center justify-center gap-2 text-xs text-slate-400',
};

export const IMAGE_TOOL_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  previewLabel: 'previewLabel',
  resultLabel: 'resultLabel',
  beforeLabel: 'beforeLabel',
  afterLabel: 'afterLabel',
  changeImageButton: 'changeImageButton',
  removeImageAriaLabel: 'removeImageAriaLabel',
  downloadLabel: 'downloadLabel',
  processingLabel: 'processingLabel',
};
