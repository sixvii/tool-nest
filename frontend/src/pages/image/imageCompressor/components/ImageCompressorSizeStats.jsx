import PropTypes from 'prop-types';
import Badge from '../../../../components/ui/Badge';
import { IMAGE_COMPRESSOR_COPY } from '../../../../constants/image/imageCompressor/imageCompressorConstants';
import { getCompressionStats } from '../../../../utils/image/imageCompressor/imageCompressorUtils';

export default function ImageCompressorSizeStats({ originalSize, compressedSize }) {
  const stats = getCompressionStats(originalSize, compressedSize);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
          <p className="text-xs text-slate-400 uppercase font-bold mb-1">
            {IMAGE_COMPRESSOR_COPY.originalSizeLabel}
          </p>
          <p className="text-lg font-bold text-slate-700">{stats.originalLabel}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
          <p className="text-xs text-emerald-500 uppercase font-bold mb-1">
            {IMAGE_COMPRESSOR_COPY.compressedSizeLabel}
          </p>
          <p className="text-lg font-bold text-emerald-600">{stats.compressedLabel}</p>
        </div>
      </div>

      {stats.showSavedBadge && (
        <div className="mt-3 text-center">
          <Badge variant="success">{stats.savedBadge}</Badge>
        </div>
      )}
    </div>
  );
}

ImageCompressorSizeStats.propTypes = {
  originalSize: PropTypes.number.isRequired,
  compressedSize: PropTypes.number.isRequired,
};
