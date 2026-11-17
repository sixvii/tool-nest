import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

export default function DrawLayer({ width, height, color, onCommit }) {
  const ref = useRef();
  const drawing = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.width = width;
      ref.current.height = height;
    }
  }, [width, height]);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    const s = e.touches?.[0] ?? e;
    return [s.clientX - r.left, s.clientY - r.top];
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = ref.current.getContext('2d');
    ctx.beginPath();
    const [x, y] = pos(e);
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ref.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    ref.current.toBlob((b) => onCommit(b), 'image/png');
  };

  return (
    <canvas
      ref={ref}
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: 'crosshair',
        touchAction: 'none',
        zIndex: 50,
      }}
    />
  );
}

DrawLayer.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  onCommit: PropTypes.func.isRequired,
};
