import { resolvePreviewableBlob } from '../resolvePreviewableImage';

export const SQUARE_CROP_MIN_SIZE = 24;
export const SQUARE_CROP_HANDLE_SIZE = 16;

export function createDefaultSquareCrop(width, height) {
  const size = Math.min(width, height) * 0.8;
  return clampSquareCrop({ x: (width - size) / 2, y: (height - size) / 2, size }, width, height);
}

export function clampSquareCrop(crop, width, height) {
  const size = Math.min(Math.min(width, height), Math.max(SQUARE_CROP_MIN_SIZE, crop.size));
  return {
    x: Math.min(width - size, Math.max(0, crop.x)),
    y: Math.min(height - size, Math.max(0, crop.y)),
    size,
  };
}

export function squareCropToDisplay(crop, scale) {
  return { x: crop.x * scale, y: crop.y * scale, size: crop.size * scale };
}

async function loadImageElement(source) {
  const blob = await resolvePreviewableBlob(source);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image.'));
    };
    img.src = url;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export image.'));
    }, 'image/png');
  });
}

function fillCanvasBackground(ctx, width, height, bgColor) {
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.clearRect(0, 0, width, height);
}

export async function cropCircleProfilePhoto(source, crop, bgColor = '', outputSize) {
  const img = await loadImageElement(source);
  const diameter = outputSize;
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext('2d');

  fillCanvasBackground(ctx, diameter, diameter, bgColor);

  ctx.save();
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    img,
    crop.centerX - crop.radius,
    crop.centerY - crop.radius,
    crop.radius * 2,
    crop.radius * 2,
    0,
    0,
    diameter,
    diameter
  );
  ctx.restore();

  return canvasToPngBlob(canvas);
}

export async function cropSquareFromImage(source, crop, bgColor = '', outputSize = null) {
  const img = await loadImageElement(source);
  const size = outputSize ?? Math.round(crop.size);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get 2D context');

  // 1. Fill the entire canvas background space with your chosen color token
  fillCanvasBackground(ctx, size, size, bgColor);

  // 2. Define padding percentage if you want the color visible around a square profile (e.g., 8% padding)
  // If bgColor is transparent, we keep it full size (0 padding)
  const hasBackground = bgColor && bgColor !== 'transparent';
  const paddingFactor = hasBackground ? 0.08 : 0;

  const paddingPixels = size * paddingFactor;
  const renderSize = size - paddingPixels * 2;

  // 3. Calculate the scaling ratio from source crop space to your inner rendering box
  const scale = renderSize / crop.size;

  // 4. Handle edge intersections if the crop box falls outside image dimensions
  const sourceX = Math.max(0, crop.x);
  const sourceY = Math.max(0, crop.y);

  const sourceRight = Math.min(img.width, crop.x + crop.size);
  const sourceBottom = Math.min(img.height, crop.y + crop.size);

  const sourceWidth = sourceRight - sourceX;
  const sourceHeight = sourceBottom - sourceY;

  // 5. Position the image within the inner boundary box (offset by your padding pixels)
  const destX = paddingPixels + (sourceX - crop.x) * scale;
  const destY = paddingPixels + (sourceY - crop.y) * scale;
  const destWidth = sourceWidth * scale;
  const destHeight = sourceHeight * scale;

  // 6. Paint the image over the background fill layer
  if (sourceWidth > 0 && sourceHeight > 0) {
    ctx.drawImage(
      img,
      Math.round(sourceX),
      Math.round(sourceY),
      Math.round(sourceWidth),
      Math.round(sourceHeight),
      Math.round(destX),
      Math.round(destY),
      Math.round(destWidth),
      Math.round(destHeight)
    );
  }

  return canvasToPngBlob(canvas);
}
