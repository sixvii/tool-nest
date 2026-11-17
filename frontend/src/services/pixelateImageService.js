import api from './api';

export async function pixelateImage(file, pixelSize) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('pixel_size', pixelSize);
  const { data } = await api.post('/api/image/pixelate', fd, {
    responseType: 'blob',
  });
  return data;
}
