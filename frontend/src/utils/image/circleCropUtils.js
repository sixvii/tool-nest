import { resolvePreviewableBlob } from './resolvePreviewableImage';

export const CIRCLE_CROP_MIN_RADIUS = 24;
export const CIRCLE_CROP_HANDLE_SIZE = 16;

export function createDefaultCircleCrop(width, height) {
  const radius = Math.min(width, height) / 2;
  return clampCircleCrop({ centerX: width / 2, centerY: height / 2, radius }, width, height);
}

export function clampCircleCrop(crop, width, height) {
  const maxRadius = Math.min(width, height) / 2;
  const radius = Math.min(maxRadius, Math.max(CIRCLE_CROP_MIN_RADIUS, crop.radius));

  return {
    centerX: Math.min(width - radius, Math.max(radius, crop.centerX)),
    centerY: Math.min(height - radius, Math.max(radius, crop.centerY)),
    radius,
  };
}

export function getImageDisplayLayout(naturalWidth, naturalHeight, maxWidth, maxHeight) {
  if (!naturalWidth || !naturalHeight) {
    return { scale: 1, width: 0, height: 0 };
  }

  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
  return {
    scale,
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

export function circleCropToDisplay(crop, scale) {
  return {
    centerX: crop.centerX * scale,
    centerY: crop.centerY * scale,
    radius: crop.radius * scale,
  };
}

export function getPreviewCanvasDisplaySize(crop, maxSize, minDisplaySize = 0) {
  const diameter = Math.max(1, crop.radius * 2);
  let displaySize = Math.min(diameter, maxSize);
  if (minDisplaySize && displaySize < minDisplaySize) {
    displaySize = Math.min(minDisplaySize, maxSize);
  }
  return { width: displaySize, height: displaySize };
}

function loadImageNaturalSizeFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image dimensions.'));
    };
    img.src = url;
  });
}

export async function loadImageNaturalSize(source) {
  if (!source) {
    return { width: 0, height: 0 };
  }

  const blob = await resolvePreviewableBlob(source);
  return loadImageNaturalSizeFromBlob(blob);
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

export function drawCircleCropPreview(canvas, img, crop) {
  const diameter = Math.max(1, Math.round(crop.radius * 2));
  canvas.width = diameter;
  canvas.height = diameter;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, diameter, diameter);
  ctx.save();
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, crop.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    img,
    crop.centerX - crop.radius,
    crop.centerY - crop.radius,
    diameter,
    diameter,
    0,
    0,
    diameter,
    diameter
  );
  ctx.restore();
}

export async function cropCircleFromImage(source, crop) {
  const img = await loadImageElement(source);
  const canvas = document.createElement('canvas');
  drawCircleCropPreview(canvas, img, crop);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export cropped image.'));
    }, 'image/png');
  });
}

export function getPointerCropUpdate(mode, startCrop, pointerDelta, scale, pointerNatural) {
  if (mode === 'move') {
    return {
      centerX: startCrop.centerX + pointerDelta.x / scale,
      centerY: startCrop.centerY + pointerDelta.y / scale,
      radius: startCrop.radius,
    };
  }

  if (mode === 'resize') {
    const radius = Math.hypot(
      pointerNatural.x - startCrop.centerX,
      pointerNatural.y - startCrop.centerY
    );
    return { ...startCrop, radius };
  }

  return startCrop;
}

export function getNaturalPointerFromEvent(event, containerRect, scale) {
  return {
    x: (event.clientX - containerRect.left) / scale,
    y: (event.clientY - containerRect.top) / scale,
  };
}
export async function cropCircleFromImageWithSize(source, crop, outputSize = null) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const diameter = outputSize ?? Math.max(1, Math.round(crop.radius * 2));
      const canvas = document.createElement('canvas');
      canvas.width = diameter;
      canvas.height = diameter;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, diameter, diameter);
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
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export cropped image.'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image.'));
    };
    img.src = url;
  });
}
