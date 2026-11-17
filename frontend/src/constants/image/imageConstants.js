export const TABS = ['Custom', 'Percent', 'Social'];

export const BORDER_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'double', label: 'Double' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'groove', label: 'Groove' },
  { id: 'ridge', label: 'Ridge' },
  { id: 'inset', label: 'Inset' },
  { id: 'outset', label: 'Outset' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'neon', label: 'Neon' },
];

export const PERCENT_CHIPS = [25, 50, 75, 100];

export const SOCIAL_PRESETS = {
  Facebook: [
    { label: 'Profile (170×170)', w: 170, h: 170 },
    { label: 'Cover (820×312)', w: 820, h: 312 },
    { label: 'Post Landscape (1200×630)', w: 1200, h: 630 },
    { label: 'Post Portrait (630×1200)', w: 630, h: 1200 },
    { label: 'Ad (1280×720)', w: 1280, h: 720 },
  ],
  Instagram: [
    { label: 'Profile (110×110)', w: 110, h: 110 },
    { label: 'Post Square (1080×1080)', w: 1080, h: 1080 },
    { label: 'Post Portrait (1080×1350)', w: 1080, h: 1350 },
    { label: 'Post Landscape (1080×566)', w: 1080, h: 566 },
    { label: 'Story (1080×1920)', w: 1080, h: 1920 },
  ],
  Twitter: [
    { label: 'Profile (400×400)', w: 400, h: 400 },
    { label: 'Header (1500×500)', w: 1500, h: 500 },
    { label: 'Image (1024×512)', w: 1024, h: 512 },
    { label: 'Card (1200×628)', w: 1200, h: 628 },
    { label: 'Ad (1200×675)', w: 1200, h: 675 },
  ],
  LinkedIn: [
    { label: 'Profile (400×400)', w: 400, h: 400 },
    { label: 'Cover (1584×396)', w: 1584, h: 396 },
    { label: 'Post (1200×1200)', w: 1200, h: 1200 },
  ],
  YouTube: [
    { label: 'Profile (800×800)', w: 800, h: 800 },
    { label: 'Thumbnail (1280×720)', w: 1280, h: 720 },
    { label: 'Channel Art (2560×1440)', w: 2560, h: 1440 },
  ],
  Pinterest: [
    { label: 'Profile (165×165)', w: 165, h: 165 },
    { label: 'Pin (1000×1500)', w: 1000, h: 1500 },
    { label: 'Board Cover (600×600)', w: 600, h: 600 },
  ],
};

export const PLATFORMS = Object.keys(SOCIAL_PRESETS);

export const FORMAT_MAP = {
  webp: {
    jpg: { url: '/api/convert/image/webp-to-jpg', multi: false },
    png: { url: '/api/convert/image/webp-to-png', multi: false },
    avif: { url: '/api/convert/image/webp-to-avif', multi: false },
    gif: { url: '/api/convert/image/webp-to-gif', multi: true },
  },
  jpg: {
    png: { url: '/api/convert/image/jpg-to-png', multi: false },
    webp: { url: '/api/convert/image/jpg-to-webp', multi: false },
    avif: { url: '/api/convert/image/jpg-to-avif', multi: false },
    gif: { url: '/api/convert/image/jpg-to-gif', multi: true },
    tiff: { url: '/api/convert/image/jpg-to-tiff', multi: false },
  },
  png: {
    jpg: { url: '/api/convert/image/png-to-jpg', multi: false },
    avif: { url: '/api/convert/image/png-to-avif', multi: false },
    gif: { url: '/api/convert/image/png-to-gif', multi: true },
    eps: { url: '/api/convert/image/png-to-eps', multi: false },
    tiff: { url: '/api/convert/image/png-to-tiff', multi: false },
  },
  gif: {
    jpg: { url: '/api/convert/image/gif-to-jpg', multi: false },
    png: { url: '/api/convert/image/gif-to-png', multi: false },
    avif: { url: '/api/convert/image/gif-to-avif', multi: false },
  },
  tiff: {
    jpg: { url: '/api/convert/image/tiff-to-jpg', multi: false },
    png: { url: '/api/convert/image/tiff-to-png', multi: false },
  },
  eps: {
    png: { url: '/api/convert/image/eps-to-png', multi: false },
    jpg: { url: '/api/convert/image/eps-to-jpg', multi: false },
    svg: { url: '/api/convert/image/eps-to-svg', multi: false },
  },
};

export const SOURCE_FORMAT = {
  'WebP to JPG': { accept: '.webp', defaultTarget: 'jpg', allowMultiple: false },
  'PNG to JPG': { accept: '.png', defaultTarget: 'jpg', allowMultiple: false },
  'WEBP to PNG': { accept: '.webp', defaultTarget: 'png', allowMultiple: false },
  'JPG to PNG': { accept: '.jpg,.jpeg', defaultTarget: 'png', allowMultiple: false },
  'JPG to WEBP': { accept: '.jpg,.jpeg', defaultTarget: 'webp', allowMultiple: false },
  'TIFF to JPG': { accept: '.tif,.tiff', defaultTarget: 'jpg', allowMultiple: false },
  'TIFF to PNG': { accept: '.tif,.tiff', defaultTarget: 'png', allowMultiple: false },
  'JPG to AVIF': { accept: '.jpg,.jpeg', defaultTarget: 'avif', allowMultiple: false },
  'PNG to AVIF': { accept: '.png', defaultTarget: 'avif', allowMultiple: false },
  'WEBP to AVIF': { accept: '.webp', defaultTarget: 'avif', allowMultiple: false },
  'GIF to AVIF': { accept: '.gif', defaultTarget: 'avif', allowMultiple: false },
  'GIF to JPG': { accept: '.gif', defaultTarget: 'jpg', allowMultiple: false },
  'GIF to PNG': { accept: '.gif', defaultTarget: 'png', allowMultiple: false },
  'JPG to GIF': { accept: '.jpg,.jpeg', defaultTarget: 'gif', allowMultiple: true },
  'PNG to Gif': { accept: '.png', defaultTarget: 'gif', allowMultiple: true },
  'WEBP to GIF': { accept: '.webp', defaultTarget: 'gif', allowMultiple: true },
  'PNG to EPS': { accept: '.png', defaultTarget: 'eps', allowMultiple: false },
  'EPS to PNG': { accept: '.eps', defaultTarget: 'png', allowMultiple: false },
  'EPS to JPG': { accept: '.eps', defaultTarget: 'jpg', allowMultiple: false },
  'EPS to SVG': { accept: '.eps', defaultTarget: 'svg', allowMultiple: false },
  'PNG to TIFF': { accept: '.png', defaultTarget: 'tiff', allowMultiple: false },
  'JPG to Tiff': { accept: '.jpg,.jpeg', defaultTarget: 'tiff', allowMultiple: false },
};

export const normalizeExt = (ext) => {
  if (ext === 'jpeg') return 'jpg';
  if (ext === 'tif') return 'tiff';
  return ext;
};

export const SUPPORTED_EXTENSIONS = new Set(Object.keys(FORMAT_MAP));
