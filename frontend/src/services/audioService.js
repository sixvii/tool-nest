import { mediaApi } from './api';
import { AUDIO_FORMAT_MAP } from '../constants/audioConstants';
import { postWithPolling } from './taskPolling';

const HEADERS = {
  headers: { 'Content-Type': undefined, 'ngrok-skip-browser-warning': 'true' },
};

const POLL_URL = '/api/audio/task';

export async function extractAudio(file, format = 'mp3', onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('format', format);
  return postWithPolling(mediaApi, '/api/audio/extract-audio', fd, HEADERS, POLL_URL, onProgress);
}

export async function convertAudioFormat(file, targetExt, onProgress) {
  const sourceExt = file.name.split('.').pop().toLowerCase();
  const endpoint = AUDIO_FORMAT_MAP[sourceExt]?.[targetExt];
  if (!endpoint)
    throw new Error(`Conversion from .${sourceExt} to .${targetExt} is not supported.`);
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(mediaApi, endpoint, fd, HEADERS, POLL_URL, onProgress);
}
