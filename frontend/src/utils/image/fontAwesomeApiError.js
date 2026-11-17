import { parseBackendError } from '../apiError';

export async function throwFontAwesomeApiError(error, options = {}) {
  let errorMessage = await parseBackendError(error);

  if (error.code === 'ECONNABORTED' && options.timeoutMessage) {
    errorMessage = options.timeoutMessage;
  }

  throw new Error(errorMessage);
}
