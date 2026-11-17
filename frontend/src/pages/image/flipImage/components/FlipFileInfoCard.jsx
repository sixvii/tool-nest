import PropTypes from 'prop-types';
import { FileImage } from 'lucide-react';
import { getImageFileMeta } from '../../../../utils/image/imageFileUtils';

export default function FlipFileInfoCard({ file, heading }) {
  const meta = getImageFileMeta(file);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="flex items-start gap-2.5">
        <FileImage className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {heading}
          </p>
          <p className="text-sm font-semibold text-slate-800 truncate">{meta.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{meta.detailLabel}</p>
        </div>
      </div>
    </div>
  );
}

FlipFileInfoCard.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  heading: PropTypes.string.isRequired,
};
