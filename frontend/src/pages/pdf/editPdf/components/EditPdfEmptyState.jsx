import { EDIT_PDF_LAYOUT } from '../../../../constants/pdf-constants/editPdf/editPdfLayoutConstants';

export default function EditPdfEmptyState() {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 gap-4 px-6 py-10 ${EDIT_PDF_LAYOUT.emptyPreview}`}
    >
      <svg className="w-14 h-14 text-slate-200" fill="none" viewBox="0 0 56 56">
        <rect x="8" y="6" width="32" height="40" rx="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M14 18h20M14 25h20M14 32h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="42" cy="42" r="10" fill="#F1F5F9" stroke="currentColor" strokeWidth="2" />
        <path d="M38 42h8M42 38v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold text-slate-400">Upload a PDF to start editing</p>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Click existing text to edit · hover to see all text blocks · add shapes, images, drawings
        </p>
      </div>
    </div>
  );
}
