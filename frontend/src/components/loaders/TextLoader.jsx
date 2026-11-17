import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_STAGES = [
  { label: 'Reading file...', at: 0 },
  { label: 'Analyzing content...', at: 1800 },
  { label: 'Formatting...', at: 3600 },
  { label: 'Applying tools...', at: 5400 },
];

// Reserved for a future file information header.
// const getExtColor = (ext) => {
//   const colors = {
//     txt: 'bg-blue-500',
//     md: 'bg-indigo-500',
//     doc: 'bg-sky-500',
//     docx: 'bg-sky-600',
//     rtf: 'bg-cyan-500',
//   };
//   return colors[ext?.toLowerCase()] ?? 'bg-blue-500';
// };

const CHIP_CYCLE_MS = 3600; // full emerge+hold+retract duration per chip
const STAGGER_MS = 700; // offset between each chip's cycle start

export default function TextLoader({ toolLabels = [] }) {
  const [statusIndex, setStatusIndex] = useState(0);
  const [tick, setTick] = useState(0);
  // Reserved prop for the future file information header: fileName.
  const labels = toolLabels.length > 0 ? toolLabels : [];

  // Track if status is at the starting stage to safely cycle the text
  const isInitialStatus = statusIndex === 0;

  // Cycling status text — loops forever, independent of chips
  useEffect(() => {
    const timers = STATUS_STAGES.map((stage, idx) =>
      setTimeout(() => {
        setStatusIndex((idx + 1) % STATUS_STAGES.length);
      }, stage.at)
    );
    const loopTimer = setTimeout(
      () => setStatusIndex(0),
      STATUS_STAGES[STATUS_STAGES.length - 1].at + 1800
    );
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(loopTimer);
    };
  }, [isInitialStatus]);

  // Global clock driving each chip's independent, staggered emerge/hold/retract phase.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(interval);
  }, []);

  const status = STATUS_STAGES[statusIndex].label;
  const now = tick * 60;

  const getChipPosition = (index, total) => {
    const angle = (360 / total) * index - 90;
    const radius = total <= 2 ? 95 : total <= 4 ? 110 : 130;
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  };

  // Each chip runs its own emerge → hold → retract cycle, offset by index * STAGGER_MS
  const getChipPhase = (index) => {
    const offset = index * STAGGER_MS;
    const elapsed = (now + offset) % CHIP_CYCLE_MS;
    const emergeEnd = CHIP_CYCLE_MS * 0.25;
    const holdEnd = CHIP_CYCLE_MS * 0.65;
    const retractEnd = CHIP_CYCLE_MS;

    if (elapsed < emergeEnd) {
      const progress = elapsed / emergeEnd;
      return { scale: 0.4 + 0.6 * progress, opacity: progress };
    }
    if (elapsed < holdEnd) {
      return { scale: 1, opacity: 1 };
    }
    const progress = (elapsed - holdEnd) / (retractEnd - holdEnd);
    return { scale: 1 - 0.6 * progress, opacity: 1 - progress };
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Top — File Info */}
      {/* <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black ${getExtColor(ext)}`}
          >
            {ext.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{fileName}</p>
            <p className="text-xs text-blue-400 font-medium">AI Processing</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-600">Text tools</span>
      </div> */}

      {/* Middle — Orb + Orbiting Chips */}
      <div className="relative flex items-center justify-center bg-slate-50 px-6 py-14 min-h-[280px] overflow-hidden">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 280, height: 280 }}
        >
          {/* Radiating rings — ambient, purely CSS-driven */}
          <span
            className="absolute rounded-full border-2 border-blue-300"
            style={{ width: 90, height: 90, animation: 'ring-pulse 2.6s ease-out infinite' }}
          />
          <span
            className="absolute rounded-full border-2 border-blue-200"
            style={{
              width: 90,
              height: 90,
              animation: 'ring-pulse 2.6s ease-out infinite',
              animationDelay: '1.3s',
            }}
          />

          {/* Central orb */}
          <div
            className="relative z-10 w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-md"
            style={{ animation: 'orb-pulse 2.2s ease-in-out infinite' }}
          >
            <span className="text-white text-sm font-black">AI</span>
          </div>

          {/* Orbiting chips */}
          {labels.map((label, index) => {
            const { x, y } = getChipPosition(index, labels.length);
            const { scale, opacity } = getChipPhase(index);
            return (
              <span
                key={`${label}-${index}`}
                className="absolute px-4 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-semibold rounded-full shadow-sm whitespace-nowrap"
                style={{
                  transform: `translate(${x * Math.max(opacity, 0.15)}px, ${y * Math.max(opacity, 0.15)}px) scale(${scale})`,
                  opacity,
                }}
              >
                {label}
              </span>
            );
          })}
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
            style={{ animation: 'indeterminate-slide 2s ease-in-out infinite' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes indeterminate-slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(calc(200% + 6px)); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

TextLoader.propTypes = {
  fileName: PropTypes.string,
  toolLabels: PropTypes.arrayOf(PropTypes.string),
};
