import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { EDIT_PDF_LAYOUT } from '../../../../constants/pdf-constants/editPdf/editPdfLayoutConstants';
import { CURSOR_BY_TOOL } from '../../../../constants/pdf-constants/editPdf/editorUiConstants';
import { usePdfDocument } from '../../../../hooks/editPdf/usePdfDocument';
import { useEditorInteractions } from '../../../../hooks/editPdf/useEditorInteractions';
import EditPdfToolbar from './EditPdfToolbar';
import ExistingTextOverlay from './ExistingTextOverlay';
import ElementOverlay from './ElementOverlay';
import DrawLayer from './DrawLayer';
import PageNavigator from './PageNavigator';

function PdfEditorInner({
  file,
  onElementsChange,
  onParsedBlocksChange,
  modifiedBlocks,
  setModifiedBlocks,
  deletedIds,
  setDeletedIds,
  initialElements,
}) {
  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const { pageNum, setPageNum, totalPages, scale, canvasSize, loading, parsedBlocks } =
    usePdfDocument({
      file,
      onParsedBlocksChange,
      containerRef,
      pdfCanvasRef,
    });

  const {
    elements,
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
  } = useEditorInteractions({
    pageNum,
    scale,
    canvasSize,
    pdfCanvasRef,
    setEditingId,
    setSelectedId,
    initialElements,
  });

  // Parent remounts this tree via key when the file changes, so no file-reset effect.

  useEffect(() => {
    onElementsChange?.(elements);
  }, [elements, onElementsChange]);

  const currentPageBlocks = (parsedBlocks[pageNum - 1] ?? []).filter((b) => !deletedIds.has(b._id));
  const pageEls = elements.filter((e) => e.pageIndex === pageNum - 1);

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm ${EDIT_PDF_LAYOUT.panelShell}`}
    >
      <EditPdfToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        toolOpts={toolOpts}
        setToolOpts={setToolOpts}
        sel={selEl}
        onUpdate={(patch) => selEl && updateEl(selEl.id, patch)}
        onDelete={() => selEl && deleteEl(selEl.id)}
      />

      {loading && (
        <div className="flex items-center justify-center py-1.5 bg-blue-50 border-b border-blue-100">
          <span className="text-xs text-blue-500 font-medium animate-pulse">
            ⏳ Reading existing content…
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-300 flex justify-center items-start p-6"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={resetTransientDrags}
      >
        <div
          className="relative shadow-2xl bg-white"
          style={{
            width: canvasSize.w,
            height: canvasSize.h,
            flexShrink: 0,
            cursor: CURSOR_BY_TOOL[activeTool],
          }}
          onClick={onCanvasClick}
        >
          <canvas
            ref={pdfCanvasRef}
            style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}
          />

          {currentPageBlocks.map((block) => {
            const modified = modifiedBlocks[block._id];
            const displayText = modified ? modified.newText : block.text;
            const hasBeenEdited = Boolean(modified && modified.newText !== block.text);
            return (
              <ExistingTextOverlay
                key={block._id}
                block={block}
                scale={scale}
                isEditing={editingId === block._id}
                isSelected={selectedId === block._id}
                displayText={displayText}
                hasBeenEdited={hasBeenEdited}
                onSelect={() => {
                  setSelectedId(block._id);
                  setSelected(null);
                  setEditingId(block._id);
                }}
                onFinishEdit={(newText) => {
                  setModifiedBlocks((prev) => ({
                    ...prev,
                    [block._id]: { newText },
                  }));
                  setEditingId(null);
                }}
                onDelete={() => {
                  setDeletedIds((prev) => new Set([...prev, block._id]));
                  setSelectedId(null);
                }}
              />
            );
          })}

          {pageEls.map((el) => (
            <ElementOverlay
              key={el.id}
              el={el}
              scale={scale}
              isSelected={selected === el.id}
              onMouseDown={onElMouseDown}
              onResizeMouseDown={onResizeMouseDown}
              onUpdate={updateEl}
            />
          ))}

          {activeTool === 'draw' && (
            <DrawLayer
              width={canvasSize.w}
              height={canvasSize.h}
              color={toolOpts.color}
              onCommit={onDrawCommit}
            />
          )}

          {shapePreview && (
            <div
              style={{
                position: 'absolute',
                left: shapePreview.px,
                top: shapePreview.py,
                width: shapePreview.w,
                height: shapePreview.h,
                border: `2px dashed ${toolOpts.color}`,
                borderRadius: toolOpts.shapeType === 'circle' ? '50%' : 2,
                pointerEvents: 'none',
                opacity: 0.65,
                background:
                  toolOpts.fillColor && toolOpts.fillColor !== 'transparent'
                    ? toolOpts.fillColor + '33'
                    : 'transparent',
              }}
            />
          )}
        </div>
      </div>

      <PageNavigator pageNum={pageNum} totalPages={totalPages} onChange={setPageNum} />
    </div>
  );
}

PdfEditorInner.propTypes = {
  file: PropTypes.object.isRequired,
  onElementsChange: PropTypes.func,
  onParsedBlocksChange: PropTypes.func,
  modifiedBlocks: PropTypes.object.isRequired,
  setModifiedBlocks: PropTypes.func.isRequired,
  deletedIds: PropTypes.instanceOf(Set).isRequired,
  setDeletedIds: PropTypes.func.isRequired,
  initialElements: PropTypes.array,
};

export default function PdfEditor({
  file,
  onElementsChange,
  onParsedBlocksChange,
  modifiedRef,
  deletedRef,
  initialElements = null,
  initialModifiedBlocks = null,
  initialDeletedIds = null,
  onModifiedChange,
  onDeletedChange,
}) {
  const [modifiedBlocks, setModifiedBlocks] = useState(initialModifiedBlocks ?? {});
  const [deletedIds, setDeletedIds] = useState(
    initialDeletedIds ? new Set(initialDeletedIds) : new Set()
  );

  useEffect(() => {
    modifiedRef.current = modifiedBlocks;
    onModifiedChange?.(modifiedBlocks);
  }, [modifiedBlocks, modifiedRef, onModifiedChange]);

  useEffect(() => {
    deletedRef.current = deletedIds;
    onDeletedChange?.(deletedIds);
  }, [deletedIds, deletedRef, onDeletedChange]);

  return (
    <PdfEditorInner
      file={file}
      onElementsChange={onElementsChange}
      onParsedBlocksChange={onParsedBlocksChange}
      modifiedBlocks={modifiedBlocks}
      setModifiedBlocks={setModifiedBlocks}
      deletedIds={deletedIds}
      setDeletedIds={setDeletedIds}
      initialElements={initialElements}
    />
  );
}

PdfEditor.propTypes = {
  file: PropTypes.object.isRequired,
  onElementsChange: PropTypes.func,
  onParsedBlocksChange: PropTypes.func,
  modifiedRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  deletedRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  initialElements: PropTypes.array,
  initialModifiedBlocks: PropTypes.object,
  initialDeletedIds: PropTypes.array,
  onModifiedChange: PropTypes.func,
  onDeletedChange: PropTypes.func,
};
