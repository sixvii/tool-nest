import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const STATUSES = ['Uploading...', 'Converting...', 'Finalizing...'];
const STATUS_DELAYS = [3000, 7000];

export default function PdfLoader({ totalPages = 0 }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [pageCounter, setPageCounter] = useState(1);
  const [cardOrder, setCardOrder] = useState([0, 1, 2]);

  // Reserved props for the future file information header: fileName, operationLabel.

  // Status label cycling — time-based, not fake-progress-based
  useEffect(() => {
    const timers = STATUS_DELAYS.map((delay, i) => setTimeout(() => setStatusIdx(i + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Page counter — only runs when totalPages is provided
  useEffect(() => {
    if (!totalPages) return;
    const interval = setInterval(() => {
      setPageCounter((prev) => (prev >= totalPages ? 1 : prev + 1));
    }, 300);
    return () => clearInterval(interval);
  }, [totalPages]);

  // Card shuffle
  useEffect(() => {
    const interval = setInterval(() => {
      setCardOrder((prev) => {
        const [first, ...rest] = prev;
        return [...rest, first];
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const cardStyles = [
    { zIndex: 3, transform: 'translateX(0px) translateY(0px) rotate(0deg)', opacity: 1 },
    { zIndex: 2, transform: 'translateX(20px) translateY(8px) rotate(4deg)', opacity: 0.75 },
    { zIndex: 1, transform: 'translateX(-20px) translateY(14px) rotate(-4deg)', opacity: 0.5 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Top — File Info */}
      {/* <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black bg-blue-600">
            PDF
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[160px] sm:max-w-xs">
              {fileName}
            </p>
            <p className="text-xs text-slate-400">
              {operationLabel}
              {totalPages > 0 ? ` • ${totalPages} pages` : ''}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-600">PDF tools</span>
      </div> */}

      {/* Middle — Card Stack */}
      <div className="relative flex flex-col items-center justify-center bg-slate-50 px-6 py-12 min-h-[280px]">
        {totalPages > 0 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-full px-4 py-1 shadow-sm">
            <span className="text-xs font-semibold text-slate-600">
              p. {pageCounter} / {totalPages}
            </span>
          </div>
        )}

        <div className="relative w-40 h-52 mt-6">
          {cardOrder.map((cardIndex, position) => (
            <div
              key={cardIndex}
              className="absolute inset-0 bg-white rounded-2xl border border-slate-200 shadow-md transition-all duration-700 ease-in-out"
              style={cardStyles[position]}
            >
              <div className="p-4 pt-5">
                <div className="h-2 bg-slate-200 rounded-full w-3/4 mb-2" />
                <div className="h-2 bg-slate-100 rounded-full w-full mb-2" />
                <div className="h-2 bg-slate-100 rounded-full w-5/6" />
              </div>
              {position === 0 && (
                <div className="absolute bottom-4 right-4 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M3 8l3.5 3.5L13 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — Status */}
      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
          <span className="text-xs font-semibold text-slate-600">{STATUSES[statusIdx]}</span>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full w-1/3 bg-blue-500 rounded-full"
            style={{ animation: 'indeterminate-slide 1.6s ease-in-out infinite' }}
          />
        </div>

        <style>{`
          @keyframes indeterminate-slide {
            0%   { transform: translateX(-100%); }
            50%  { transform: translateX(250%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    </div>
  );
}

PdfLoader.propTypes = {
  fileName: PropTypes.string.isRequired,
  operationLabel: PropTypes.string.isRequired,
  totalPages: PropTypes.number,
};
