export const AUDIO_FORMAT_MAP = {
  m4a: {
    mp3: '/api/audio/m4a-to-mp3',
    wav: '/api/audio/m4a-to-wav',
    mp4: '/api/audio/m4a-to-mp4',
  },
  ogg: {
    mp3: '/api/audio/ogg-to-mp3',
    wav: '/api/audio/ogg-to-wav',
  },
  aac: {
    mp3: '/api/audio/aac-to-mp3',
    wav: '/api/audio/aac-to-wav',
    flac: '/api/audio/aac-to-flac',
    m4r: '/api/audio/aac-to-m4r',
    mp4: '/api/audio/aac-to-mp4',
  },
  mp4: {
    mp3: '/api/audio/mp4-to-mp3',
    wav: '/api/audio/mp4-to-wav',
    ogg: '/api/audio/mp4-to-ogg',
  },
  mov: {
    mp3: '/api/audio/mov-to-mp3',
    wav: '/api/audio/mov-to-wav',
  },
  mkv: {
    mp3: '/api/audio/mkv-to-mp3',
  },
  webm: {
    mp3: '/api/audio/webm-to-mp3',
  },
  avi: {
    mp3: '/api/audio/avi-to-mp3',
  },
};

export const SUPPORTED_AUDIO_EXTENSIONS = new Set(['m4a', 'ogg', 'aac']);

// ── Audio Extractor ───────────────────────────────────────────────────────────
export const ACCEPTED_VIDEO_TYPES = '.mp4,.mov,.mkv,.webm,.avi';
export const ACCEPTED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi']);
export const DEFAULT_EXTRACT_FORMAT = 'mp3';

export const EXTRACT_FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3', description: 'Best compatibility', bitrate: '~192 kbps' },
  { value: 'wav', label: 'WAV', description: 'Lossless · large file', bitrate: '~1411 kbps' },
  { value: 'ogg', label: 'OGG', description: 'Open · smaller size', bitrate: '~128 kbps' },
  { value: 'flac', label: 'FLAC', description: 'Lossless compressed', bitrate: '~600 kbps' },
];

export const AUDIO_SOURCE_FORMAT = {
  'M4A to MP3': { accept: '.m4a', defaultTarget: 'mp3' },
  'OGG to MP3': { accept: '.ogg', defaultTarget: 'mp3' },
  'AAC to MP3': { accept: '.aac', defaultTarget: 'mp3' },
  'M4A to WAV': { accept: '.m4a', defaultTarget: 'wav' },
  'OGG to WAV': { accept: '.ogg', defaultTarget: 'wav' },
  'AAC to WAV': { accept: '.aac', defaultTarget: 'wav' },
  'AAC to FLAC': { accept: '.aac', defaultTarget: 'flac' },
  'AAC to M4R': { accept: '.aac', defaultTarget: 'm4r' },
};
