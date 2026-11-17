import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const BARS = 42;
const FRAME_COUNT = 10;

const FRAME_CLASSES = [
  'bg-blue-400',
  'bg-blue-200',
  'bg-blue-100',
  'bg-blue-50',
  'bg-slate-100',
  'bg-slate-50',
];

const FILMSTRIP_ITEMS = [
  ...Array.from({ length: FRAME_COUNT }, (_, i) => ({
    color: FRAME_CLASSES[Math.min(i, FRAME_CLASSES.length - 1)],
    id: `fa-${i}`,
  })),
  ...Array.from({ length: FRAME_COUNT }, (_, i) => ({
    color: FRAME_CLASSES[Math.min(i, FRAME_CLASSES.length - 1)],
    id: `fb-${i}`,
  })),
];

const STATUS_STAGES = [
  { label: 'Uploading video...', at: 0 },
  { label: 'Analyzing frames...', at: 2200 },
  { label: 'Encoding video...', at: 4500 },
  { label: 'Finalizing...', at: 6800 },
];

// Reserved for a future video information header.
// function formatDuration(duration) {
//   if (duration == null || duration === '') return '—';
//   if (typeof duration === 'string') return duration;
//   if (!Number.isFinite(duration)) return '—';
//   const m = Math.floor(duration / 60);
//   const s = Math.floor(duration % 60);
//   return `${m}:${String(s).padStart(2, '0')}`;
// }

export default function VideoLoader() {
  const [statusIndex, setStatusIndex] = useState(0);
  const [bars] = useState(() =>
    Array.from({ length: BARS }, (_, i) => ({ id: `bar-${i}`, height: 8 + Math.random() * 36 }))
  );
  // Reserved props for the future video information header: fileName, duration, resolution.

  useEffect(() => {
    const timers = STATUS_STAGES.slice(1).map((stage, idx) =>
      setTimeout(() => setStatusIndex(idx + 1), stage.at)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const status = STATUS_STAGES[statusIndex].label;

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      {/* <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-blue-500 text-white text-[11px] font-black tracking-wide">
          VID
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{fileName}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDuration(duration)} • {resolution || '—'}
          </p>
        </div>
      </div> */}

      {/* Center — inset panel with filmstrip + waveform */}
      <div className="mx-4 my-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-5 overflow-hidden">
        <div className="overflow-hidden mb-4">
          <div className="flex gap-2 w-max filmstrip-scroll">
            {FILMSTRIP_ITEMS.map(({ color, id }) => (
              <div key={id} className={`w-14 h-[4.5rem] rounded-lg flex-shrink-0 ${color}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between w-full">
          {bars.map(({ id, height }, i) => (
            <div
              key={id}
              className="w-[2px] rounded-full bg-blue-400 origin-bottom"
              style={{
                height: `${height}px`,
                animation: `pulse-bar ${0.8 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.03}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
          <span className="text-xs font-semibold text-slate-600">{status}</span>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full w-1/3 bg-blue-500 rounded-full"
            style={{ animation: 'indeterminate-slide 1.6s ease-in-out infinite' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes filmstrip-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .filmstrip-scroll {
          animation: filmstrip-scroll 14s linear infinite;
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

VideoLoader.propTypes = {
  fileName: PropTypes.string,
  duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  resolution: PropTypes.string,
};
