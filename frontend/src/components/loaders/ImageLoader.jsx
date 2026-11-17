import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_STAGES = [
  { label: 'Uploading image...', at: 0 },
  { label: 'Processing image...', at: 1800 },
  { label: 'Finalizing file...', at: 3600 },
  { label: 'Almost done...', at: 5000 },
];

export default function ImageLoader({ dimensions }) {
  const [statusIndex, setStatusIndex] = useState(0);

  // Reserved props for the future file information header: fileName, fileSize, targetFormat.
  // const ext = fileName?.split('.').pop() ?? '';

  // Staged status text driven by an internal timer (no progress prop)
  useEffect(() => {
    const timers = STATUS_STAGES.slice(1).map((stage, idx) =>
      setTimeout(() => setStatusIndex(idx + 1), stage.at)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const status = STATUS_STAGES[statusIndex].label;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl p-[1.5px] bg-gradient-to-br from-blue-200 via-white to-indigo-200 shadow-sm">
      <div className="rounded-2xl bg-white overflow-hidden">
        {/* Top — File Info */}
        {/* <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black bg-blue-500 flex-shrink-0">
              {ext.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{fileName}</p>
              <p className="text-xs text-slate-400 truncate">
                {fileSize} • {targetFormat}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 flex-shrink-0 whitespace-nowrap">
            Image tools
          </span>
        </div> */}

        {/* Middle — Image Preview Panel */}
        <div className="relative flex items-center justify-center bg-slate-50 px-6 py-10 overflow-hidden">
          <div className="relative w-72 h-44 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-200">
            {/* Continuous top-to-bottom scan-line sweep */}
            <div
              className="absolute inset-x-0 h-16"
              style={{
                animation: 'scan-sweep 2.4s linear infinite',
                background:
                  'linear-gradient(to bottom, transparent, rgba(0,0,0,0.08) 35%, rgba(255,255,255,0.9) 50%, rgba(0,0,0,0.08) 65%, transparent)',
              }}
            />

            {/* Dimensions badge */}
            {dimensions && (
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                {dimensions}
              </span>
            )}
          </div>
        </div>

        {/* Bottom — Status */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
            <span className="text-xs font-semibold text-slate-600">{status}</span>
          </div>

          {/* Indeterminate sliding bar — matches VideoLoader/AudioLoader/FileLoader/PdfLoader */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full w-1/3 bg-blue-500 rounded-full"
              style={{ animation: 'indeterminate-slide 1.6s ease-in-out infinite' }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-sweep {
          0% { top: -2.5rem; }
          100% { top: 100%; }
        }
        @keyframes indeterminate-slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(250%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

ImageLoader.propTypes = {
  fileName: PropTypes.string,
  fileSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  targetFormat: PropTypes.string,
  dimensions: PropTypes.string,
};
