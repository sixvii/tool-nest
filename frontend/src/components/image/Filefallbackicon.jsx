export default function FileFallbackIcon() {
  return (
    <div className="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
      <svg
        className="w-10 h-10 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}
