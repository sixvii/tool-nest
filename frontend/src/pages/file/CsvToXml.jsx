import { useState } from 'react';
import { Download } from 'lucide-react';
import { convertCsvToXml } from '../../services/fileToolsService';
import { validateCsvFile } from '../../utils/csvToXmlUtils';
import { downloadBlob, isRestorableBlob } from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import FileLoader from '../../components/loaders/FileLoader';
import Button from '../../components/ui/Button';

export default function CSVToXML() {
  const [file, setFile] = useState(null);
  const [xmlResult, setXmlResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, xmlResult },
    hasContent: Boolean(file) || Boolean(xmlResult),
    warnOnUnload: true,
    onRestore: (s) => {
      if (isRestorableBlob(s.file)) setFile(s.file);
      if (s.xmlResult != null) setXmlResult(s.xmlResult);
    },
  });

  const handleConvert = async () => {
    setError('');
    setXmlResult(null);

    const validationError = validateCsvFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      const result = await convertCsvToXml(file);
      setXmlResult(result);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!xmlResult || !file) return;
    const baseName = file.name.replace(/\.csv$/i, '');
    downloadBlob(xmlResult, `${baseName}.xml`);
  };

  return (
    <div className="flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 text-center">
        CSV to XML Converter
      </h1>
      <p className="text-slate-400 mb-6 sm:mb-10 text-sm sm:text-base text-center px-2">
        Upload your .csv file and convert it to XML format
      </p>

      <div className="w-full max-w-3xl flex flex-col gap-4">
        {/* Upload Section */}
        {loading ? (
          <FileLoader fileName={file?.name ?? ''} sourceFormat="csv" targetFormat="xml" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">Upload File</h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Select your CSV file to convert
            </p>

            {/* File Input */}
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onClick={(e) => (e.target.value = null)}
              onChange={(e) => {
                setFile(e.target.files[0] || null);
                setError('');
                setXmlResult(null);
              }}
            />

            {/* Drop Zone */}
            {file ? (
              <div className="w-full border border-emerald-300 bg-emerald-50/30 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-emerald-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => document.getElementById('csv-file-input').click()}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700
                    border border-slate-200 hover:border-slate-400 rounded-lg px-3 py-1
                    transition-all"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setError('');
                      setXmlResult(null);
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-700
                    border border-red-200 hover:border-red-400 rounded-lg px-3 py-1
                    transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById('csv-file-input').click()}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl
                flex flex-col items-center justify-center gap-2 cursor-pointer
                hover:border-blue-300 bg-slate-50/50 transition-all"
              >
                <p className="text-sm font-medium text-slate-600 text-center">
                  <span className="text-blue-600 font-bold">Browse</span> or drag & drop your .csv
                  file
                </p>
                <p className="text-xs text-slate-400">Only .csv files supported</p>
              </button>
            )}

            {/* Error */}
            {error && <p className="text-xs text-red-500 font-medium mt-3">{error}</p>}

            {/* Convert Button */}
            <button
              type="button"
              onClick={handleConvert}
              disabled={!file || loading}
              className="w-full mt-4 py-2 text-sm font-bold text-white bg-blue-600
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              rounded-2xl transition-all"
            >
              Convert to XML
            </button>
          </div>
        )}

        {/* Result Section */}
        {xmlResult && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">
              Conversion Successful
            </h2>
            <Button variant="success" size="lg" fullWidth onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Download XML
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
