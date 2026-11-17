import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume1, Volume2, VolumeX } from 'lucide-react';
import PropTypes from 'prop-types';

const BAR_SPACING = 8;
const BAR_W = 3;
const CONTAINER_H = 44;
const BAR_H_MAX = 40;

function getBarHeights(count) {
  return Array.from({ length: count }, (_, i) => {
    const h =
      0.35 +
      0.3 * Math.abs(Math.sin(i * 0.45)) +
      0.2 * Math.abs(Math.sin(i * 1.2 + 1.1)) +
      0.15 * Math.abs(Math.cos(i * 0.3 + 0.7));
    return Math.max(0.12, Math.min(1, h));
  });
}

function getBarColor(played, isHead) {
  if (played) return 'bg-blue-500';
  if (isHead) return 'bg-blue-300';
  return 'bg-slate-300';
}

function formatTime(s) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${sec}`;
}

export default function AudioPreviewPlayer({ src, className = '', disabled = false }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [barCount, setBarCount] = useState(32);

  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  useEffect(() => {
    const el = waveformRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setBarCount(Math.max(10, Math.floor(w / BAR_SPACING)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    if (disabled) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.paused ? audio.play() : audio.pause();
  };

  const handleWaveformClick = useCallback(
    (e) => {
      if (disabled) return;
      const audio = audioRef.current;
      const el = waveformRef.current;
      if (!audio || !el || !duration) return;
      const { left, width } = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - left) / width));
      audio.currentTime = ratio * duration;
    },
    [duration, disabled]
  );

  const handleWaveformKeyDown = (e) => {
    if (disabled) return;
    const audio = audioRef.current;
    if (!audio || !duration) return;
    if (e.key === 'ArrowRight') {
      audio.currentTime = Math.min(duration, audio.currentTime + 5);
    } else if (e.key === 'ArrowLeft') {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    }
  };

  const handleVolumeChange = (e) => {
    if (disabled) return;
    const val = Number(e.target.value);
    setVolume(val);
    if (val > 0) setMuted(false);
  };

  const getVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeX className="w-3.5 h-3.5 text-slate-400" />;
    if (volume <= 0.5) return <Volume1 className="w-3.5 h-3.5 text-slate-400" />;
    return <Volume2 className="w-3.5 h-3.5 text-slate-400" />;
  };

  const progress = duration ? currentTime / duration : 0;
  const barHeights = getBarHeights(barCount);

  return (
    <div
      className={`w-full max-w-md mx-auto bg-white border border-slate-100 shadow-md shadow-slate-900/5 rounded-2xl px-5 py-5 ${className}`}
    >
      <audio ref={audioRef} src={src} key={src} preload="metadata" className="hidden">
        <track kind="captions" />
      </audio>

      {/* Play + waveform + time */}
      <div className={`flex items-center gap-3 mb-3 ${disabled ? 'opacity-50' : ''}`}>
        <button
          type="button"
          onClick={togglePlay}
          disabled={disabled}
          className="w-11 h-11 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-md shadow-blue-600/25 flex items-center justify-center flex-shrink-0 transition-all disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          )}
        </button>

        {/* Waveform */}
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          onKeyDown={handleWaveformKeyDown}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-disabled={disabled}
          className={`flex-1 relative select-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ height: CONTAINER_H }}
        >
          {barHeights.map((h, i) => {
            const barH = Math.max(3, h * BAR_H_MAX);
            const played = (i + 1) / barCount <= progress;
            const isHead = !played && i / barCount <= progress;
            return (
              <div
                key={`bar-${i}-${barH.toFixed(1)}`}
                className={`absolute rounded-full transition-colors duration-75 ${getBarColor(played, isHead)}`}
                style={{
                  left: `${(i / (barCount - 1)) * 100}%`,
                  width: BAR_W,
                  height: barH,
                  top: (CONTAINER_H - barH) / 2,
                  transform: 'translateX(-50%)',
                }}
              />
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Volume row */}
      <div className="flex items-center gap-2 pl-1">
        <button
          type="button"
          onClick={() => !disabled && setMuted((m) => !m)}
          disabled={disabled}
          className="flex-shrink-0 hover:text-blue-500 transition-colors disabled:cursor-not-allowed"
        >
          {getVolumeIcon()}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          disabled={disabled}
          className="w-24 accent-blue-500 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

AudioPreviewPlayer.propTypes = {
  src: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
