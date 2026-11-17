import { pptToPdf, pdfToPpt, msgToPdf, emlToPdf } from '../services/officeService';
import {
  epubToPdf,
  pdfToEpub,
  mobiToPdf,
  pdfToMobi,
  azw3ToPdf,
  pdfToAzw3,
} from '../services/ebookService';

const CONVERSION_FN_MAP = {
  pdf: {
    ppt: pdfToPpt,
    epub: pdfToEpub,
    mobi: pdfToMobi,
    azw3: pdfToAzw3,
  },
  ppt: { pdf: pptToPdf },
  pptx: { pdf: pptToPdf },
  epub: { pdf: epubToPdf },
  mobi: { pdf: mobiToPdf },
  azw3: { pdf: azw3ToPdf },
  msg: { pdf: msgToPdf },
  eml: { pdf: emlToPdf },
};

export const getConversionFn = (fromExt, toValue) => CONVERSION_FN_MAP[fromExt]?.[toValue] ?? null;

export const getExt = (filename) => filename.split('.').pop().toLowerCase();
