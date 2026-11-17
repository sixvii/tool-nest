import {
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  FONT_FAMILIES,
} from '../../constants/pdf-constants/editPdf/editPdfConstants.js';

/**
 * Build the edit API payload + sidecar image/drawing files.
 * Pure — no React, no network.
 */
export function buildEditPayload({
  parsedBlocks = {},
  modifiedBlocks = {},
  deletedIds = new Set(),
  elements = [],
}) {
  const payload = [];
  const imageFiles = {};

  for (const [pageIdxStr, blocks] of Object.entries(parsedBlocks)) {
    const pageIndex = Number(pageIdxStr);
    for (const block of blocks) {
      const isDeleted = deletedIds.has(block._id);
      const isModified = modifiedBlocks[block._id] != null;
      if (isDeleted || isModified) {
        payload.push({
          type: 'erase',
          x: Math.round(block.x),
          y: Math.round(block.y),
          w: Math.round(block.width ?? block.text.length * block.font_size * 0.6),
          h: Math.round(block.height ?? block.font_size * 1.4),
          page_index: pageIndex,
        });
      }
      if (isModified) {
        payload.push({
          type: 'text',
          text: modifiedBlocks[block._id].newText,
          x: Math.round(block.x),
          y: Math.round(block.y),
          page_index: pageIndex,
          font_size: block.font_size ?? DEFAULT_FONT_SIZE,
          font_family: block.font_family ?? FONT_FAMILIES[0].value,
          color: block.color_hex ?? DEFAULT_COLOR,
        });
      }
    }
  }

  elements.forEach((el, i) => {
    if (el.type === 'text') {
      payload.push({
        type: 'text',
        text: el.text,
        x: Math.round(el.x),
        y: Math.round(el.y),
        page_index: el.pageIndex,
        font_size: el.fontSize,
        font_family: el.fontFamily,
        color: el.color,
        bold: el.bold,
        italic: el.italic,
        underline: el.underline,
        align: el.align,
      });
      return;
    }
    if (el.type === 'shape') {
      payload.push({
        type: 'shape',
        shape_type: el.shapeType,
        x: Math.round(el.x),
        y: Math.round(el.y),
        w: Math.round(el.w),
        h: Math.round(el.h),
        page_index: el.pageIndex,
        color: el.color,
        fill_color: el.fillColor,
      });
      return;
    }
    if (el.type === 'image') {
      const key = `image_${i}`;
      imageFiles[key] = el.file;
      payload.push({
        type: 'image',
        x: Math.round(el.x),
        y: Math.round(el.y),
        w: Math.round(el.w),
        h: Math.round(el.h),
        page_index: el.pageIndex,
        file_key: key,
      });
      return;
    }
    if (el.type === 'drawing') {
      const key = `draw_${i}`;
      imageFiles[key] = el.blob;
      payload.push({
        type: 'drawing',
        x: Math.round(el.x),
        y: Math.round(el.y),
        w: Math.round(el.w),
        h: Math.round(el.h),
        page_index: el.pageIndex,
        file_key: key,
      });
    }
  });

  return { payload, imageFiles };
}
