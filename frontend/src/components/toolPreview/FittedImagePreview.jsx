import PropTypes from 'prop-types';
import { useBlobPreviewUrl } from '../../hooks/useBlobPreviewUrl';

export default function FittedImagePreview({ source, alt = 'Preview', className = '' }) {
  const src = useBlobPreviewUrl(source);

  if (!src) {
    return (
      <div className="flex items-center justify-center min-h-[32vh] w-full">
        <p className="text-xs text-slate-400">Loading preview…</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center min-h-[32vh] w-full p-3 ${className}`.trim()}>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-lg shadow-sm"
      />
    </div>
  );
}

FittedImagePreview.propTypes = {
  source: PropTypes.oneOfType([PropTypes.instanceOf(Blob), PropTypes.instanceOf(File)]),
  alt: PropTypes.string,
  className: PropTypes.string,
};
