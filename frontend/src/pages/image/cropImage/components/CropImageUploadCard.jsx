import PropTypes from 'prop-types';
import { FileText, X } from 'lucide-react';
import FileUpload from '../../../../components/ui/FileUpload';
import Card from '../../../../components/ui/Card';
import { CROP_IMAGE_COPY } from '../../../../constants/image/cropImage/cropImageConstants';

function CropImageFileBar({ file, onClear }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
        <span className="text-[10px] text-slate-400 flex-shrink-0">
          {(file.size / 1024).toFixed(0)} KB
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove image"
        className="p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
      </button>
    </div>
  );
}

CropImageFileBar.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  onClear: PropTypes.func.isRequired,
};

export default function CropImageUploadCard({ file, onFiles }) {
  if (file) {
    return (
      <Card>
        <CropImageFileBar file={file} onClear={() => onFiles([])} />
      </Card>
    );
  }

  return (
    <Card>
      <FileUpload
        label={CROP_IMAGE_COPY.uploadLabel}
        accept="image/*"
        multiple={false}
        onFiles={onFiles}
      />
    </Card>
  );
}

CropImageUploadCard.propTypes = {
  file: PropTypes.instanceOf(File),
  onFiles: PropTypes.func.isRequired,
};

CropImageUploadCard.defaultProps = {
  file: null,
};
