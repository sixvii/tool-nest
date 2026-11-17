import {
  PROFILE_PHOTO_MAKER_COPY,
  PROFILE_PHOTO_OUTPUT,
  PROFILE_PHOTO_PREVIEW_LABEL_KEYS,
} from '../../../constants/image/profilePhotoMaker/profilePhotoMakerConstants';
import { buildDerivedFilename } from '../../fileUtils';
import { mergeImageToolPreviewLabels, pickPreviewLabelsFromCopy } from '../imageToolPreviewUtils';

export function getProfilePhotoPreviewLabels(copy = PROFILE_PHOTO_MAKER_COPY) {
  return mergeImageToolPreviewLabels(
    pickPreviewLabelsFromCopy(copy, PROFILE_PHOTO_PREVIEW_LABEL_KEYS)
  );
}

export function getProfilePhotoDownloadFilename(filename, shape, outputSize) {
  return buildDerivedFilename(filename, {
    suffix: `${PROFILE_PHOTO_OUTPUT.suffix}-${shape}-${outputSize}`,
    extension: PROFILE_PHOTO_OUTPUT.extension,
  });
}
