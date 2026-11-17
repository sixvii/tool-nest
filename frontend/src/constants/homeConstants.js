export const PLACEHOLDER_TOOLS = [
  "Try 'Merge PDF'...",
  "Try 'Compress Image'...",
  "Try 'MOV to MP4'...",
  "Try 'Case Converter'...",
  "Try 'JSON Formatter'...",
  "Try 'MP4 to MP3'...",
  "Try 'PDF to Word'...",
  "Try 'Trim & Cut Video'...",
];

export const FLOATING_ICON_POSITIONS = [
  {
    catIndex: 0,
    style: 'top-[4%] left-[4%] sm:top-[10%] sm:left-[5%]',
    delay: 0.2,
    initialX: -120,
    initialY: 0,
  }, // PDF      → from left
  {
    catIndex: 1,
    style: 'top-[4%] right-[4%] sm:top-[18%] sm:right-[5%]',
    delay: 0.3,
    initialX: 120,
    initialY: 0,
  }, // Image    → from right
  {
    catIndex: 2,
    style: 'top-[38%] left-[4%] sm:top-[45%] sm:left-[4%]',
    delay: 0.4,
    initialX: -80,
    initialY: 80,
  }, // Video    → from bottom-left
  {
    catIndex: 3,
    style: 'top-[38%] right-[4%] sm:top-[52%] sm:right-[4%]',
    delay: 0.5,
    initialX: 80,
    initialY: -80,
  }, // Audio    → from top-right
  {
    catIndex: 4,
    style: 'top-[88%] left-[4%] sm:top-[78%] sm:left-[6%]',
    delay: 0.6,
    initialX: 0,
    initialY: 110,
  }, // Text Tools → from bottom
  {
    catIndex: 5,
    style: 'top-[88%] right-[4%] sm:top-[84%] sm:right-[6%]',
    delay: 0.7,
    initialX: 0,
    initialY: -110,
  }, // File     → from top
];

export const DEFAULT_FEATURED_TOOLS = [
  {
    name: 'Merge PDF',
    categoryId: 'pdf',
    desc: 'Combine multiple PDF files into one seamless document instantly.',
  },
  {
    name: 'Compress Image Size',
    categoryId: 'image',
    desc: 'Reduce image file size up to 90% without visible quality loss.',
  },
  {
    name: 'MOV to MP4',
    categoryId: 'video',
    desc: 'Convert MOV video files to universal MP4 format in seconds.',
  },
  {
    name: 'Case Converter',
    categoryId: 'ai-write',
    desc: 'Transform text between uppercase, lowercase, title case and more.',
  },
  {
    name: 'JSON Formatter',
    categoryId: 'file',
    desc: 'Clean, validate, and beautify structured JSON data instantly.',
  },
  {
    name: 'MP4 to MP3',
    categoryId: 'audio',
    desc: 'Extract high-quality audio from any MP4 video in one click.',
  },
  {
    name: 'PDF to Word',
    categoryId: 'pdf',
    desc: 'Convert PDF documents to fully editable Word files with OCR.',
  },
  {
    name: 'Resize Image',
    categoryId: 'image',
    desc: 'Resize images to any exact dimensions without quality loss.',
  },
  {
    name: 'Split PDF',
    categoryId: 'pdf',
    desc: 'Extract pages or split a large PDF into multiple documents.',
  },
  {
    name: 'WebP to JPG',
    categoryId: 'image',
    desc: 'Convert WebP images to JPG for broader browser compatibility.',
  },
  {
    name: 'Find & Replace',
    categoryId: 'ai-write',
    desc: 'Find and replace any text across your documents with precision.',
  },
  {
    name: 'CSV to Excel',
    categoryId: 'file',
    desc: 'Convert CSV spreadsheet files to Excel format automatically.',
  },
];

export const TRUST_BADGES = ['No sign-up required', '100% Free', 'Instant results'];
