import { useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { protectPdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';

export default function PdfProtect({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);

  useToolPersistence({
    namespace: 'pdf-protect',
    warnOnUnload: true,
    snapshot: { file: pdfFile, password, confirmPass, resultBlob },
    hasContent: Boolean(pdfFile) || Boolean(resultBlob),
    onRestore: (s) => {
      if (!s.file) return;
      loadFile(s.file);
      if (typeof s.password === 'string') setPassword(s.password);
      if (typeof s.confirmPass === 'string') setConfirmPass(s.confirmPass);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const getStrength = (p) => {
    if (!p) return 0;
    if (p.length >= 12) return 4;
    if (p.length >= 8) return 3;
    if (p.length >= 6) return 2;
    return 1;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = [
    '',
    'text-red-500',
    'text-orange-500',
    'text-yellow-600',
    'text-green-600',
  ];
  const barColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];

  const validate = () => {
    if (!password) return 'Password is required.';
    if (password.length < 4) return 'Password must be at least 4 characters.';
    if (password !== confirmPass) return 'Passwords do not match.';
    return '';
  };

  const loadFile = (file) => {
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
    setPassword('');
    setConfirmPass('');
    setPassError('');
    setPdfFile(file);
  };

  const handleFiles = (newFiles) => loadFile(newFiles?.[0] ?? null);

  const handleClearFile = () => {
    setPdfFile(null);
    setError('');
    setPassword('');
    setConfirmPass('');
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
    const err = validate();
    if (err) {
      setPassError(err);
      return;
    }
    setIsProcessing(true);
    try {
      const blob = await protectPdf({ file: pdfFile, password });

      if (blob instanceof Blob || blob instanceof File) {
        setResultBlob(blob);
      } else if (blob) {
        const wrapped = new Blob([blob], { type: 'application/pdf' });
        setResultBlob(wrapped);
      } else {
        setError('No file returned from server.');
      }
    } catch (e) {
      setError(clientErrorMessage(e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !pdfFile) return;
    downloadBlob(resultBlob, `${stripFileExtension(pdfFile.name)}_protected.pdf`);
  };

  const strength = getStrength(password);

  let confirmInputStyles = 'border-slate-200 focus:ring-blue-100 focus:border-blue-300';
  if (confirmPass) {
    confirmInputStyles =
      confirmPass === password
        ? 'border-green-300 focus:ring-green-100 bg-green-50/30'
        : 'border-red-300 focus:ring-red-100 bg-red-50/30';
  }

  const handleToggleShowPass = () => setShowPass((prev) => !prev);

  return (
    <ToolPageLayout
      title={toolName ?? 'Protect PDF with Password'}
      subtitle="Add a password to lock your PDF"
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
              <PdfLoader fileName={pdfFile?.name ?? ''} operationLabel="Protecting PDF" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Protect PDF"
            applyingLabel="Protecting..."
            downloadLabel="Download"
            completeMessage={resultBlob ? 'PDF protected successfully!' : ''}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="main-password-input"
                  className="text-sm font-black text-slate-500 uppercase tracking-widest"
                >
                  Password
                </label>
                {password && (
                  <span
                    className={`text-[10px] font-black uppercase tracking-wide ${strengthColor[strength]}`}
                  >
                    {strengthLabel[strength]}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 -mt-1">
                Min 4 characters. Required to open the protected PDF.
              </p>

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  id="main-password-input"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPassError('');
                    setResultBlob(null);
                  }}
                  placeholder="Enter password"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                />
                <button
                  type="button"
                  onClick={handleToggleShowPass}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-blue-500 transition-colors px-1"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>

              {password && (
                <div className="flex gap-1 pt-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength ? barColor[strength] : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  Strong Password Tips
                </p>
                <ul className="space-y-0.5">
                  {[
                    'At least 8 characters long',
                    'Mix uppercase & lowercase letters (A–Z, a–z)',
                    'Include numbers (0–9)',
                    'Add special characters like !, @, #, $, %',
                    'Avoid common words or birthdays',
                    'Store it safely — it cannot be recovered',
                  ].map((tip) => (
                    <li
                      key={tip}
                      className="text-xs text-blue-700/80 font-medium flex items-start gap-1.5"
                    >
                      <span className="mt-0.5 shrink-0">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 mt-4 pt-4 space-y-2">
              <label
                htmlFor="confirm-password-input"
                className="text-sm font-black text-slate-500 uppercase tracking-widest"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  id="confirm-password-input"
                  value={confirmPass}
                  onChange={(e) => {
                    setConfirmPass(e.target.value);
                    setPassError('');
                    setResultBlob(null);
                  }}
                  placeholder="Re-enter password"
                  className={`w-full text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 transition-all ${confirmInputStyles}`}
                />
              </div>
              {passError && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                  {passError}
                </p>
              )}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfProtect.propTypes = {
  toolName: PropTypes.string,
};
