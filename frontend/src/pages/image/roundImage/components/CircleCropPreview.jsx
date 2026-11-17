import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ROUND_IMAGE_CHECKERBOARD_STYLE,
  ROUND_IMAGE_COPY,
  ROUND_IMAGE_LAYOUT,
} from '../../../../constants/image/roundImage/roundImageConstants';
import {
  drawCircleCropPreview,
  getPreviewCanvasDisplaySize,
} from '../../../../utils/image/circleCropUtils';
import RoundImagePreviewFrame from './RoundImagePreviewFrame';

export default function CircleCropPreview({ file, crop, naturalSize }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageReady, setImageReady] = useState(0);

  useEffect(() => {
    if (!file || !naturalSize.width) return undefined;

    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setImageReady((value) => value + 1);
    };

    img.src = url;

    return () => {
      cancelled = true;
      imageRef.current = null;
      URL.revokeObjectURL(url);
    };
  }, [file, naturalSize.width, naturalSize.height]);

  useEffect(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !crop.radius) return;
    drawCircleCropPreview(canvas, img, crop);
  }, [crop, imageReady]);

  const displaySize = getPreviewCanvasDisplaySize(
    crop,
    ROUND_IMAGE_LAYOUT.previewMaxSize,
    ROUND_IMAGE_LAYOUT.previewMinDisplaySize
  );
  const showPreview = crop.radius > 0 && imageReady > 0;

  return (
    <RoundImagePreviewFrame
      heading={ROUND_IMAGE_COPY.previewHeading}
      fileName={file?.name}
      panelStyle={ROUND_IMAGE_CHECKERBOARD_STYLE}
    >
      <p className="text-sm text-slate-600 mb-4 w-full text-center leading-relaxed">
        {ROUND_IMAGE_COPY.previewHint}
      </p>
      {showPreview ? (
        <canvas
          ref={canvasRef}
          className="rounded-full drop-shadow-md ring-2 ring-slate-200"
          style={{
            width: displaySize.width,
            height: displaySize.height,
            maxWidth: '100%',
          }}
        />
      ) : (
        <p className="text-sm text-slate-500">Loading preview…</p>
      )}
    </RoundImagePreviewFrame>
  );
}

CircleCropPreview.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  crop: PropTypes.shape({
    centerX: PropTypes.number.isRequired,
    centerY: PropTypes.number.isRequired,
    radius: PropTypes.number.isRequired,
  }).isRequired,
  naturalSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
};
