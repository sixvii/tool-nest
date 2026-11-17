import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, Button, FileUpload, Alert, Badge } from '../../components/ui';
import FileLoader from '../../components/loaders/FileLoader';
import { downloadBlob, isRestorableBlob } from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { validateXmlFile } from '../../utils/xmlToExcelUtils';
import { convertXmlToExcel } from '../../services/fileToolsService';
import { useToolPersistence } from '../../hooks/useToolPersistence';

export default function XmlToExcel() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');

  useToolPersistence({
    snapshot: { files, resultBlob, resultName },
    hasContent: files.length > 0 || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      if (Array.isArray(s.files) && s.files.length) setFiles(s.files);
      if (isRestorableBlob(s.resultBlob)) setResultBlob(s.resultBlob);
      if (typeof s.resultName === 'string') setResultName(s.resultName);
    },
  });

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles);
    setResultBlob(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!files.length) return;
    const validationError = validateXmlFile(files[0]);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsProcessing(true);
    setError('');
    setResultBlob(null);
    try {
      const blob = await convertXmlToExcel(files[0]);
      const name = files[0].name.replace(/\.xml$/i, '');
      setResultBlob(blob);
      setResultName(`${name}.xlsx`);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, resultName);
  };

  return (
    <div className="flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 text-center">
        XML to Excel
      </h1>
      <p className="text-slate-400 mb-6 sm:mb-10 text-sm sm:text-base text-center px-2">
        Convert your XML file to Excel (.xlsx) format
      </p>

      <div className="w-full max-w-2xl">
        {isProcessing ? (
          <FileLoader fileName={files[0]?.name ?? ''} sourceFormat="xml" targetFormat="xlsx" />
        ) : (
          <Card padding="lg">
            <div className="text-center mb-4 sm:mb-6">
              <Badge>Workspace Mode</Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">XML to Excel</h2>
            </div>

            {files.length === 0 ? (
              <FileUpload accept=".xml" multiple={false} onFiles={handleFilesChange} />
            ) : (
              <div className="w-full border-2 border-emerald-400 bg-emerald-50/20 rounded-2xl px-4 py-4 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-emerald-700 truncate">{files[0].name}</span>
                <div className="flex gap-2 flex-shrink-0">
                  <input
                    id="xml-file-input"
                    type="file"
                    accept=".xml"
                    className="hidden"
                    onChange={(e) =>
                      handleFilesChange(e.target.files[0] ? [e.target.files[0]] : [])
                    }
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => document.getElementById('xml-file-input').click()}
                  >
                    Change
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleFilesChange([])}>
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!files.length}
              onClick={handleConvert}
              className="mt-4 sm:mt-6"
            >
              Convert to Excel
            </Button>

            <Alert variant="error" message={error} show={!!error} className="mt-4" />
          </Card>
        )}

        {resultBlob && (
          <Card padding="lg" className="mt-4">
            <span className="block mb-2 text-xs font-bold text-emerald-700">Ready to download</span>
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
