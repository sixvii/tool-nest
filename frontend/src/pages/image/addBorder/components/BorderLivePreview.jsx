import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useBlobPreviewUrl } from '../../../../hooks/useBlobPreviewUrl';
import {
  getBorderExtraSize,
  getBorderPreviewImageStyle,
  getBorderPreviewWrapperStyle,
  getMatteInnerStyle,
  hasMatteInner,
  PREVIEW_CONTAINER_PADDING,
} from '../../../../utils/image/addBorder/borderStyleUtils';

export default function BorderLivePreview({ file, borderWidth, borderColor, borderStyle }) {
  const src = useBlobPreviewUrl(file);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({ scale: 1, displayBorder: 0 });

  const syncImageSize = useCallback((img) => {
    if (!img?.naturalWidth) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) syncImageSize(img);
  }, [src, syncImageSize]);

  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!naturalSize.w || !container) return;

    const maxW = container.clientWidth - PREVIEW_CONTAINER_PADDING;
    const maxH = container.clientHeight - PREVIEW_CONTAINER_PADDING;
    const bw = Math.max(0, Number(borderWidth) || 0);
    const { extraW, extraH } = getBorderExtraSize(borderStyle, bw);
    const scale = Math.min(maxW / (naturalSize.w + extraW), maxH / (naturalSize.h + extraH), 1);

    setLayout({ scale, displayBorder: bw * scale });
  }, [borderWidth, naturalSize, borderStyle]);

  useLayoutEffect(() => {
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [updateLayout, src, borderStyle]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 40 40">
          <rect x="6" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 12h14M10 17h14M10 22h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="28" cy="28" r="8" fill="#F1F5F9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M24.5 28h7M28 24.5v7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400">No file uploaded yet</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Upload a file to see a preview</p>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex flex-col gap-2 min-h-[40vh] w-full">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-semibold text-slate-500">Live preview</p>
          <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 truncate max-w-[140px]">
            {file.name}
          </span>
        </div>
        <div className="min-h-[32vh] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          <p className="text-xs text-slate-400">Loading preview…</p>
        </div>
      </div>
    );
  }

  const bw = Math.max(0, Number(borderWidth) || 0);
  const showBorder = bw > 0 && borderColor;
  const { scale, displayBorder } = layout;
  const displayW = naturalSize.w ? naturalSize.w * scale : undefined;
  const displayH = naturalSize.h ? naturalSize.h * scale : undefined;
  const hasDisplaySize = Boolean(displayW && displayH);

  const imageStyle =
    showBorder && hasDisplaySize
      ? getBorderPreviewImageStyle(borderStyle, displayBorder, displayW, displayH)
      : undefined;

  const imageEl = (
    <img
      key={src}
      ref={imgRef}
      src={src}
      alt="Preview"
      onLoad={(e) => syncImageSize(e.currentTarget)}
      className="rounded-lg shadow-sm max-w-full max-h-full w-auto h-auto object-contain"
      style={imageStyle}
    />
  );

  return (
    <div className="flex flex-col gap-2 min-h-[40vh] w-full">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold text-slate-500">Live preview</p>
        <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 truncate max-w-[140px]">
          {file.name}
        </span>
      </div>
      <div
        ref={containerRef}
        className="min-h-[32vh] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-3"
      >
        {showBorder && hasMatteInner(borderStyle) ? (
          <div style={getBorderPreviewWrapperStyle(borderStyle, displayBorder, borderColor)}>
            <div style={getMatteInnerStyle(displayBorder)}>{imageEl}</div>
          </div>
        ) : (
          <div
            style={
              showBorder
                ? getBorderPreviewWrapperStyle(borderStyle, displayBorder, borderColor)
                : undefined
            }
          >
            {imageEl}
          </div>
        )}
      </div>
    </div>
  );
}

BorderLivePreview.propTypes = {
  file: PropTypes.instanceOf(File),
  borderWidth: PropTypes.number.isRequired,
  borderColor: PropTypes.string.isRequired,
  borderStyle: PropTypes.string.isRequired,
};
