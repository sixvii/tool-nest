import { IMAGE_TOOL_PREVIEW_COPY } from '../../constants/image/imageToolPreviewConstants';

export function mergeImageToolPreviewLabels(overrides = {}) {
  return { ...IMAGE_TOOL_PREVIEW_COPY, ...overrides };
}

export function getImageToolPreviewDisplayState({ hasResult, showOriginal, labels }) {
  const showingResult = hasResult && !showOriginal;
  return {
    statusLabel: showingResult ? labels.resultLabel : labels.previewLabel,
    displayUrlKey: showingResult ? 'result' : 'original',
  };
}

export function hasImageToolPreviewResult(resultBlob, resultUrl) {
  return Boolean(resultBlob || resultUrl);
}

export function isDisplayableImagePreview(source) {
  if (!source) return false;
  const type = source.type || '';
  if (!type) return true;
  return type.startsWith('image/');
}

export function pickPreviewLabelsFromCopy(copy, keyMap) {
  return Object.fromEntries(
    Object.entries(keyMap).map(([previewKey, copyKey]) => [previewKey, copy[copyKey]])
  );
}

export function buildToolPreviewLabels(copy, labelKeys) {
  return mergeImageToolPreviewLabels(pickPreviewLabelsFromCopy(copy, labelKeys));
}
