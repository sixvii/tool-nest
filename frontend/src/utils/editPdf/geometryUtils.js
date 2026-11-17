/** Map a mouse event to canvas-local pixel coordinates. */
export function getCanvasPos(event, canvasEl) {
  if (!canvasEl) return { px: 0, py: 0 };
  const rect = canvasEl.getBoundingClientRect();
  return { px: event.clientX - rect.left, py: event.clientY - rect.top };
}

/**
 * Apply a resize-handle drag in PDF-point space.
 * Min size is 20 points on each axis (matches existing editor).
 */
export function applyResizeHandle({ handle, origX, origY, origW, origH, dx, dy }) {
  let x = origX;
  let y = origY;
  let w = origW;
  let h = origH;

  if (handle.includes('e')) w = Math.max(20, origW + dx);
  if (handle.includes('s')) h = Math.max(20, origH + dy);
  if (handle.includes('w')) {
    x = origX + dx;
    w = Math.max(20, origW - dx);
  }
  if (handle.includes('n')) {
    y = origY + dy;
    h = Math.max(20, origH - dy);
  }

  return { x, y, w, h };
}

export function estimateBlockPixelBox(block, scale) {
  const fontSize = (block.font_size ?? 12) * scale;
  const width = Math.max(
    (block.width ?? block.text.length * (block.font_size ?? 12) * 0.7) * scale,
    40
  );
  const height = Math.max((block.height ?? (block.font_size ?? 12) * 1.5) * scale, fontSize);
  return {
    left: block.x * scale,
    top: block.y * scale,
    width,
    height,
    fontSize,
  };
}
