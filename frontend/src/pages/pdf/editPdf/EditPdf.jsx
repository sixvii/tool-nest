import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { editPdf } from '../../../services/pdfService';
import { buildEditPayload } from '../../../utils/editPdf/buildEditPayload';
import { isRestorableBlob, restoreFile } from '../../../utils/fileUtils';
import { usePersistentToolState } from '../../../hooks/usePersistentToolState';
import { buildPersistKey } from '../../../utils/persistKey';
import { TOOL_STATE_TTL_MS } from '../../../utils/toolStatePersistence';
import RestoreSessionBanner from '../../../components/RestoreSessionBanner';
import PdfLoader from '../../../components/loaders/PdfLoader';
import { EDIT_PDF_SIDEBAR_COPY } from '../../../constants/pdf-constants/editPdf/editPdfLayoutConstants';
import EditPdfWorkspaceLayout from './components/EditPdfWorkspaceLayout';
import EditPdfSidebar from './components/EditPdfSidebar';
import EditPdfUploadGate from './components/EditPdfUploadGate';
import PdfEditor from './components/PdfEditor';

/**
 * Edit PDF page — orchestration only.
 * Heavy lifting lives in editPdf/components plus shared constants, utils, and hooks layers.
 */
export default function EditPdf({ toolName }) {
  const [currentFile, setCurrentFile] = useState(null);
  const [elements, setElements] = useState([]);
  const [modifiedBlocks, setModifiedBlocks] = useState({});
  const [deletedIds, setDeletedIds] = useState(new Set());
  const editorStateRef = useRef({
    parsedBlocks: {},
    modifiedBlocks: {},
    deletedIds: new Set(),
  });
  const modifiedRef = useRef({});
  const deletedRef = useRef(new Set());

  const [editorPersistKey] = useState(() => buildPersistKey({ namespace: 'edit-pdf' }));
  const {
    restored: restoredEditor,
    isHydrated: editorHydrated,
    persist: persistEditor,
    clear: clearEditor,
  } = usePersistentToolState(editorPersistKey, { ttlMs: TOOL_STATE_TTL_MS * 5 });

  const [seedElements, setSeedElements] = useState(null);
  const [seedModified, setSeedModified] = useState(null);
  const [seedDeleted, setSeedDeleted] = useState(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const restoreDoneRef = useRef(false);
  const restoreAppliedRef = useRef(false);
  const persistSnapshotRef = useRef({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesChange = (files) => {
    const next = files?.[0] ?? null;
    setCurrentFile(next);
    if (!next) {
      setElements([]);
      setSeedElements(null);
      return;
    }
    setElements([]);
  };

  const handleElementsChange = useCallback((els) => setElements(els), []);

  const handleParsedBlocks = useCallback((pb) => {
    editorStateRef.current.parsedBlocks = pb;
  }, []);

  const handleModifiedChange = useCallback((m) => {
    setModifiedBlocks(m);
    editorStateRef.current.modifiedBlocks = m;
  }, []);

  const handleDeletedChange = useCallback((d) => {
    setDeletedIds(d);
    editorStateRef.current.deletedIds = d;
  }, []);

  useEffect(() => {
    if (!editorHydrated || restoreAppliedRef.current) return undefined;

    if (!restoredEditor) {
      restoreDoneRef.current = true;
      return undefined;
    }

    restoreAppliedRef.current = true;
    const timer = setTimeout(() => {
      let applied = false;

      if (isRestorableBlob(restoredEditor.currentFile)) {
        const file = restoreFile(restoredEditor.currentFile, restoredEditor.fileName);
        if (file) {
          setCurrentFile(file);
          applied = true;
        }
      }

      if (Array.isArray(restoredEditor.elements) && restoredEditor.elements.length) {
        const revived = restoredEditor.elements.map((el) => {
          if (el.type === 'image' && el.file) return { ...el, src: URL.createObjectURL(el.file) };
          if (el.type === 'drawing' && el.blob) return { ...el, src: URL.createObjectURL(el.blob) };
          return el;
        });
        setSeedElements(revived);
        setElements(revived);
        applied = true;
      }
      if (restoredEditor.modifiedBlocks && Object.keys(restoredEditor.modifiedBlocks).length) {
        setSeedModified(restoredEditor.modifiedBlocks);
        modifiedRef.current = restoredEditor.modifiedBlocks;
        editorStateRef.current.modifiedBlocks = restoredEditor.modifiedBlocks;
        setModifiedBlocks(restoredEditor.modifiedBlocks);
        applied = true;
      }
      if (Array.isArray(restoredEditor.deletedIds) && restoredEditor.deletedIds.length) {
        setSeedDeleted(restoredEditor.deletedIds);
        deletedRef.current = new Set(restoredEditor.deletedIds);
        editorStateRef.current.deletedIds = new Set(restoredEditor.deletedIds);
        setDeletedIds(new Set(restoredEditor.deletedIds));
        applied = true;
      }

      if (applied) setSessionRestored(true);
      setTimeout(() => {
        restoreDoneRef.current = true;
      }, 100);
    }, 0);

    return () => clearTimeout(timer);
  }, [editorHydrated, restoredEditor]);

  useEffect(() => {
    persistSnapshotRef.current = {
      currentFile,
      fileName: currentFile?.name ?? '',
      elements,
      modifiedBlocks,
      deletedIds: [...deletedIds],
    };
  }, [currentFile, elements, modifiedBlocks, deletedIds]);

  useEffect(() => {
    if (!editorHydrated || !restoreDoneRef.current) return undefined;
    const timer = setTimeout(() => {
      const snap = persistSnapshotRef.current;
      const hasWork =
        Boolean(snap.currentFile) ||
        snap.elements.length > 0 ||
        Object.keys(snap.modifiedBlocks).length > 0 ||
        snap.deletedIds.length > 0;
      if (!hasWork) {
        clearEditor();
        return;
      }
      persistEditor(snap);
    }, 500);
    return () => clearTimeout(timer);
  }, [
    editorHydrated,
    currentFile,
    elements,
    modifiedBlocks,
    deletedIds,
    persistEditor,
    clearEditor,
  ]);

  useEffect(() => {
    if (!editorHydrated) return undefined;
    const flush = () => {
      if (!restoreDoneRef.current) return;
      const snap = persistSnapshotRef.current;
      const hasWork =
        Boolean(snap.currentFile) ||
        snap.elements.length > 0 ||
        Object.keys(snap.modifiedBlocks).length > 0 ||
        snap.deletedIds.length > 0;
      if (hasWork) persistEditor(snap);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [editorHydrated, persistEditor]);

  const handleSubmit = async ({ files }) => {
    const { payload, imageFiles } = buildEditPayload({
      parsedBlocks: editorStateRef.current.parsedBlocks,
      modifiedBlocks: modifiedRef.current,
      deletedIds: deletedRef.current,
      elements,
    });

    if (payload.length === 0) throw new Error('No changes to apply.');

    try {
      const data = await editPdf(files[0], payload, imageFiles);
      return data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
    } catch (err) {
      console.error('editPdf error:', err);
      throw err;
    }
  };

  return (
    <div className="flex flex-col w-full">
      {sessionRestored && (
        <RestoreSessionBanner
          className="mx-3 mt-3"
          onContinue={() => setSessionRestored(false)}
          onDiscard={() => {
            clearEditor();
            setSessionRestored(false);
            setCurrentFile(null);
            setElements([]);
            setSeedElements(null);
            setSeedModified(null);
            setSeedDeleted(null);
            setModifiedBlocks({});
            setDeletedIds(new Set());
            modifiedRef.current = {};
            deletedRef.current = new Set();
            editorStateRef.current = {
              modifiedBlocks: {},
              deletedIds: new Set(),
              parsedBlocks: editorStateRef.current.parsedBlocks,
            };
            setEditorKey((k) => k + 1);
            restoreAppliedRef.current = false;
            restoreDoneRef.current = false;
          }}
        />
      )}
      {currentFile ? (
        <EditPdfWorkspaceLayout
          preview={
            isProcessing ? (
              <PdfLoader
                fileName={currentFile?.name ?? ''}
                operationLabel={EDIT_PDF_SIDEBAR_COPY.loaderLabel}
              />
            ) : (
              <PdfEditor
                key={`${editorKey}-${currentFile.name}-${currentFile.size}`}
                file={currentFile}
                onElementsChange={handleElementsChange}
                onParsedBlocksChange={handleParsedBlocks}
                modifiedRef={modifiedRef}
                deletedRef={deletedRef}
                initialElements={seedElements}
                initialModifiedBlocks={seedModified}
                initialDeletedIds={seedDeleted}
                onModifiedChange={handleModifiedChange}
                onDeletedChange={handleDeletedChange}
              />
            )
          }
          sidebar={
            <EditPdfSidebar
              toolName={toolName}
              files={[currentFile]}
              onFilesChange={handleFilesChange}
              onExport={handleSubmit}
              onProcessingChange={setIsProcessing}
            />
          }
        />
      ) : (
        <EditPdfUploadGate toolName={toolName} onFilesChange={handleFilesChange} />
      )}
    </div>
  );
}

EditPdf.propTypes = {
  toolName: PropTypes.string,
};
