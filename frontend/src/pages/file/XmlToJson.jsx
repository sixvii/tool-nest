import { useState } from 'react';
import { Button, FileUpload } from '../../components/ui';
import Textarea from '../../components/ui/Textarea';
import FileLoader from '../../components/loaders/FileLoader';
import { xmlToJson } from '../../services/fileToolsService';
import CopyButton from '../../components/ui/CopyButton';
import { downloadBlob, validateFile } from '../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { useToolPersistence } from '../../hooks/useToolPersistence';

export default function XmlToJson() {
  const [inputMode, setInputMode] = useState('paste');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [inputCopied, setInputCopied] = useState(false);
  const [outputCopied, setOutputCopied] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  useToolPersistence({
    toolName: 'XmlToJson',
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
  };

  const handleFile = async (files) => {
    const file = files[0];
    if (!file) return;

    try {
      validateFile(file, {
        maxSizeMB: FILE_DATA_MAX_SIZE_MB,
        allowedTypes: ['application/xml', 'text/xml'],
      });

      if (!file.name.toLowerCase().endsWith('.xml')) {
        throw new Error('Invalid file type. Please upload a .xml file.');
      }

      if (file.size === 0) {
        throw new Error('File is empty. Please upload a valid .xml file.');
      }

      setError('');
      setUploadedFileName(file.name);
      setInput(await file.text());
    } catch (err) {
      setError(err.message);
    }
  };

  const convert = async () => {
    if (!input.trim()) {
      setError('Please enter or upload XML content.');
      return;
    }

    const file = new File([input], uploadedFileName || 'data.xml', { type: 'application/xml' });
    try {
      validateFile(file, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }

    setError('');
    setOutput('');
    setIsConverting(true);

    try {
      const blob = await xmlToJson(file);
      const text = await blob.text();
      setOutput(JSON.stringify(JSON.parse(text), null, 2));
    } catch (err) {
      console.error(err);
      setError(clientErrorMessage(err));
    } finally {
      setIsConverting(false);
    }
  };

  const download = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'application/json' }), 'converted.json');
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

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 flex flex-col gap-6">
      {isConverting ? (
        <FileLoader
          fileName={uploadedFileName || 'data.xml'}
          sourceFormat="xml"
          targetFormat="json"
        />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch w-full">
            {/* LEFT — Input Panel */}
            <div className="flex flex-col gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Input XML
                </span>
                <CopyButton copied={inputCopied} onClick={() => handleCopy(input, 'input')} />
              </div>

              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                <button
                  type="button"
                  onClick={() => handleModeChange('paste')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all
                ${inputMode === 'paste' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('upload')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all
                ${inputMode === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Upload File
                </button>
              </div>

              {inputMode === 'paste' ? (
                <Textarea
                  placeholder="Paste your XML here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={24}
                  error={error}
                  className="font-mono text-sm resize-none"
                />
              ) : (
                <div className="min-h-[400px] flex flex-col justify-center">
                  <FileUpload accept=".xml" onFiles={handleFile} />
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
                XML → JSON
              </Button>
              <span className="text-xs text-slate-400 text-center">Click to convert</span>
            </div>

            {/* RIGHT — Output Panel */}
            <div className="flex flex-col gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Output JSON
                </span>
                <CopyButton copied={outputCopied} onClick={() => handleCopy(output, 'output')} />
              </div>

              <Textarea
                placeholder="JSON output will appear here..."
                value={output}
                onChange={() => {}}
                rows={24}
                disabled={!output}
                className="font-mono text-sm resize-none"
              />

              <Button variant="success" size="lg" fullWidth disabled={!output} onClick={download}>
                Download .json
              </Button>
            </div>
          </div>

          <div className="flex lg:hidden justify-center">
            <Button variant="primary" size="lg" fullWidth onClick={convert} disabled={isConverting}>
              Convert XML → JSON
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
