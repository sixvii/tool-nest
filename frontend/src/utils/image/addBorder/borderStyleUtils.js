export const BORDER_WIDTH_MIN = 1;
export const BORDER_WIDTH_MAX = 500;

export const PREVIEW_CONTAINER_PADDING = 24;

const MATTE_INNER_PADDING_MIN = 2;
const MATTE_INNER_PADDING_RATIO = 0.35;
const MATTE_INNER_COLOR = '#ffffff';

const POLAROID_BOTTOM_PADDING_RATIO = 2.5;

const SHADOW_EXTRA_RATIO = 0.8;
const SHADOW_PADDING_RATIO = 0.65;
const SHADOW_OFFSET_X_RATIO = 0.25;
const SHADOW_OFFSET_Y_RATIO = 0.35;
const SHADOW_BLUR_RATIO = 0.75;
const SHADOW_OPACITY = 0.35;

const ROUNDED_WRAPPER_RADIUS_RATIO = 1.2;
const ROUNDED_WRAPPER_RADIUS_MIN = 8;
const ROUNDED_IMAGE_RADIUS_RATIO = 0.8;
const ROUNDED_IMAGE_RADIUS_MIN = 4;

const NEON_EXTRA_PADDING = 20;
const NEON_GLOW_MIN = 4;
const NEON_BAND_MIN = 3;
const NEON_BAND_RATIO = 0.45;
const NEON_GLOW_INNER_RATIO = 0.4;
const NEON_GLOW_MID_RATIO = 1;
const NEON_GLOW_OUTER_RATIO = 2;
const NEON_GLOW_FAR_RATIO = 3;
const NEON_GLOW_FAR_ALPHA = '99';

const CHIP_PADDING_DEFAULT = 3;
const CHIP_PADDING_SMALL = 2;
const CHIP_POLAROID_BOTTOM_PADDING = 5;
const CHIP_ROUNDED_RADIUS = 4;
const CHIP_BORDER_WIDTH = 2;
const CHIP_SHADOW = '2px 2px 4px rgba(0,0,0,0.3)';
const CHIP_MATTE_INSET = 'inset 0 0 0 2px white';
const CHIP_NEON_GLOW_INNER = 4;
const CHIP_NEON_GLOW_OUTER = 8;

const WRAPPER_BASE = { display: 'inline-block', lineHeight: 0, boxSizing: 'border-box' };

const defaultExtraSize = (bw) => ({ extraW: 2 * bw, extraH: 2 * bw });

const solidWrapperStyle = (displayBorder, color) => ({
  ...WRAPPER_BASE,
  padding: displayBorder,
  backgroundColor: color,
});

const cssBorderWrapperStyle = (borderType) => (displayBorder, color) => ({
  ...WRAPPER_BASE,
  border: `${displayBorder}px ${borderType} ${color}`,
});

const chipSolidStyle = (color) => ({
  padding: CHIP_PADDING_DEFAULT,
  backgroundColor: color,
});

const chipCssBorderStyle = (borderType) => (color) => ({
  border: `${CHIP_BORDER_WIDTH}px ${borderType} ${color}`,
});

function matteInnerPadding(bw) {
  return Math.max(MATTE_INNER_PADDING_MIN, bw * MATTE_INNER_PADDING_RATIO);
}

function getStyleConfig(styleId) {
  const config = BORDER_STYLE_CONFIG[styleId];
  if (!config) {
    throw new Error(`Unknown border style: "${styleId}". Add it to BORDER_STYLE_CONFIG.`);
  }
  return config;
}

export const BORDER_STYLE_CONFIG = {
  solid: {
    extraSize: defaultExtraSize,
    wrapperStyle: solidWrapperStyle,
    chipStyle: chipSolidStyle,
  },
  dashed: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('dashed'),
    chipStyle: chipCssBorderStyle('dashed'),
  },
  dotted: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('dotted'),
    chipStyle: chipCssBorderStyle('dotted'),
  },
  double: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('double'),
    chipStyle: chipCssBorderStyle('double'),
  },
  groove: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('groove'),
    chipStyle: chipCssBorderStyle('groove'),
  },
  ridge: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('ridge'),
    chipStyle: chipCssBorderStyle('ridge'),
  },
  inset: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('inset'),
    chipStyle: chipCssBorderStyle('inset'),
  },
  outset: {
    extraSize: defaultExtraSize,
    wrapperStyle: cssBorderWrapperStyle('outset'),
    chipStyle: chipCssBorderStyle('outset'),
  },
  rounded: {
    extraSize: defaultExtraSize,
    wrapperStyle: (displayBorder, color) => ({
      ...WRAPPER_BASE,
      padding: displayBorder,
      backgroundColor: color,
      borderRadius: Math.max(
        displayBorder * ROUNDED_WRAPPER_RADIUS_RATIO,
        ROUNDED_WRAPPER_RADIUS_MIN
      ),
    }),
    chipStyle: (color) => ({
      padding: CHIP_PADDING_DEFAULT,
      backgroundColor: color,
      borderRadius: CHIP_ROUNDED_RADIUS,
    }),
    imageStyle: (displayBorder, displayW, displayH) => ({
      width: displayW,
      height: displayH,
      display: 'block',
      borderRadius: Math.max(displayBorder * ROUNDED_IMAGE_RADIUS_RATIO, ROUNDED_IMAGE_RADIUS_MIN),
    }),
  },
  shadow: {
    extraSize: (bw) => ({
      extraW: 2 * bw + bw * SHADOW_EXTRA_RATIO,
      extraH: 2 * bw + bw * SHADOW_EXTRA_RATIO,
    }),
    wrapperStyle: (displayBorder, color) => ({
      ...WRAPPER_BASE,
      padding: displayBorder * SHADOW_PADDING_RATIO,
      backgroundColor: color,
      boxShadow: `${displayBorder * SHADOW_OFFSET_X_RATIO}px ${displayBorder * SHADOW_OFFSET_Y_RATIO}px ${displayBorder * SHADOW_BLUR_RATIO}px rgba(0,0,0,${SHADOW_OPACITY})`,
    }),
    chipStyle: (color) => ({
      padding: CHIP_PADDING_SMALL,
      backgroundColor: color,
      boxShadow: CHIP_SHADOW,
    }),
  },
  polaroid: {
    extraSize: (bw) => ({
      extraW: 2 * bw,
      extraH: bw + bw * POLAROID_BOTTOM_PADDING_RATIO,
    }),
    wrapperStyle: (displayBorder, color) => ({
      ...WRAPPER_BASE,
      paddingTop: displayBorder,
      paddingLeft: displayBorder,
      paddingRight: displayBorder,
      paddingBottom: displayBorder * POLAROID_BOTTOM_PADDING_RATIO,
      backgroundColor: color,
    }),
    chipStyle: (color) => ({
      paddingTop: CHIP_PADDING_SMALL,
      paddingLeft: CHIP_PADDING_SMALL,
      paddingRight: CHIP_PADDING_SMALL,
      paddingBottom: CHIP_POLAROID_BOTTOM_PADDING,
      backgroundColor: color,
    }),
  },
  neon: {
    extraSize: (bw) => ({
      extraW: 2 * bw + NEON_EXTRA_PADDING,
      extraH: 2 * bw + NEON_EXTRA_PADDING,
    }),
    wrapperStyle: (displayBorder, color) => {
      const glow = Math.max(NEON_GLOW_MIN, displayBorder);
      const band = Math.max(NEON_BAND_MIN, displayBorder * NEON_BAND_RATIO);
      return {
        ...WRAPPER_BASE,
        padding: band,
        backgroundColor: color,
        boxShadow: [
          `0 0 ${glow * NEON_GLOW_INNER_RATIO}px ${color}`,
          `0 0 ${glow * NEON_GLOW_MID_RATIO}px ${color}`,
          `0 0 ${glow * NEON_GLOW_OUTER_RATIO}px ${color}`,
          `0 0 ${glow * NEON_GLOW_FAR_RATIO}px ${color}${NEON_GLOW_FAR_ALPHA}`,
        ].join(', '),
      };
    },
    chipStyle: (color) => ({
      padding: CHIP_PADDING_SMALL,
      backgroundColor: color,
      boxShadow: `0 0 ${CHIP_NEON_GLOW_INNER}px ${color}, 0 0 ${CHIP_NEON_GLOW_OUTER}px ${color}`,
    }),
  },
  matte: {
    extraSize: (bw) => {
      const inner = bw + matteInnerPadding(bw);
      return { extraW: 2 * inner, extraH: 2 * inner };
    },
    wrapperStyle: solidWrapperStyle,
    chipStyle: (color) => ({
      padding: CHIP_PADDING_SMALL,
      backgroundColor: color,
      boxShadow: CHIP_MATTE_INSET,
    }),
    hasMatteInner: true,
    innerStyle: (displayBorder) => ({
      display: 'inline-block',
      lineHeight: 0,
      padding: matteInnerPadding(displayBorder),
      backgroundColor: MATTE_INNER_COLOR,
    }),
  },
};

export function normalizeHexColor(value) {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

export function getBorderExtraSize(style, bw) {
  return getStyleConfig(style).extraSize(bw);
}

export function getBorderPreviewWrapperStyle(style, displayBorder, color) {
  return getStyleConfig(style).wrapperStyle(displayBorder, color);
}

export function getMatteInnerStyle(displayBorder) {
  return getStyleConfig('matte').innerStyle(displayBorder);
}

export function hasMatteInner(style) {
  return Boolean(getStyleConfig(style).hasMatteInner);
}

export function getBorderPreviewImageStyle(style, displayBorder, displayW, displayH) {
  if (!displayW || !displayH) return undefined;
  const base = { width: displayW, height: displayH, display: 'block' };
  const { imageStyle } = getStyleConfig(style);
  return imageStyle ? imageStyle(displayBorder, displayW, displayH) : base;
}

export function getChipPreviewStyle(styleId, chipColor) {
  return getStyleConfig(styleId).chipStyle(chipColor);
}
