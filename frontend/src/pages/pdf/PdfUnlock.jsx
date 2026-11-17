import { useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { unlockPdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

const checkPdfSecurity = async (file) => {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const buffer = await file.arrayBuffer();

    try {
      await PDFDocument.load(buffer, { ignoreEncryption: false });
      return { isEncrypted: false, isValid: true };
    } catch (e) {
      if (e.message?.toLowerCase().includes('encrypt')) {
        return { isEncrypted: true, isValid: true };
      }
      return { isEncrypted: false, isValid: false };
    }
  } catch {
    return { isEncrypted: false, isValid: false };
  }
};

export default function PdfUnlock({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);

  useToolPersistence({
    namespace: 'pdf-unlock',
    warnOnUnload: true,
    snapshot: { file: pdfFile, password, resultBlob },
    hasContent: Boolean(pdfFile) || Boolean(resultBlob),
    onRestore: (s) => {
      if (!s.file) return;
      loadFile(s.file);
      if (typeof s.password === 'string') setPassword(s.password);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const loadFile = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }
    try {
      validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }

    setError('');
    setResultBlob(null);

    const security = await checkPdfSecurity(file);

    if (!security.isValid) {
      setError('Could not read this file. It may be corrupted or invalid.');
      setPdfFile(null);
      return;
    }

    if (!security.isEncrypted) {
      setError('This PDF is not password protected — no unlocking needed.');
      setPdfFile(null);
      return;
    }

    setPassword('');
    setPassError('');
    setPdfFile(file);
  };

  const handleFiles = (newFiles) => {
    if (newFiles && newFiles.length > 0) loadFile(newFiles[0]);
  };

  const handleClearFile = () => {
    setPdfFile(null);
    setError('');
    setPassword('');
    setPassError('');
    setResultBlob(null);
  };

  const handleApply = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF first.');
      return;
    }
    setPassError('');
    setError('');
    setResultBlob(null);

    if (!password.trim()) {
      setPassError('Please enter the PDF password.');
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await unlockPdf({ file: pdfFile, password });
      if (blob instanceof Blob || blob instanceof File) {
        setResultBlob(blob);
      } else if (blob) {
        const wrapped = new Blob([blob], { type: 'application/pdf' });
        setResultBlob(wrapped);
      } else {
        setError('No file returned from server.');
      }
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e?.message || '';
      if (
        errorMessage.toLowerCase().includes('password') ||
        e?.response?.status === 401 ||
        e?.response?.status === 403
      ) {
        setPassError('Incorrect password. Please verify the credentials and try again.');
      } else {
        setError('Decryption failed. Please make sure you typed the correct password.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !pdfFile) return;
    downloadBlob(resultBlob, `${stripFileExtension(pdfFile.name)}_unlocked.pdf`);
  };

  return (
    <ToolPageLayout
      title={toolName ?? 'Unlock PDF'}
      subtitle="Remove password protection from your PDF"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!pdfFile}
        isProcessing={isProcessing}
        preview={
          <PdfPreviewPanel
            file={pdfFile}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept=".pdf"
            uploadTitle="Drag & drop your PDF"
            uploadSubtitle="Accepted: PDF only · Max file size: 50 MB"
            renderLoader={() => (
              <PdfLoader fileName={pdfFile?.name ?? ''} operationLabel="Unlocking PDF" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Unlock PDF"
            applyingLabel="Unlocking..."
            downloadLabel="Download"
            completeMessage={resultBlob ? 'PDF unlocked successfully!' : ''}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="space-y-2">
              <label
                htmlFor="pdf-password-input"
                className="text-base font-black text-slate-500 uppercase tracking-widest"
              >
                PDF Password
              </label>
              <p className="text-base text-slate-400">
                Enter the current password to remove protection and get an unlocked copy.
              </p>

              <div className="relative">
                <input
                  id="pdf-password-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPassError('');
                    setResultBlob(null);
                  }}
                  placeholder="Enter PDF password"
                  className="w-full text-base border border-slate-200 rounded-xl px-4 py-2.5 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-blue-500 transition-colors px-1"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>

              {passError && (
                <p className="text-sm text-red-500 font-semibold flex items-center gap-1 mt-1">
                  {passError}
                </p>
              )}

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  How it works
                </p>
                <ul className="space-y-0.5">
                  {[
                    'Enter the password that was used to protect the PDF',
                    'The unlocked copy will be returned as a downloadable file',
                    'Wrong password will result in an error — double check it',
                    'Only use this on files you own or have permission to unlock',
                    'Does not bypass DRM or certificate-based encryption',
                  ].map((tip) => (
                    <li
                      key={tip}
                      className="text-sm text-blue-700/80 font-medium flex items-start gap-1.5"
                    >
                      <span className="mt-0.5 shrink-0">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfUnlock.propTypes = {
  toolName: PropTypes.string,
};
