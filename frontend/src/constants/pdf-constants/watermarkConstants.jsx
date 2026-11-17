export const WATERMARK_MODES = [
  { key: 'text', label: 'Place text' },
  { key: 'image', label: 'Place image' },
];

export const TRANSPARENCY_OPTIONS = [
  { label: 'No transparency', value: '0' },
  { label: '25%', value: '25' },
  { label: '50%', value: '50' },
  { label: '75%', value: '75' },
];

export const ROTATION_OPTIONS = [
  { label: 'Do not rotate', value: '0' },
  { label: '45°', value: '45' },
  { label: '90°', value: '90' },
  { label: '-45°', value: '-45' },
];

export const LAYER_OPTIONS = [
  { key: 'over', label: 'Over the PDF' },
  { key: 'under', label: 'Below the PDF' },
];

export const POSITIONS = [
  ['top-left', 'top-center', 'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

export const MARGIN_PCT = 0.05;

const M = `${MARGIN_PCT * 100}%`;

export const POSITION_STYLE = {
  'top-left': {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: M,
    paddingLeft: M,
  },
  'top-center': { justifyContent: 'center', alignItems: 'flex-start', paddingTop: M },
  'top-right': {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingTop: M,
    paddingRight: M,
  },
  'middle-left': { justifyContent: 'flex-start', alignItems: 'center', paddingLeft: M },
  'middle-center': { justifyContent: 'center', alignItems: 'center' },
  'middle-right': { justifyContent: 'flex-end', alignItems: 'center', paddingRight: M },
  'bottom-left': {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingBottom: M,
    paddingLeft: M,
  },
  'bottom-center': { justifyContent: 'center', alignItems: 'flex-end', paddingBottom: M },
  'bottom-right': {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: M,
    paddingRight: M,
  },
};

export const ALL_POSITIONS = Object.keys(POSITION_STYLE);
