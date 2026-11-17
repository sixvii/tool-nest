import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize } from 'lucide-react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}

export default function VideoPreviewPlayer({
  src,
  videoRef,
  onLoadedMetadata,
  onError,
  containerClassName = '',
  videoClassName = '',
  transportOnly = false,
  disabled = false,
  children,
}) {
  const internalRef = useRef(null);
  const ref = videoRef ?? internalRef;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      onLoadedMetadata?.(video);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [ref, onLoadedMetadata, src]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.volume = volume;
  }, [volume, ref]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
  }, [muted, ref]);

  const getVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeX className="w-3.5 h-3.5 text-white/70" />;
    if (volume <= 0.5) return <Volume1 className="w-3.5 h-3.5 text-white/70" />;
    return <Volume2 className="w-3.5 h-3.5 text-white/70" />;
  };

  const handleVolumeChange = (e) => {
    if (disabled) return;
    const val = Number(e.target.value);
    setVolume(val);
    if (val > 0) setMuted(false);
  };

  const togglePlay = () => {
    if (disabled) return;
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const handleSeek = (e) => {
    if (disabled) return;
    const video = ref.current;
    if (!video || !duration) return;
    video.currentTime = Number(e.target.value);
  };

  const handleFullscreen = () => {
    const video = ref.current;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex flex-col gap-3 h-full min-h-0 ${containerClassName}`}>
      {!transportOnly && (
        <div className="relative flex items-center justify-center flex-1 min-h-0 min-w-0 overflow-hidden">
          <video
            ref={ref}
            src={src}
            className={`block w-full h-full max-w-full max-h-full object-contain ${videoClassName}`}
            playsInline
            onError={onError}
          >
            <track kind="captions" />
          </video>
          <button
            type="button"
            onClick={handleFullscreen}
            title="Fullscreen"
            className="absolute top-2 left-2 w-7 h-7 bg-black/50 hover:bg-black/80 rounded-lg flex items-center justify-center transition-colors"
          >
            <Maximize className="w-3.5 h-3.5 text-white" />
          </button>
          {children}
        </div>
      )}

      <div
        className={`flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 px-1 ${disabled ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            disabled={disabled}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            )}
          </button>

          <div className="relative flex-1 min-w-0 h-1 flex items-center">
            <div className="absolute inset-x-0 h-1 rounded-full bg-white/15" />
            <div
              className="absolute h-1 rounded-full bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              disabled={disabled}
              className="relative w-full h-4 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          <span className="hidden lg:inline flex-shrink-0 text-[11px] font-mono text-white/50 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="lg:hidden flex-shrink-0 text-[11px] font-mono text-white/50 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={() => !disabled && setMuted((v) => !v)}
            disabled={disabled}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors disabled:cursor-not-allowed"
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
            className="w-16 accent-blue-400 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
