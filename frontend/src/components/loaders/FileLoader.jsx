import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_STAGES = [
  { label: 'Reading file...', at: 0 },
  { label: 'Mapping columns...', at: 1800 },
  { label: 'Converting...', at: 3600 },
  { label: 'Finalizing...', at: 5400 },
];

const GRID_ROW_IDS = ['grid-row-1', 'grid-row-2', 'grid-row-3', 'grid-row-4'];
const GRID_COL_IDS = ['grid-col-1', 'grid-col-2', 'grid-col-3'];

// Reserved for a future file information header.
// const getExtColor = (ext) => {
//   const colors = {
//     csv: 'bg-blue-500',
//     xlsx: 'bg-emerald-500',
//     xls: 'bg-emerald-600',
//     json: 'bg-yellow-500',
//     xml: 'bg-purple-500',
//     tsv: 'bg-indigo-500',
//     ods: 'bg-red-500',
//   };
//   return colors[ext?.toLowerCase()] ?? 'bg-slate-500';
// };

export default function FileLoader({ sourceFormat, targetFormat }) {
  const [statusIndex, setStatusIndex] = useState(0);

  // Reserved props for the future file information header: fileName.
  // Cycling status text — loops forever
  useEffect(() => {
    const timers = STATUS_STAGES.map((stage, idx) =>
      setTimeout(() => {
        setStatusIndex((idx + 1) % STATUS_STAGES.length);
      }, stage.at)
    );

    // Schedule the loop restart
    const loopTimer = setTimeout(
      () => {
        setStatusIndex(0);
      },
      STATUS_STAGES.at(-1).at + 100
    );

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(loopTimer);
    };
  }, []);

  const status = STATUS_STAGES[statusIndex].label;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Top — File Info */}
      {/* <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black ${getExtColor(sourceFormat)}`}
          >
            {ext.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[160px] sm:max-w-xs">
              {fileName}
            </p>
            <p className="text-xs text-slate-400">{targetFormat}</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-600">File tools</span>
      </div> */}

      {/* Middle — Spreadsheet Grid */}
      <div className="bg-slate-50 px-6 py-8 overflow-hidden">
        {/* Format pills */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-full">
            {sourceFormat}
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
            {targetFormat}
          </span>
        </div>

        {/* Animated data-bar grid (3 cols x 4 rows) */}
        <div className="space-y-3">
          {GRID_ROW_IDS.map((rowId) => (
            <div key={rowId} className="flex gap-3">
              {GRID_COL_IDS.map((colId, col) => {
                return (
                  <div
                    key={colId}
                    className="flex-1 h-8 rounded-lg bg-slate-100 relative overflow-hidden"
                  >
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-2/3 rounded-full"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(96,165,250,0) 0%, rgba(37,99,235,0.9) 50%, rgba(96,165,250,0) 100%)',
                        animation: 'cell-bar-slide 1.4s ease-in-out infinite alternate',
                        animationDelay: `${col * 0.15}s`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — Status */}
      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
          <span className="text-xs font-semibold text-slate-600">{status}</span>
        </div>

        {/* Indeterminate sliding bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full w-1/3 bg-blue-500 rounded-full"
            style={{
              animation: 'indeterminate-slide 1.6s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes cell-bar-slide {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(50%); }
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

FileLoader.propTypes = {
  fileName: PropTypes.string,
  sourceFormat: PropTypes.string,
  targetFormat: PropTypes.string,
};
