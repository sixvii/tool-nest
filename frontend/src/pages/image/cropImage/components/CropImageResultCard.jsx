import PropTypes from 'prop-types';
import { useBlobPreviewUrl } from '../../../../hooks/useBlobPreviewUrl';
import { CROP_IMAGE_COPY } from '../../../../constants/image/cropImage/cropImageConstants';
import RoundImagePreviewFrame from '../../roundImage/components/RoundImagePreviewFrame';

export default function CropImageResultCard({ fileName, resultBlob }) {
  const previewUrl = useBlobPreviewUrl(resultBlob);

  if (!resultBlob || !previewUrl) {
    return (
      <RoundImagePreviewFrame
        heading={CROP_IMAGE_COPY.previewHeading}
        fileName={fileName}
        panelStyle={{ backgroundColor: '#f8fafc' }}
      >
        <p className="text-sm text-slate-500 text-center">{CROP_IMAGE_COPY.previewHint}</p>
      </RoundImagePreviewFrame>
    );
  }

  return (
    <RoundImagePreviewFrame
      heading={CROP_IMAGE_COPY.previewHeading}
      fileName={fileName}
      panelStyle={{ backgroundColor: '#f8fafc' }}
    >
      <p className="text-sm text-slate-600 mb-4 w-full text-center">
        {CROP_IMAGE_COPY.previewHint}
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center w-full">
        <img
          src={previewUrl}
          alt="Cropped preview"
          className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm"
        />
      </div>
    </RoundImagePreviewFrame>
  );
}

CropImageResultCard.propTypes = {
  fileName: PropTypes.string,
  resultBlob: PropTypes.instanceOf(Blob),
};

CropImageResultCard.defaultProps = {
  fileName: null,
  resultBlob: null,
};
