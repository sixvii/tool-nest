import { useState, useRef } from 'react';
import { Button, FileUpload } from '../../components/ui';
import Textarea from '../../components/ui/Textarea';
import FileLoader from '../../components/loaders/FileLoader';
import { jsonToXml } from '../../services/fileToolsService';
import { downloadBlob, validateFile } from '../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { useToolPersistence } from '../../hooks/useToolPersistence';

const formatXml = (xmlString) => {
  const INDENT = '  ';
  let depth = 0;
  let result = '';

  const cleaned = xmlString.replace(/>\s+</g, '><').trim();

  const declarationMatch = cleaned.match(/^<\?xml[^?]*\?>/);
  let rest = cleaned;
  if (declarationMatch) {
    result += declarationMatch[0] + '\n';
    rest = cleaned.slice(declarationMatch[0].length);
  }

  const tokens = rest.split(/(<[^>]+>)/g).filter((t) => t !== '');

  for (const token of tokens) {
    if (token.startsWith('</')) {
      depth--;
      result += INDENT.repeat(depth) + token + '\n';
    } else if (token.startsWith('<') && !token.startsWith('<?') && !token.endsWith('/>')) {
      result += INDENT.repeat(depth) + token + '\n';
      depth++;
    } else if (token.endsWith('/>')) {
      result += INDENT.repeat(depth) + token + '\n';
    } else if (token.startsWith('<?')) {
      result += INDENT.repeat(depth) + token + '\n';
    } else {
      const text = token.trim();
      if (text) {
        result = result.trimEnd() + text + '\n';
      }
    }
  }

  return result.trim();
};

const getCopyButtonClass = (hasText, copied) => {
  if (!hasText) return 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400';
  return copied
    ? 'bg-emerald-50 text-emerald-600'
    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700';
};

export default function JsonToXml() {
  const [inputMode, setInputMode] = useState('paste');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [inputCopied, setInputCopied] = useState(false);
  const [outputCopied, setOutputCopied] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  useToolPersistence({
    toolName: 'JsonToXml',
    snapshot: { inputMode, input, output, uploadedFileName },
    hasContent: Boolean(input) || Boolean(output),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (s.inputMode) setInputMode(s.inputMode);
      if (typeof s.input === 'string' && s.input.trim()) {
        setInput(s.input);
        applied = true;
      }
      if (typeof s.output === 'string' && s.output.trim()) {
        setOutput(s.output);
        applied = true;
      }
      if (typeof s.uploadedFileName === 'string') setUploadedFileName(s.uploadedFileName);
      if (applied) return true;
    },
  });

  const handleModeChange = (mode) => {
    setInputMode(mode);
    if (mode === 'paste') setUploadedFileName('');
    if (mode === 'upload') {
      setTimeout(() => fileInputRef.current?.click(), 50);
    }
  };

  const handleFile = async (files) => {
    if (!files.length) return;
    const file = files[0];
    if (!file.name.endsWith('.json')) {
      setError('Invalid file type. Please upload a .json file.');
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      setError('File too large. Maximum size is 150MB.');
      return;
    }
    if (file.size === 0) {
      setError('File is empty. Please upload a valid .json file.');
      return;
    }
    setError('');
    setUploadedFileName(file.name);
    setInput(await file.text());
  };

  const handleCopy = async (text, type) => {
    if (!text) return;
    try {
      await copyToClipboard(text);
      setError('');
      toastSuccess('Copied to clipboard!');
      if (type === 'input') {
        setInputCopied(true);
        setTimeout(() => setInputCopied(false), 2000);
      } else {
        setOutputCopied(true);
        setTimeout(() => setOutputCopied(false), 2000);
      }
    } catch (err) {
      setError(clientErrorMessage(err) || 'Failed to copy. Please try again.');
    }
  };

  const convert = async () => {
    setError('');
    setOutput('');
    if (!input.trim()) {
      setError('Please enter or upload JSON content.');
      return;
    }
    try {
      JSON.parse(input);
    } catch {
      setError('Invalid JSON. Please check your input.');
      return;
    }
    const file = new File([input], uploadedFileName || 'data.json', {
      type: 'application/json',
    });
    try {
      validateFile(file, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }
    setIsConverting(true);
    try {
      const blob = await jsonToXml(file);
      const text = await blob.text();
      setOutput(formatXml(text));
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsConverting(false);
    }
  };

  const download = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'application/xml' }), 'converted.xml');
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 flex flex-col gap-6">
      {isConverting ? (
        <FileLoader
          fileName={uploadedFileName || 'data.json'}
          sourceFormat="json"
          targetFormat="xml"
        />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch w-full">
            {/* LEFT — Input Panel */}
            <div className="flex flex-col gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Input JSON
                </span>
                <button
                  onClick={() => handleCopy(input, 'input')}
                  disabled={!input}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${getCopyButtonClass(!!input, inputCopied)}`}
                >
                  {inputCopied ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                <button
                  onClick={() => handleModeChange('paste')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all
                ${inputMode === 'paste' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Paste Text
                </button>
                <button
                  onClick={() => handleModeChange('upload')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all
                ${inputMode === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Upload File
                </button>
              </div>

              {inputMode === 'paste' ? (
                <div className="w-full">
                  <Textarea
                    placeholder="Paste your JSON here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={24}
                    error={error}
                    className="font-mono text-sm resize-none"
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="min-h-[400px] flex flex-col justify-center">
                  <FileUpload accept=".json" onFiles={handleFile} ref={fileInputRef} />
                  {input && (
                    <p className="text-xs text-emerald-600 font-medium mt-2 ml-1">
                      ✓ File loaded — click Convert to proceed
                    </p>
                  )}
                  {error && <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>}
                </div>
              )}
            </div>

            {/* CENTER — Convert Button */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-2 flex-shrink-0 w-32">
              <Button
                variant="primary"
                size="md"
                onClick={convert}
                className="w-full"
                disabled={isConverting}
              >
                JSON → XML
              </Button>
              <span className="text-xs text-slate-400 text-center">Click to convert</span>
            </div>

            {/* RIGHT — Output Panel */}
            <div className="flex flex-col gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Output XML
                </span>
                <button
                  onClick={() => handleCopy(output, 'output')}
                  disabled={!output}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${getCopyButtonClass(!!output, outputCopied)}`}
                >
                  {outputCopied ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="w-full">
                <Textarea
                  placeholder="XML output will appear here..."
                  value={output}
                  onChange={() => {}}
                  rows={24}
                  disabled={!output}
                  className="font-mono text-sm resize-none"
                  spellCheck={false}
                />
              </div>
              <Button variant="success" size="lg" fullWidth disabled={!output} onClick={download}>
                Download .xml
              </Button>
            </div>
          </div>

          <div className="flex lg:hidden justify-center">
            <Button variant="primary" size="lg" fullWidth onClick={convert} disabled={isConverting}>
              Convert JSON → XML
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
