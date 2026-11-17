import { useCallback, useRef, useState } from 'react';
import {
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  FONT_FAMILIES,
} from '../../constants/pdf-constants/editPdf/editPdfConstants';
import { uid } from '../../utils/editPdf/idUtils';
import { applyResizeHandle, getCanvasPos } from '../../utils/editPdf/geometryUtils';

/**
 * Element CRUD, tool options, and canvas pointer interactions
 * (place text/shape/image, move, resize, draw commit).
 */
export function useEditorInteractions({
  pageNum,
  scale,
  canvasSize,
  pdfCanvasRef,
  setEditingId,
  setSelectedId,
  initialElements = null,
}) {
  const [elements, setElements] = useState(initialElements ?? []);
  const [selected, setSelected] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [toolOpts, setToolOpts] = useState({
    fontSize: DEFAULT_FONT_SIZE,
    fontFamily: FONT_FAMILIES[0].value,
    color: DEFAULT_COLOR,
    fillColor: 'transparent',
    shapeType: 'rect',
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
  });
  const [shapePreview, setShapePreview] = useState(null);

  const shapeDrag = useRef(null);
  const elDrag = useRef(null);
  const resizeDrag = useRef(null);

  const updateEl = useCallback((id, patch) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const deleteEl = useCallback((id) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
  }, []);

  const selEl = elements.find((e) => e.id === selected) ?? null;

  const canvasPos = useCallback((e) => getCanvasPos(e, pdfCanvasRef.current), [pdfCanvasRef]);

  const resetTransientDrags = useCallback(() => {
    elDrag.current = null;
    shapeDrag.current = null;
    resizeDrag.current = null;
    setShapePreview(null);
  }, []);

  const onCanvasClick = useCallback(
    (e) => {
      setSelected(null);
      setSelectedId(null);
      setEditingId(null);
      if (activeTool === 'select' || activeTool === 'draw') return;

      const { px, py } = canvasPos(e);
      const x = px / scale;
      const y = py / scale;

      if (activeTool === 'text') {
        const id = uid();
        setElements((prev) => [
          ...prev,
          {
            id,
            type: 'text',
            pageIndex: pageNum - 1,
            x,
            y,
            text: 'Type here',
            fontSize: toolOpts.fontSize,
            fontFamily: toolOpts.fontFamily,
            color: toolOpts.color,
            bold: toolOpts.bold,
            italic: toolOpts.italic,
            underline: toolOpts.underline,
            align: toolOpts.align,
          },
        ]);
        setSelected(id);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'shape') {
        shapeDrag.current = { startPx: px, startPy: py, startX: x, startY: y };
        setShapePreview({ px, py, w: 0, h: 0 });
      }

      if (activeTool === 'image') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (ev) => {
          const f = ev.target.files?.[0];
          if (!f) return;
          const id = uid();
          setElements((prev) => [
            ...prev,
            {
              id,
              type: 'image',
              pageIndex: pageNum - 1,
              x,
              y,
              w: 160,
              h: 120,
              src: URL.createObjectURL(f),
              file: f,
              color: DEFAULT_COLOR,
            },
          ]);
          setSelected(id);
          setActiveTool('select');
        };
        input.click();
      }
    },
    [activeTool, canvasPos, scale, pageNum, toolOpts, setEditingId, setSelectedId]
  );

  const onElMouseDown = useCallback(
    (e, el) => {
      e.stopPropagation();
      if (activeTool !== 'select') return;
      setSelected(el.id);
      setSelectedId(null);
      const { px, py } = canvasPos(e);
      elDrag.current = { id: el.id, startPx: px, startPy: py, origX: el.x, origY: el.y };
    },
    [activeTool, canvasPos, setSelectedId]
  );

  const onResizeMouseDown = useCallback(
    (e, el, handle) => {
      e.stopPropagation();
      const { px, py } = canvasPos(e);
      resizeDrag.current = {
        id: el.id,
        handle,
        startPx: px,
        startPy: py,
        origX: el.x,
        origY: el.y,
        origW: el.w ?? 100,
        origH: el.h ?? 100,
      };
    },
    [canvasPos]
  );

  const onMouseMove = useCallback(
    (e) => {
      if (shapeDrag.current && activeTool === 'shape') {
        const { px, py } = canvasPos(e);
        setShapePreview({
          px: Math.min(px, shapeDrag.current.startPx),
          py: Math.min(py, shapeDrag.current.startPy),
          w: Math.abs(px - shapeDrag.current.startPx),
          h: Math.abs(py - shapeDrag.current.startPy),
        });
      }
      if (elDrag.current) {
        const { px, py } = canvasPos(e);
        const dx = (px - elDrag.current.startPx) / scale;
        const dy = (py - elDrag.current.startPy) / scale;
        updateEl(elDrag.current.id, {
          x: elDrag.current.origX + dx,
          y: elDrag.current.origY + dy,
        });
      }
      if (resizeDrag.current) {
        const { px, py } = canvasPos(e);
        const dx = (px - resizeDrag.current.startPx) / scale;
        const dy = (py - resizeDrag.current.startPy) / scale;
        const next = applyResizeHandle({
          handle: resizeDrag.current.handle,
          origX: resizeDrag.current.origX,
          origY: resizeDrag.current.origY,
          origW: resizeDrag.current.origW,
          origH: resizeDrag.current.origH,
          dx,
          dy,
        });
        updateEl(resizeDrag.current.id, next);
      }
    },
    [activeTool, canvasPos, scale, updateEl]
  );

  const onMouseUp = useCallback(
    (e) => {
      if (shapeDrag.current && activeTool === 'shape') {
        const drag = shapeDrag.current;
        shapeDrag.current = null;
        const { px, py } = canvasPos(e);
        const w = Math.abs(px - drag.startPx) / scale;
        const h = Math.abs(py - drag.startPy) / scale;
        if (w > 4 && h > 4) {
          const id = uid();
          setElements((prev) => [
            ...prev,
            {
              id,
              type: 'shape',
              pageIndex: pageNum - 1,
              x: Math.min(drag.startX, px / scale),
              y: Math.min(drag.startY, py / scale),
              w,
              h,
              shapeType: toolOpts.shapeType,
              color: toolOpts.color,
              fillColor: toolOpts.fillColor,
            },
          ]);
          setSelected(id);
        }
        setShapePreview(null);
        setActiveTool('select');
      }
      elDrag.current = null;
      resizeDrag.current = null;
    },
    [activeTool, canvasPos, scale, pageNum, toolOpts]
  );

  const onDrawCommit = useCallback(
    (blob) => {
      const id = uid();
      setElements((prev) => [
        ...prev,
        {
          id,
          type: 'drawing',
          pageIndex: pageNum - 1,
          x: 0,
          y: 0,
          w: canvasSize.w / scale,
          h: canvasSize.h / scale,
          src: URL.createObjectURL(blob),
          blob,
          color: DEFAULT_COLOR,
        },
      ]);
    },
    [pageNum, canvasSize, scale]
  );

  const resetElements = useCallback(() => {
    setElements([]);
    setSelected(null);
    setActiveTool('select');
    setShapePreview(null);
    resetTransientDrags();
  }, [resetTransientDrags]);

  return {
    elements,
    setElements,
    selected,
    setSelected,
    selEl,
    activeTool,
    setActiveTool,
    toolOpts,
    setToolOpts,
    shapePreview,
    updateEl,
    deleteEl,
    onCanvasClick,
    onElMouseDown,
    onResizeMouseDown,
    onMouseMove,
    onMouseUp,
    onDrawCommit,
    resetTransientDrags,
    resetElements,
  };
}
