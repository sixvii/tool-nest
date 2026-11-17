import api, { mediaApi } from '../services/api';
import { parseBackendError } from './apiError';
import { toastError, dismissAllToasts } from './toastUtils';

function attachErrorToast(instance) {
  instance.interceptors.request.use((config) => {
    dismissAllToasts();
    return config;
  });
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      toastError(await parseBackendError(error));
      throw error;
    }
  );
}

export function initApiErrorToasts() {
  attachErrorToast(api);
  attachErrorToast(mediaApi);
}
