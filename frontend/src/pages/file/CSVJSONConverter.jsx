import { useState } from 'react';
import { Download, ArrowLeftRight } from 'lucide-react';
import FileUpload from '../../components/ui/FileUpload';
import Card from '../../components/ui/Card';
import Heading from '../../components/ui/Heading';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import FileLoader from '../../components/loaders/FileLoader';
import { csvToJson, jsonToCsv } from '../../services/fileToolsService';
import { downloadBlob, isRestorableBlob, validateFile } from '../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';

const MODES = [
  { label: 'CSV → JSON', value: 'csv-to-json', accept: '.csv', outputExt: 'json' },
  { label: 'JSON → CSV', value: 'json-to-csv', accept: '.json', outputExt: 'csv' },
];

export default function CSVJSONConverter() {
  const [mode, setMode] = useState('csv-to-json');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const file = files[0] ?? null;
  const currentMode = MODES.find((m) => m.value === mode);

  useToolPersistence({
    snapshot: { mode, files, resultBlob },
    hasContent: files.length > 0 || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      if (s.mode) setMode(s.mode);
      if (Array.isArray(s.files) && s.files.length) setFiles(s.files);
      if (isRestorableBlob(s.resultBlob)) setResultBlob(s.resultBlob);
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      const expectedExt = currentMode.accept.replace('.', '');
      if (!nextFile.name.toLowerCase().endsWith(`.${expectedExt}`)) {
        setError(`Only .${expectedExt} files are allowed.`);
        return;
      }
      try {
        validateFile(nextFile, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFiles(newFiles);
    setResultBlob(null);
    setError('');
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setFiles([]);
    setResultBlob(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please upload a file first.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const blob = mode === 'csv-to-json' ? await csvToJson(file) : await jsonToCsv(file);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const name = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(resultBlob, `${name}.${currentMode.outputExt}`);
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col items-center px-4 py-12">
      <Heading as="h1" className="mb-2">
        CSV ↔ JSON Converter
      </Heading>
      <p className="text-slate-400 text-sm mb-10">Convert between CSV and JSON formats</p>

      <div className="w-full max-w-2xl flex flex-col gap-5">
        {isProcessing ? (
          <FileLoader
            fileName={file?.name ?? ''}
            sourceFormat={mode === 'csv-to-json' ? 'csv' : 'json'}
            targetFormat={currentMode.outputExt}
          />
        ) : (
          <>
            {/* Mode Toggle */}
            <Card>
              <Heading as="h4" className="mb-4">
                Conversion Direction
              </Heading>
              <div className="grid grid-cols-2 gap-3">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleModeSwitch(m.value)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all
                            flex items-center justify-center gap-2
                            ${
                              mode === m.value
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* File Upload */}
            <Card>
              <FileUpload
                label={`Upload ${currentMode.accept.replace('.', '').toUpperCase()} File`}
                accept={currentMode.accept}
                multiple={false}
                value={files}
                onFiles={handleFiles}
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!file}
                onClick={handleConvert}
                className="mt-4"
              >
                Convert to {currentMode.outputExt.toUpperCase()}
              </Button>
            </Card>
          </>
        )}

        <Alert variant="error" message={error} show={!!error} />

        {resultBlob && (
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <Heading as="h4">Result Ready</Heading>
              <Badge variant="success">{currentMode.outputExt.toUpperCase()}</Badge>
            </div>
            <Button variant="success" size="lg" fullWidth onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Download
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
