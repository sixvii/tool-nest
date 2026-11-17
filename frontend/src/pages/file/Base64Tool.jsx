import { useState } from 'react';
import { Card, Textarea, Button, Alert } from '../../components/ui';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { downloadBlob, isRestorableBlob } from '../../utils/fileUtils';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { clientErrorMessage } from '../../utils/apiError';

export default function Base64Tool() {
  const [activeTab, setActiveTab] = useState('text');

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [textError, setTextError] = useState('');

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  useToolPersistence({
    snapshot: { activeTab, inputText, outputText, file },
    hasContent: Boolean(inputText) || Boolean(outputText) || Boolean(file),
    warnOnUnload: true,
    onRestore: (s) => {
      if (s.activeTab) setActiveTab(s.activeTab);
      if (typeof s.inputText === 'string') setInputText(s.inputText);
      if (typeof s.outputText === 'string') setOutputText(s.outputText);
      if (isRestorableBlob(s.file)) setFile(s.file);
    },
  });

  const utf8ToBase64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
    return btoa(binString);
  };

  const base64ToUtf8 = (str) => {
    const binString = atob(str);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
    return new TextDecoder().decode(bytes);
  };

  const handleEncode = () => {
    setTextError('');
    if (!inputText.trim()) {
      setTextError('Please enter some text to encode.');
      return;
    }
    try {
      setOutputText(utf8ToBase64(inputText));
    } catch {
      setTextError('Encoding failed. Please check your input.');
    }
  };

  const handleDecode = () => {
    setTextError('');
    if (!inputText.trim()) {
      setTextError('Please enter Base64 text to decode.');
      return;
    }
    try {
      setOutputText(base64ToUtf8(inputText.trim()));
    } catch {
      setTextError('Invalid Base64 string. Please check your input.');
    }
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await copyToClipboard(outputText);
      setCopied(true);
      setTextError('');
      toastSuccess('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setTextError(clientErrorMessage(err) || 'Failed to copy. Please try again.');
    }
  };

  const handleTextClear = () => {
    setInputText('');
    setOutputText('');
    setTextError('');
    setCopied(false);
  };

  const handleFileEncode = () => {
    setFileError('');
    if (!file) {
      setFileError('Please upload a file first.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      const blob = new Blob([base64String], { type: 'text/plain' });
      downloadBlob(blob, `${file.name}.b64.txt`);
    };
    reader.onerror = () => setFileError('Failed to read file.');
    reader.readAsDataURL(file);
  };

  const handleFileDecode = async () => {
    setFileError('');
    if (!file) {
      setFileError('Please upload a Base64 encoded file first.');
      return;
    }
    try {
      const text = await file.text();
      const base64String = text.trim();
      const byteChars = atob(base64String);
      const byteNumbers = Array.from(byteChars).map((c) => c.codePointAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      const originalName = file.name.replace('.b64.txt', '').replace('.txt', '');
      downloadBlob(blob, originalName || 'decoded-file');
    } catch {
      setFileError('Invalid Base64 file. Please check your input.');
    }
  };

  const triggerFileInput = () => {
    document.getElementById('b64-file-input').click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileInput();
    }
  };

  return (
    <div className="flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 text-center">
        Base64 Encoder / Decoder
      </h1>
      <p className="text-slate-400 mb-6 sm:mb-10 text-sm sm:text-base text-center px-2">
        Encode or decode your text and files using Base64
      </p>

      <div className="w-full max-w-3xl flex flex-col gap-4">
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 text-sm font-bold rounded-2xl border transition-all
                ${
                  activeTab === 'text'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
          >
            Text
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 text-sm font-bold rounded-2xl border transition-all
                ${
                  activeTab === 'file'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
          >
            File
          </button>
        </div>

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <>
            <Card>
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">Input</h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Paste your text or Base64 string below
              </p>
              <Textarea
                placeholder="Enter text to encode or Base64 string to decode..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
              />
              <div className="flex gap-2 sm:gap-3 mt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleEncode}
                  disabled={!inputText.trim()}
                  className="flex-1"
                >
                  Encode
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleDecode}
                  disabled={!inputText.trim()}
                  className="flex-1"
                >
                  Decode
                </Button>
              </div>
            </Card>

            <Alert variant="error" message={textError} show={!!textError} />

            {outputText && (
              <Card>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold text-slate-700">Output</p>
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <Textarea value={outputText} rows={6} disabled />
              </Card>
            )}

            {inputText && (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={handleTextClear}>
                  Clear
                </Button>
              </div>
            )}
          </>
        )}

        {/* FILE TAB */}
        {activeTab === 'file' && (
          <>
            <Card>
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                File Upload
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Upload any file to encode, or a .txt Base64 file to decode
              </p>

              <input
                id="b64-file-input"
                type="file"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setFileError('');
                }}
              />

              {file ? (
                <div className="w-full border-2 border-emerald-400 bg-emerald-50/20 rounded-2xl px-4 py-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-emerald-700 truncate">{file.name}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" onClick={triggerFileInput}>
                      Change
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setFileError('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={triggerFileInput}
                  onKeyDown={handleKeyDown}
                  className="w-full p-6 sm:p-8 border-2 border-dashed rounded-2xl flex flex-col 
                            items-center justify-center gap-2 cursor-pointer transition-all
                            border-slate-200 hover:border-blue-300 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-left"
                >
                  <p className="text-sm font-medium text-slate-600 text-center w-full">
                    <span className="text-blue-600 font-bold">Browse</span> or drag & drop any file
                  </p>
                </button>
              )}
              <div className="flex gap-2 sm:gap-3 mt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleFileEncode}
                  disabled={!file}
                  className="flex-1"
                >
                  Encode & Download
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleFileDecode}
                  disabled={!file}
                  className="flex-1"
                >
                  Decode & Download
                </Button>
              </div>
            </Card>

            <Alert variant="error" message={fileError} show={!!fileError} />
          </>
        )}
      </div>
    </div>
  );
}
