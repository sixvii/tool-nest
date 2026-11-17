import { validateFile } from './fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../constants/fileSizeLimits';

export const validateXlsxFile = (file) => {
  if (!file) return 'Please select a file.';
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
    return 'Only .xlsx files are allowed.';
  }
  try {
    validateFile(file, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
  } catch (err) {
    return err.message;
  }
  return null;
};
