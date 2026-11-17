export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const HANDLE_POS = {
  nw: { top: 0, left: 0, transform: 'translate(-50%,-50%)' },
  n: { top: 0, left: '50%', transform: 'translate(-50%,-50%)' },
  ne: { top: 0, right: 0, transform: 'translate(50%,-50%)' },
  e: { top: '50%', right: 0, transform: 'translate(50%,-50%)' },
  se: { bottom: 0, right: 0, transform: 'translate(50%,50%)' },
  s: { bottom: 0, left: '50%', transform: 'translate(-50%,50%)' },
  sw: { bottom: 0, left: 0, transform: 'translate(-50%,50%)' },
  w: { top: '50%', left: 0, transform: 'translate(-50%,-50%)' },
};

export const HANDLE_CURSOR = {
  nw: 'nw-resize',
  n: 'n-resize',
  ne: 'ne-resize',
  e: 'e-resize',
  se: 'se-resize',
  s: 's-resize',
  sw: 'sw-resize',
  w: 'w-resize',
};

export const CURSOR_BY_TOOL = {
  select: 'default',
  text: 'text',
  shape: 'crosshair',
  image: 'copy',
  draw: 'crosshair',
};

export const TOOL_HINTS = {
  text: 'Click on PDF to place text',
  shape: 'Drag to draw shape',
  image: 'Click to insert image',
  draw: 'Draw freely',
  select: '',
};

export const DEFAULT_TOOL_OPTS = {
  fillColor: 'transparent',
  shapeType: 'rect',
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
};
