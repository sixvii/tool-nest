import PropTypes from 'prop-types';

export default function ShapeElement({ el, scale, isSelected }) {
  const w = el.w * scale;
  const h = el.h * scale;
  const sw = 2;
  const fill = el.fillColor === 'transparent' ? 'none' : el.fillColor;

  if (el.shapeType === 'line') {
    return (
      <svg
        width={Math.max(Math.abs(w), 4)}
        height={Math.max(Math.abs(h), 4)}
        style={{ overflow: 'visible' }}
      >
        <line
          x1={0}
          y1={0}
          x2={w}
          y2={h}
          stroke={el.color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {isSelected && (
          <line
            x1={0}
            y1={0}
            x2={w}
            y2={h}
            stroke="#3b82f6"
            strokeWidth={sw + 2}
            strokeDasharray="4 3"
            opacity={0.6}
          />
        )}
      </svg>
    );
  }

  if (el.shapeType === 'circle') {
    const rx = Math.abs(w) / 2;
    const ry = Math.abs(h) / 2;
    return (
      <svg width={Math.abs(w)} height={Math.abs(h)}>
        <ellipse
          cx={rx}
          cy={ry}
          rx={Math.max(rx - sw, 1)}
          ry={Math.max(ry - sw, 1)}
          stroke={el.color}
          strokeWidth={sw}
          fill={fill}
        />
        {isSelected && (
          <ellipse
            cx={rx}
            cy={ry}
            rx={Math.max(rx - sw, 1)}
            ry={Math.max(ry - sw, 1)}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="none"
            opacity={0.7}
          />
        )}
      </svg>
    );
  }

  return (
    <svg width={Math.abs(w)} height={Math.abs(h)}>
      <rect
        x={sw / 2}
        y={sw / 2}
        width={Math.max(Math.abs(w) - sw, 1)}
        height={Math.max(Math.abs(h) - sw, 1)}
        stroke={el.color}
        strokeWidth={sw}
        fill={fill}
        rx={2}
      />
      {isSelected && (
        <rect
          x={sw / 2}
          y={sw / 2}
          width={Math.max(Math.abs(w) - sw, 1)}
          height={Math.max(Math.abs(h) - sw, 1)}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="none"
          rx={2}
          opacity={0.7}
        />
      )}
    </svg>
  );
}

ShapeElement.propTypes = {
  el: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  isSelected: PropTypes.bool,
};
