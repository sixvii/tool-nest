const FA_FONT_FAMILY = '"Font Awesome 6 Free"';

export function parseFontAwesomeUnicode(unicode) {
  const hex = unicode.replace(/^\\u|^u\+|^0x/i, '').trim();
  const codePoint = parseInt(hex, 16);
  if (!Number.isFinite(codePoint)) {
    throw new Error('Invalid unicode value.');
  }
  return String.fromCodePoint(codePoint);
}

async function waitForFontAwesomeFont() {
  if (!document.fonts?.load) return;

  try {
    await Promise.all([
      document.fonts.load(`900 16px ${FA_FONT_FAMILY}`),
      document.fonts.load(`400 16px ${FA_FONT_FAMILY}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Font may still render via stylesheet fallback.
  }
}

export async function renderFontAwesomeToPng(unicode, size, color) {
  const char = parseFontAwesomeUnicode(unicode);
  await waitForFontAwesomeFont();

  const side = Math.max(1, Math.round(size));
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.');
  }

  ctx.clearRect(0, 0, side, side);
  ctx.fillStyle = color || '#000000';
  const fontSize = Math.round(side * 0.625);
  ctx.font = `900 ${fontSize}px ${FA_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, side / 2, side / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate PNG.'))),
      'image/png'
    );
  });
}
