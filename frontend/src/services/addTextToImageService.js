import api from './api';
import { postWithPollingResponse } from './taskPolling';

export async function addTextToImage({
  file,
  text,
  x,
  y,
  fontSize,
  color,
  rotation = 0,
  fontFamily = 'Arial',
}) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('text', text);
  fd.append('x', x);
  fd.append('y', y);
  fd.append('font_size', fontSize);
  fd.append('color', color);
  fd.append('rotation', rotation);
  fd.append('font_family', fontFamily);

  const { data } = await postWithPollingResponse(
    api,
    '/api/image/add-text',
    fd,
    undefined,
    '/api/image/task'
  );
  return data;
}
