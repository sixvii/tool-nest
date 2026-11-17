import { mediaApi } from './api';
import { FORMAT_MAP } from '../constants/videoConstants';
import { postWithPolling } from './taskPolling';

const HEADERS = {
  headers: { 'Content-Type': undefined, 'ngrok-skip-browser-warning': 'true' },
};

const POLL_URL = '/api/video/task';

export async function trimVideo(file, startTime, endTime, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('start_time', startTime);
  fd.append('end_time', endTime);
  return postWithPolling(mediaApi, '/api/video/trim', fd, HEADERS, POLL_URL, onProgress);
}

export async function cutEdgesVideo(file, frontCut, backCut, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('front_cut', frontCut);
  fd.append('back_cut', backCut);
  return postWithPolling(mediaApi, '/api/video/cut-edges', fd, HEADERS, POLL_URL, onProgress);
}

export async function compressMovVideo(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(mediaApi, '/api/video/compress-mov', fd, HEADERS, POLL_URL, onProgress);
}

export async function compressAviVideo(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(mediaApi, '/api/video/compress-avi', fd, HEADERS, POLL_URL, onProgress);
}

export async function compressMkvVideo(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(mediaApi, '/api/video/compress-mkv', fd, HEADERS, POLL_URL, onProgress);
}

export async function compressVideo(file, crf, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('crf', crf);
  return postWithPolling(mediaApi, '/api/video/compress', fd, HEADERS, POLL_URL, onProgress);
}

export async function resizeVideo(file, width, height, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('width', width);
  fd.append('height', height);
  return postWithPolling(mediaApi, '/api/video/resize', fd, HEADERS, POLL_URL, onProgress);
}

export async function addSubtitles(videoFile, srtFile, onProgress) {
  const fd = new FormData();
  fd.append('file', videoFile);
  fd.append('subtitle', srtFile);
  return postWithPolling(mediaApi, '/api/video/add-subtitles', fd, HEADERS, POLL_URL, onProgress);
}

export async function muteVideo(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(mediaApi, '/api/video/mute', fd, HEADERS, POLL_URL, onProgress);
}

export async function convertVideoFormat(file, targetExt, onProgress) {
  const sourceExt = file.name.split('.').pop().toLowerCase();
  const endpoint = FORMAT_MAP[sourceExt]?.[targetExt];
  if (!endpoint)
    throw new Error(`Conversion from .${sourceExt} to .${targetExt} is not supported.`);
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(mediaApi, endpoint, fd, HEADERS, POLL_URL, onProgress);
}
