import api from './api';

export async function checkHealth() {
  try {
    const { data } = await api.get('/health');
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

export { parseBackendError } from '../utils/apiError';
