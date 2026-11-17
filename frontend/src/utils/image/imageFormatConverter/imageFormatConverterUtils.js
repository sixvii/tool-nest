import {
  FORMAT_MAP,
  SOURCE_FORMAT,
  normalizeExt,
  SUPPORTED_EXTENSIONS,
} from '../../../constants/image/imageConstants';
import { buildToolPreviewLabels } from '../imageToolPreviewUtils';

export const FORMAT_CONVERTER_COPY = {
  uploadLabel: 'Upload Image',
  selectLabel: 'Convert To',
  convertButton: 'Convert Image',
  convertingButton: 'Converting...',
  downloadButton: 'Download',
  completeMessage: 'Conversion complete.',
  noFileError: 'Please upload a file first.',
  noTargetError: 'No valid target format available for this file type.',
  unsupportedError: (ext) =>
    `".${ext}" is not supported. Please upload a JPG, PNG, WebP, GIF, TIFF or EPS file.`,
};

export const FORMAT_CONVERTER_PREVIEW_LABEL_KEYS = {
  uploadLabel: 'uploadLabel',
  processingLabel: 'convertingButton',
};

export function getFormatConverterPreset(toolName) {
  return SOURCE_FORMAT[toolName] ?? null;
}

export function getFormatOptions(ext) {
  return Object.keys(FORMAT_MAP[ext] ?? {}).map((value) => ({
    value,
    label: `.${value.toUpperCase()}`,
  }));
}

export function getInitialExtFromPreset(preset) {
  return normalizeExt((preset?.accept ?? '').split(',')[0].replace('.', ''));
}

export function resolveFileExtension(filename) {
  return normalizeExt(filename.split('.').pop().toLowerCase());
}

export function isSupportedExtension(ext) {
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function getFormatConverterPreviewLabels() {
  return buildToolPreviewLabels(FORMAT_CONVERTER_COPY, FORMAT_CONVERTER_PREVIEW_LABEL_KEYS);
}

export function getFormatConverterTitle(toolName, source, target) {
  if (source && target) return `${source} to ${target.toUpperCase()}`;
  return toolName ?? 'Image Format Converter';
}

export function getFormatConverterSubtitle(preset) {
  return preset?.allowMultiple
    ? 'Upload multiple images to create an animated GIF'
    : 'Upload your image to convert';
}

export function getFormatConverterDownloadFilename(filename, ext) {
  const base = filename.replace(/\.[^/.]+$/, '') || 'result';
  return `${base}.${ext}`;
}
