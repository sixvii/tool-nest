import { CROP_IMAGE_COPY } from '../../../../constants/image/cropImage/cropImageConstants';

export default function CropImageEmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-white text-slate-300">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="6" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10 12h14M10 17h14M10 22h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="22" y="22" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-400">{CROP_IMAGE_COPY.emptyPreviewTitle}</p>
        <p className="text-[10px] text-slate-300 mt-0.5">{CROP_IMAGE_COPY.emptyPreviewHint}</p>
      </div>
    </div>
  );
}
