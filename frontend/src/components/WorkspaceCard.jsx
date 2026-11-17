import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { Card, Button, Textarea, FileUpload, Badge, Alert, Select } from './ui';
import { downloadBlob, isRestorableBlob, restoreFile } from '../utils/fileUtils';
import { dismissAllToasts } from '../utils/toastUtils';
import { clientErrorMessage } from '../utils/apiError';
import { useToolPersistence } from '../hooks/useToolPersistence';
import { buildPersistKey } from '../utils/persistKey';

/**
 * Persistence owner convention:
 * - persistScope='workspace' (default): WorkspaceCard owns files/text/options/result snapshot.
 * - persistScope='none': parent page owns persistence via useToolPersistence — use this when
 *   the page passes controlled files/resultBlob and persists its own richer snapshot
 *   (see VideoFormatConverter.jsx, VideoTrimmer.jsx).
 */
export default function WorkspaceCard({
  toolName,
  acceptTypes,
  allowMultiple = false,
  showTextarea = false,
  hintMessage,
  selectLabel,
  selectOptions,
  selectDefault,
  onActionSubmit,
  onFilesChange,
  onSelectChange,
  hideFileUpload = false,
  children,
  renderLoader,
  files: controlledFiles,
  /** @deprecated Use persistScope='none' instead. */
  disablePersistence = false,
  persistScope = 'workspace',
  selected: controlledSelected,
  resultBlob: controlledResultBlob,
  resultName: controlledResultName,
  uploadIcon = null,
  uploadTitle = null,
  uploadSubtitle = null,
  downloadButtonVariant = 'primary',
  downloadButtonSize = 'sm',
  downloadButtonFullWidth = false,
}) {
  const [inputText, setInputText] = useState('');
  const [internalFiles, setInternalFiles] = useState([]);
  const [internalSelected, setInternalSelected] = useState(selectDefault ?? '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalResultBlob, setInternalResultBlob] = useState(null);
  const [internalResultName, setInternalResultName] = useState('');
  const [error, setError] = useState('');

  const isFilesControlled = controlledFiles !== undefined;
  const files = isFilesControlled ? controlledFiles : internalFiles;
  const setFiles = (next) => {
    if (!isFilesControlled) setInternalFiles(next);
  };

  const isSelectedControlled = controlledSelected !== undefined;
  const selected = isSelectedControlled ? controlledSelected : internalSelected;
  const setSelected = (next) => {
    if (!isSelectedControlled) setInternalSelected(next);
  };

  const isResultControlled = controlledResultBlob !== undefined;
  const resultBlob = isResultControlled ? controlledResultBlob : internalResultBlob;
  const resultName = isResultControlled ? (controlledResultName ?? '') : internalResultName;
  const setResultBlob = (next) => {
    if (!isResultControlled) setInternalResultBlob(next);
  };
  const setResultName = (next) => {
    if (!isResultControlled) setInternalResultName(next);
  };

  const effectiveScope = disablePersistence ? 'none' : persistScope;
  const persistenceEnabled = effectiveScope === 'workspace';

  const [persistKey] = useState(() =>
    persistenceEnabled
      ? buildPersistKey({ toolName: toolName ?? 'workspace', namespace: 'workspace-card' })
      : ''
  );

  const hasInput = files.length > 0 || (showTextarea && inputText.trim());

  useToolPersistence({
    enabled: persistenceEnabled,
    persistKey,
    snapshot: { files, inputText, selected, resultBlob, resultName },
    hasContent: Boolean(hasInput) || Boolean(resultBlob),
    warnOnUnload: persistenceEnabled,
    onRestore: (restored) => {
      if (Array.isArray(restored.files) && restored.files.length) {
        const files = restored.files
          .map((f, i) => restoreFile(f, restored.files[i]?.name ?? `file-${i + 1}`))
          .filter(Boolean);
        if (files.length) {
          setFiles(files);
          onFilesChange?.(files);
        }
      }
      if (typeof restored.inputText === 'string') setInputText(restored.inputText);
      if (typeof restored.selected === 'string' && restored.selected) {
        setSelected(restored.selected);
        onSelectChange?.(restored.selected);
      }
      if (isRestorableBlob(restored.resultBlob)) {
        setResultBlob(restored.resultBlob);
        setResultName(restored.resultName ?? '');
      }
    },
  });

  const handleProcess = async () => {
    if (!hasInput || !onActionSubmit) return;
    dismissAllToasts();
    setIsProcessing(true);
    setError('');
    setResultBlob(null);

    try {
      const result = await onActionSubmit({ files, text: inputText, selected });
      if (result === null || result === undefined) return;
      if (result instanceof Blob) {
        setResultBlob(result);
        setResultName(files[0]?.name.replace(/\.[^/.]+$/, '') || 'result');
      } else if (result?.blob) {
        setResultBlob(result.blob);
        setResultName(`${files[0]?.name.replace(/\.[^/.]+$/, '') || 'result'}.${result.ext}`);
      }
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex justify-center items-start py-2 sm:py-4 px-3 sm:px-4">
      <AnimatePresence mode="wait">
        {isProcessing && renderLoader ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl"
          >
            {renderLoader({
              fileName: files[0]?.name,
              fileSize: files[0] ? `${(files[0].size / 1024 / 1024).toFixed(2)} MB` : '',
            })}
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl"
          >
            <Card padding="lg">
              <div className="text-center mb-4 sm:mb-6">
                <Badge>Workspace Mode</Badge>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{toolName}</h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {showTextarea && (
                  <Textarea
                    label="Text Input Area"
                    placeholder="Enter or paste text here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={5}
                  />
                )}

                {showTextarea && (
                  <div className="relative flex items-center justify-center my-1.5 sm:my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-slate-200" />
                    </div>
                    <span className="relative px-3 bg-white text-[9px] sm:text-xs font-bold text-slate-400 uppercase">
                      Or File Drop
                    </span>
                  </div>
                )}

                {!hideFileUpload && (
                  <FileUpload
                    accept={acceptTypes}
                    multiple={allowMultiple}
                    value={files}
                    onFiles={(f) => {
                      setFiles(f);
                      setResultBlob(null);
                      setError('');
                      onFilesChange?.(f);
                    }}
                    icon={uploadIcon ?? undefined}
                    title={uploadTitle}
                    subtitle={uploadSubtitle}
                  />
                )}

                {hintMessage && (
                  <p className="text-xs text-slate-400 text-center mt-2">{hintMessage}</p>
                )}

                {selectOptions?.length > 0 && (
                  <Select
                    label={selectLabel}
                    options={selectOptions}
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      onSelectChange?.(e.target.value);
                    }}
                  />
                )}

                {children}
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={isProcessing}
                disabled={!hasInput}
                onClick={handleProcess}
                className="mt-4 sm:mt-6"
              >
                {isProcessing ? 'Processing...' : 'Process / Convert'}
              </Button>

              <Alert variant="error" message={error} show={!!error} className="mt-4" />

              <AnimatePresence>
                {resultBlob && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 sm:mt-6 overflow-hidden border border-emerald-100 bg-emerald-50/20 rounded-2xl p-3 sm:p-5"
                  >
                    <div
                      className={
                        downloadButtonFullWidth
                          ? 'flex flex-col gap-2'
                          : 'flex items-center justify-between flex-wrap gap-2'
                      }
                    >
                      <span className="text-xs font-bold text-emerald-700">Ready to download</span>
                      <Button
                        variant={downloadButtonVariant}
                        size={downloadButtonSize}
                        fullWidth={downloadButtonFullWidth}
                        onClick={() => downloadBlob(resultBlob, resultName)}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

WorkspaceCard.propTypes = {
  toolName: PropTypes.string,
  acceptTypes: PropTypes.string,
  allowMultiple: PropTypes.bool,
  showTextarea: PropTypes.bool,
  hintMessage: PropTypes.string,
  selectLabel: PropTypes.string,
  selectOptions: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
  ),
  selectDefault: PropTypes.string,
  onActionSubmit: PropTypes.func,
  onFilesChange: PropTypes.func,
  onSelectChange: PropTypes.func,
  hideFileUpload: PropTypes.bool,
  /** 'workspace' = WorkspaceCard owns persistence; 'none' = parent page owns it. */
  persistScope: PropTypes.oneOf(['workspace', 'none']),
  children: PropTypes.node,
  renderLoader: PropTypes.func,
  files: PropTypes.arrayOf(PropTypes.object),
  disablePersistence: PropTypes.bool,
  selected: PropTypes.string,
  resultBlob: PropTypes.instanceOf(Blob),
  resultName: PropTypes.string,
  uploadIcon: PropTypes.elementType,
  uploadTitle: PropTypes.node,
  uploadSubtitle: PropTypes.node,
  downloadButtonVariant: PropTypes.string,
  downloadButtonSize: PropTypes.string,
  downloadButtonFullWidth: PropTypes.bool,
};
