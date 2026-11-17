import { validateFile } from './fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../constants/fileSizeLimits';

export const validateXmlFile = (file) => {
  if (!file) return 'Please select a file.';
  if (!file.name.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
    return 'Only .xml files are allowed.';
  }
  try {
    validateFile(file, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
  } catch (err) {
    return err.message;
  }
  return null;
};
