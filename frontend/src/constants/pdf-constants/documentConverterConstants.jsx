export const CONVERSION_OPTIONS = {
  pdf: [
    { label: 'PowerPoint (.pptx)', value: 'ppt', ext: 'pptx' },
    { label: 'EPUB', value: 'epub', ext: 'epub' },
    { label: 'MOBI', value: 'mobi', ext: 'mobi' },
    { label: 'AZW3', value: 'azw3', ext: 'azw3' },
  ],
  ppt: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
  pptx: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
  epub: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
  mobi: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
  azw3: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
  msg: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
  eml: [{ label: 'PDF', value: 'pdf', ext: 'pdf' }],
};

export const TOOL_CONFIG = {
  'PowerPoint to PDF': { accept: '.ppt,.pptx', forceOutput: null },
  'PDF to PowerPoint': { accept: '.pdf', forceOutput: 'ppt' },
  'MS Outlook to PDF': { accept: '.msg,.eml', forceOutput: null },
  'EPUB to PDF': { accept: '.epub', forceOutput: null },
  'PDF to EPUB': { accept: '.pdf', forceOutput: 'epub' },
  'MOBI to PDF': { accept: '.mobi', forceOutput: null },
  'PDF to MOBI': { accept: '.pdf', forceOutput: 'mobi' },
  'AZW3 to PDF': { accept: '.azw3', forceOutput: null },
  'PDF to AZW3': { accept: '.pdf', forceOutput: 'azw3' },
};
