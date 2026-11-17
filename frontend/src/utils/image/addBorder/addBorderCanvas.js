import { normalizeHexColor } from './borderStyleUtils';

function hexToRgb(hex) {
  const value = normalizeHexColor(hex);
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  };
}

function lighten(rgb) {
  return {
    r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.5)),
    g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.5)),
    b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.5)),
  };
}

function darken(rgb) {
  return {
    r: Math.max(0, Math.round(rgb.r * 0.5)),
    g: Math.max(0, Math.round(rgb.g * 0.5)),
    b: Math.max(0, Math.round(rgb.b * 0.5)),
  };
}

function rgbCss(rgb, alpha = 1) {
  if (alpha < 1) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
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

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function expandSolid(img, borderWidth, color) {
  const canvas = createCanvas(img.width + borderWidth * 2, img.height + borderWidth * 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, borderWidth, borderWidth);
  return canvas;
}

function expandWithPadding(img, top, right, bottom, left, color) {
  const canvas = createCanvas(img.width + left + right, img.height + top + bottom);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, left, top);
  return canvas;
}

function fillPolygon(ctx, points, color) {
  if (!points.length) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function drawEdgePattern(ctx, width, height, borderWidth, color, step, length) {
  ctx.fillStyle = color;
  for (let x = 0; x < width; x += step) {
    ctx.fillRect(x, 0, Math.min(x + length, width) - x, borderWidth);
    ctx.fillRect(x, height - borderWidth, Math.min(x + length, width) - x, borderWidth);
  }
  for (let y = 0; y < height; y += step) {
    ctx.fillRect(0, y, borderWidth, Math.min(y + length, height) - y);
    ctx.fillRect(width - borderWidth, y, borderWidth, Math.min(y + length, height) - y);
  }
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderSolid(img, borderWidth, color) {
  return expandSolid(img, borderWidth, color);
}

function renderPolaroid(img, borderWidth, color) {
  const bottom = Math.round(borderWidth * 2.5);
  return expandWithPadding(img, borderWidth, borderWidth, bottom, borderWidth, color);
}

function renderDouble(img, borderWidth, color) {
  const band = Math.max(1, Math.floor(borderWidth / 3));
  const middle = Math.max(0, borderWidth - 2 * band);

  const inner = expandSolid(img, band, color);
  const mid = createCanvas(inner.width + middle * 2, inner.height + middle * 2);
  const midCtx = mid.getContext('2d');
  midCtx.fillStyle = '#ffffff';
  midCtx.fillRect(0, 0, mid.width, mid.height);
  midCtx.drawImage(inner, middle, middle);

  const outer = createCanvas(mid.width + band * 2, mid.height + band * 2);
  const outerCtx = outer.getContext('2d');
  outerCtx.fillStyle = color;
  outerCtx.fillRect(0, 0, outer.width, outer.height);
  outerCtx.drawImage(mid, band, band);
  return outer;
}

function renderBevel(img, borderWidth, color, style) {
  const rgb = hexToRgb(color);
  const topLeft = style === 'inset' ? darken(rgb) : lighten(rgb);
  const bottomRight = style === 'inset' ? lighten(rgb) : darken(rgb);
  const canvas = expandSolid(img, borderWidth, color);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const bw = borderWidth;

  fillPolygon(
    ctx,
    [
      [0, 0],
      [w, 0],
      [w - bw, bw],
      [bw, bw],
    ],
    rgbCss(topLeft)
  );
  fillPolygon(
    ctx,
    [
      [0, 0],
      [bw, bw],
      [bw, h - bw],
      [0, h],
    ],
    rgbCss(topLeft)
  );
  fillPolygon(
    ctx,
    [
      [0, h],
      [bw, h - bw],
      [w - bw, h - bw],
      [w, h],
    ],
    rgbCss(bottomRight)
  );
  fillPolygon(
    ctx,
    [
      [w, 0],
      [w - bw, bw],
      [w - bw, h - bw],
      [w, h],
    ],
    rgbCss(bottomRight)
  );
  return canvas;
}

function renderGrooveRidge(img, borderWidth, color, style) {
  const rgb = hexToRgb(color);
  const bwHalf = Math.max(1, Math.floor(borderWidth / 2));
  const outerTl = style === 'groove' ? darken(rgb) : lighten(rgb);
  const outerBr = style === 'groove' ? lighten(rgb) : darken(rgb);
  const innerTl = style === 'groove' ? lighten(rgb) : darken(rgb);
  const innerBr = style === 'groove' ? darken(rgb) : lighten(rgb);

  const canvas = expandSolid(img, borderWidth, color);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  fillPolygon(
    ctx,
    [
      [0, 0],
      [w, 0],
      [w - bwHalf, bwHalf],
      [bwHalf, bwHalf],
    ],
    rgbCss(outerTl)
  );
  fillPolygon(
    ctx,
    [
      [0, 0],
      [bwHalf, bwHalf],
      [bwHalf, h - bwHalf],
      [0, h],
    ],
    rgbCss(outerTl)
  );
  fillPolygon(
    ctx,
    [
      [0, h],
      [bwHalf, h - bwHalf],
      [w - bwHalf, h - bwHalf],
      [w, h],
    ],
    rgbCss(outerBr)
  );
  fillPolygon(
    ctx,
    [
      [w, 0],
      [w - bwHalf, bwHalf],
      [w - bwHalf, h - bwHalf],
      [w, h],
    ],
    rgbCss(outerBr)
  );

  fillPolygon(
    ctx,
    [
      [bwHalf, bwHalf],
      [w - bwHalf, bwHalf],
      [w - borderWidth, borderWidth],
      [borderWidth, borderWidth],
    ],
    rgbCss(innerTl)
  );
  fillPolygon(
    ctx,
    [
      [bwHalf, bwHalf],
      [borderWidth, borderWidth],
      [borderWidth, h - borderWidth],
      [bwHalf, h - bwHalf],
    ],
    rgbCss(innerTl)
  );
  fillPolygon(
    ctx,
    [
      [bwHalf, h - bwHalf],
      [borderWidth, h - borderWidth],
      [w - borderWidth, h - borderWidth],
      [w - bwHalf, h - bwHalf],
    ],
    rgbCss(innerBr)
  );
  fillPolygon(
    ctx,
    [
      [w - bwHalf, bwHalf],
      [w - borderWidth, borderWidth],
      [w - borderWidth, h - borderWidth],
      [w - bwHalf, h - bwHalf],
    ],
    rgbCss(innerBr)
  );
  return canvas;
}

function renderDashedOrDotted(img, borderWidth, color, style) {
  const canvas = expandSolid(img, borderWidth, '#ffffff');
  const ctx = canvas.getContext('2d');
  const step = style === 'dashed' ? borderWidth * 3 : borderWidth * 2;
  const length = style === 'dashed' ? borderWidth * 2 : borderWidth;
  drawEdgePattern(ctx, canvas.width, canvas.height, borderWidth, color, step, length);
  return canvas;
}

function renderRounded(img, borderWidth, color) {
  const canvas = createCanvas(img.width + borderWidth * 2, img.height + borderWidth * 2);
  const ctx = canvas.getContext('2d');
  const radius = borderWidth * 2;
  drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, radius);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  drawRoundedRect(
    ctx,
    borderWidth,
    borderWidth,
    img.width,
    img.height,
    Math.max(4, borderWidth * 0.8)
  );
  ctx.clip();
  ctx.drawImage(img, borderWidth, borderWidth);
  ctx.restore();
  return canvas;
}

function renderShadow(img, borderWidth, color) {
  const bordered = expandSolid(img, borderWidth, color);
  const shadowOffset = Math.max(5, borderWidth);
  const canvas = createCanvas(
    bordered.width + shadowOffset * 3,
    bordered.height + shadowOffset * 3
  );
  const ctx = canvas.getContext('2d');
  const x = Math.floor(shadowOffset / 2);
  const y = Math.floor(shadowOffset / 2);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.filter = `blur(${Math.max(2, Math.floor(shadowOffset / 2))}px)`;
  ctx.fillRect(shadowOffset, shadowOffset, bordered.width, bordered.height);
  ctx.filter = 'none';
  ctx.drawImage(bordered, x, y);
  return canvas;
}

function renderNeon(img, borderWidth, color) {
  const rgb = hexToRgb(color);
  const pad = borderWidth * 2;
  const canvas = createCanvas(img.width + pad * 2, img.height + pad * 2);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(15, 15, 15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glowPasses = [borderWidth, borderWidth * 2, borderWidth * 3];
  glowPasses.forEach((blur) => {
    ctx.save();
    ctx.strokeStyle = rgbCss(rgb, 0.85);
    ctx.lineWidth = borderWidth;
    ctx.shadowColor = rgbCss(rgb);
    ctx.shadowBlur = blur;
    ctx.strokeRect(
      pad - borderWidth / 2,
      pad - borderWidth / 2,
      img.width + borderWidth,
      img.height + borderWidth
    );
    ctx.restore();
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(1, Math.floor(borderWidth / 4));
  ctx.strokeRect(pad - 1, pad - 1, img.width + 2, img.height + 2);
  ctx.drawImage(img, pad, pad);
  return canvas;
}

const RENDERERS = {
  solid: renderSolid,
  polaroid: renderPolaroid,
  double: renderDouble,
  inset: (img, bw, color) => renderBevel(img, bw, color, 'inset'),
  outset: (img, bw, color) => renderBevel(img, bw, color, 'outset'),
  groove: (img, bw, color) => renderGrooveRidge(img, bw, color, 'groove'),
  ridge: (img, bw, color) => renderGrooveRidge(img, bw, color, 'ridge'),
  dashed: (img, bw, color) => renderDashedOrDotted(img, bw, color, 'dashed'),
  dotted: (img, bw, color) => renderDashedOrDotted(img, bw, color, 'dotted'),
  rounded: renderRounded,
  shadow: renderShadow,
  neon: renderNeon,
};

function canvasToBlob(canvas, file) {
  const wantsJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
  const mimeType = wantsJpeg ? 'image/jpeg' : 'image/png';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export bordered image.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      wantsJpeg ? 0.92 : undefined
    );
  });
}

export async function applyBorderToImage(file, borderWidth, colorHex, borderStyle) {
  const img = await loadImageElement(file);
  const color = normalizeHexColor(colorHex);
  const bw = Math.max(1, Number(borderWidth) || 1);
  const render = RENDERERS[borderStyle] || RENDERERS.solid;
  const canvas = render(img, bw, color);
  return canvasToBlob(canvas, file);
}
