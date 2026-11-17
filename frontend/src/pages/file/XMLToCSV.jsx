import { useState } from 'react';
import PropTypes from 'prop-types';
import { Download, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { FileUpload, Button, Alert, Card, Badge, Textarea } from '../../components/ui';
import FileLoader from '../../components/loaders/FileLoader';
import { xmlToCsv } from '../../services/fileToolsService';
import { downloadBlob, validateFile, isRestorableBlob } from '../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import {
  CSV_PREVIEW_ROW_LIMIT,
  buildCsvResult,
  getBaseNameFromFile,
  xmlInputToFile,
} from '../../utils/xmlToCsvUtils';

export default function XMLToCSV({ toolName }) {
  const [xmlInput, setXmlInput] = useState('');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [csvPreview, setCsvPreview] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { xmlInput, file, resultBlob, resultName, csvPreview },
    hasContent: Boolean(xmlInput.trim()) || Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      if (typeof s.xmlInput === 'string') setXmlInput(s.xmlInput);
      if (isRestorableBlob(s.file)) setFile(s.file);
      if (isRestorableBlob(s.resultBlob)) setResultBlob(s.resultBlob);
      if (typeof s.resultName === 'string') setResultName(s.resultName);
      if (s.csvPreview) setCsvPreview(s.csvPreview);
    },
  });

  const hasInput = !!xmlInput.trim();

  const resetOutput = () => {
    setResultBlob(null);
    setResultName('');
    setCsvPreview(null);
    setError('');
  };

  const handleXmlChange = (e) => {
    setXmlInput(e.target.value);
    resetOutput();
  };

  const handleFiles = async (files) => {
    const uploaded = files[0] ?? null;

    if (!uploaded) {
      setFile(null);
      resetOutput();
      setXmlInput('');
      return;
    }

    if (!uploaded.name.toLowerCase().endsWith('.xml')) {
      setError('Only .xml files are allowed.');
      return;
    }

    try {
      validateFile(uploaded, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }

    setFile(uploaded);
    resetOutput();

    try {
      const text = await uploaded.text();
      setXmlInput(text);
    } catch {
      setError('Could not read the uploaded file.');
    }
  };

  const handleConvert = async () => {
    if (!hasInput) return;

    setIsProcessing(true);
    resetOutput();

    const baseName = getBaseNameFromFile(file);

    try {
      const uploadFile = xmlInputToFile(xmlInput, file?.name || 'input.xml');
      validateFile(uploadFile, { maxSizeMB: FILE_DATA_MAX_SIZE_MB });

      const blob = await xmlToCsv(uploadFile);
      const csvText = await blob.text();
      const result = buildCsvResult(csvText, baseName);

      setResultBlob(result.blob);
      setResultName(result.resultName);
      setCsvPreview(result.csvPreview);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setXmlInput('');
    setFile(null);
    resetOutput();
  };

  return (
    <div className="flex justify-center items-start py-2 sm:py-4 px-3 sm:px-4">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-6xl"
      >
        {isProcessing ? (
          <FileLoader fileName={file?.name ?? 'input.xml'} sourceFormat="xml" targetFormat="csv" />
        ) : (
          <Card padding="lg">
            <div className="text-center mb-4 sm:mb-6">
              <Badge>Workspace Mode</Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                {toolName ?? 'XML to CSV'}
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 min-h-[480px]">
              {/* Left — Input */}
              <div className="w-full md:w-1/2 flex flex-col">
                <div className="space-y-3 sm:space-y-4 flex-1">
                  <Textarea
                    label="XML Input"
                    placeholder={'<root>\n  <row>\n    <name>Example</name>\n  </row>\n</root>'}
                    value={xmlInput}
                    onChange={handleXmlChange}
                    rows={12}
                    className="font-mono text-sm min-h-[220px]"
                  />

                  <div className="relative flex items-center justify-center my-1.5 sm:my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-slate-200" />
                    </div>
                    <span className="relative px-3 bg-white text-[9px] sm:text-xs font-bold text-slate-400 uppercase">
                      Or File Drop
                    </span>
                  </div>

                  <FileUpload accept=".xml" multiple={false} onFiles={handleFiles} />
                  <p className="text-xs text-slate-400 text-center">
                    Paste XML above or upload an .xml file
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!hasInput}
                  onClick={handleConvert}
                  className="mt-4"
                >
                  Convert
                </Button>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!hasInput && !resultBlob}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>

                <Alert variant="error" message={error} show={!!error} className="mt-4" />
              </div>

              {/* Right — CSV preview */}
              <div className="w-full md:w-1/2 flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-5">
                <div className="mb-3 flex-shrink-0">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    CSV Output Preview
                  </span>
                  {csvPreview?.truncated && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Showing first {CSV_PREVIEW_ROW_LIMIT} of {csvPreview.totalRows} rows
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-auto min-h-[320px] rounded-xl border border-slate-200 bg-white">
                  {csvPreview?.rows?.length ? (
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {csvPreview.rows[0].map((cell) => (
                            <th
                              key={`header-${cell}`}
                              className="px-3 py-2 font-bold text-slate-600 border-b border-slate-200 whitespace-nowrap"
                            >
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.slice(1).map((row, rowIdx) => (
                          <tr
                            key={`row-${row.join('|')}`}
                            className="border-b border-slate-100 last:border-0"
                          >
                            {row.map((cell, cellIdx) => (
                              <td
                                key={`cell-${rowIdx}-${cellIdx}`}
                                className="px-3 py-2 text-slate-700 whitespace-nowrap"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[320px] px-4 text-center">
                      <p className="text-xs text-slate-400">
                        Converted CSV will appear here as a table preview
                      </p>
                    </div>
                  )}
                </div>

                {resultBlob && (
                  <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    className="mt-3"
                    onClick={() => downloadBlob(resultBlob, resultName)}
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

XMLToCSV.propTypes = {
  toolName: PropTypes.string,
};
