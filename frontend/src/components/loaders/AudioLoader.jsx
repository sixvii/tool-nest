import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const BARS = 30;

const getExtColor = (ext) => {
  const colors = {
    mp3: 'bg-blue-500',
    mp4: 'bg-rose-500',
    m4a: 'bg-indigo-500',
    wav: 'bg-emerald-500',
    ogg: 'bg-amber-500',
    aac: 'bg-purple-500',
    flac: 'bg-cyan-500',
  };
  return colors[ext?.toLowerCase()] ?? 'bg-slate-500';
};

export default function AudioLoader({ fileName, fileSize, targetFormat }) {
  const [progress, setProgress] = useState(0);

  const ext = fileName?.split('.').pop() ?? '';

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        return prev >= 100 ? 0 : prev + 0.6;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Top — File Info */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black ${getExtColor(ext)}`}
          >
            {ext.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[160px] sm:max-w-xs">
              {fileName}
            </p>
            <p className="text-xs text-slate-400">
              {fileSize} • {targetFormat}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-600">Audio tools</span>
      </div>

      {/* Middle — Waveform */}
      <div className="relative flex items-center justify-center bg-slate-50 px-6 py-10 overflow-hidden">
        {/* Sliding mask */}
        <div
          className="absolute top-0 bottom-0 bg-blue-100/40 transition-all duration-300 border-r-2 border-blue-400"
          style={{ left: 0, width: `${progress}%` }}
        />

        {/* Waveform bars */}
        <div className="relative flex items-center gap-[3px] z-10">
          {Array.from({ length: BARS }).map((_, i) => {
            const height = 20 + Math.abs(Math.sin(i * 0.4)) * 50 + Math.abs(Math.cos(i * 0.7)) * 20;
            return (
              <div
                key={`bar-${i}-${height.toFixed(1)}`}
                className="w-[3px] rounded-full bg-blue-400 opacity-80"
                style={{
                  height: `${height}px`,
                  animation: `pulse-bar ${0.8 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.04}s`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom — Status */}
      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
          <span className="text-xs font-semibold text-slate-600">Working on it...</span>
        </div>

        {/* Indeterminate back-and-forth bar */}
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

AudioLoader.propTypes = {
  fileName: PropTypes.string,
  fileSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  targetFormat: PropTypes.string,
};
