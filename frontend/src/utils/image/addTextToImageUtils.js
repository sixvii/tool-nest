export const validateInputs = (file, text) => {
  if (!file) return 'Please upload an image.';
  if (!text.trim()) return 'Please enter text to add.';
  return null;
};

export const getRenderedImageRect = (imgEl) => {
  const boxWidth = imgEl.clientWidth;
  const boxHeight = imgEl.clientHeight;
  const naturalWidth = imgEl.naturalWidth;
  const naturalHeight = imgEl.naturalHeight;

  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;

  return {
    width: renderedWidth,
    height: renderedHeight,
    offsetX: (boxWidth - renderedWidth) / 2,
    offsetY: (boxHeight - renderedHeight) / 2,
  };
};

export const getScaledCoordinates = (
  displayX,
  displayY,
  renderedRect,
  actualWidth,
  actualHeight
) => {
  const { width: renderedWidth, height: renderedHeight, offsetX, offsetY } = renderedRect;
  const scaleX = actualWidth / renderedWidth;
  const scaleY = actualHeight / renderedHeight;
  return {
    x: Math.round((displayX - offsetX) * scaleX),
    y: Math.round((displayY - offsetY) * scaleY),
  };
};
