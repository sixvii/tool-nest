import { validateFile } from './fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../constants/fileSizeLimits';

export const validateCsvFile = (file) => {
  if (!file) return 'Please select a file.';
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return 'Only .csv files are allowed.';
  }
  try {
    validateFile(file, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
  } catch (err) {
    return err.message;
  }
  return null;
};
