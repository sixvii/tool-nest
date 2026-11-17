import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { Card, Button, FileUpload, Badge, Alert } from '../../../../components/ui';
import { downloadBlob, validateFile } from '../../../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../../../constants/fileSizeLimits';
import { dismissAllToasts } from '../../../../utils/toastUtils';
import { clientErrorMessage } from '../../../../utils/apiError';
import { EDIT_PDF_SIDEBAR_COPY } from '../../../../constants/pdf-constants/editPdf/editPdfLayoutConstants';

export default function EditPdfSidebar({
  toolName,
  files: filesProp,
  onFilesChange,
  onExport,
  onProcessingChange,
}) {
  const [internalFiles, setInternalFiles] = useState([]);
  const files = filesProp !== undefined ? filesProp : internalFiles;
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [error, setError] = useState('');

  const hasFile = files.length > 0;

  const handleFiles = (nextFiles) => {
    const nextFile = nextFiles?.[0];
    if (nextFile) {
      try {
        validateFile(nextFile, { maxSizeMB: PDF_MAX_SIZE_MB, allowedTypes: ['application/pdf'] });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    if (filesProp === undefined) setInternalFiles(nextFiles);
    setResultBlob(null);
    setError('');
    onFilesChange?.(nextFiles);
  };

  const handleExport = async () => {
    if (!hasFile || !onExport) return;
    dismissAllToasts();
    setIsProcessing(true);
    onProcessingChange?.(true);
    setError('');
    setResultBlob(null);

    try {
      const result = await onExport({ files });
      if (result === null || result === undefined) return;
      if (result instanceof Blob) {
        setResultBlob(result);
        setResultName(files[0]?.name.replace(/\.[^/.]+$/, '') || 'edited');
      }
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  return (
    <Card padding="lg" className={`h-full ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="mb-5 pb-4 border-b border-slate-100">
        <Badge>Workspace Mode</Badge>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{toolName}</h2>
      </div>

      <div className="space-y-5">
        <FileUpload accept=".pdf" multiple={false} onFiles={handleFiles} value={files} />

        <p className="text-sm text-slate-500 leading-relaxed rounded-xl bg-slate-50 border border-slate-100 px-4 py-3.5">
          {EDIT_PDF_SIDEBAR_COPY.hintMessage}
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={isProcessing}
        disabled={!hasFile}
        onClick={handleExport}
        className="mt-6"
      >
        {isProcessing ? EDIT_PDF_SIDEBAR_COPY.processingButton : EDIT_PDF_SIDEBAR_COPY.exportButton}
      </Button>

      <Alert variant="error" message={error} show={!!error} className="mt-4" />

      <AnimatePresence>
        {resultBlob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 overflow-hidden"
          >
            <span className="block mb-2 text-xs font-bold text-emerald-700">
              {EDIT_PDF_SIDEBAR_COPY.readyLabel}
            </span>
            <Button
              variant="success"
              size="lg"
              fullWidth
              onClick={() => downloadBlob(resultBlob, resultName)}
            >
              <Download className="w-4 h-4" />
              {EDIT_PDF_SIDEBAR_COPY.downloadButton}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

EditPdfSidebar.propTypes = {
  toolName: PropTypes.string.isRequired,
  files: PropTypes.arrayOf(PropTypes.object),
  onFilesChange: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onProcessingChange: PropTypes.func,
};
