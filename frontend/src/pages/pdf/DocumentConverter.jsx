import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import {
  CONVERSION_OPTIONS,
  TOOL_CONFIG,
} from '../../constants/pdf-constants/documentConverterConstants';
import { getExt, getConversionFn } from '../../utils/documentConverterUtils';
import {
  downloadBlob,
  isRestorableBlob,
  restoreFile,
  stripFileExtension,
  validateFile,
} from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { OFFICE_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { useToolPersistence } from '../../hooks/useToolPersistence';

export default function DocumentConverter({ toolName }) {
  const config = TOOL_CONFIG[toolName] || {};
  const acceptTypes =
    config.accept ||
    Object.keys(CONVERSION_OPTIONS)
      .map((e) => `.${e}`)
      .join(',');

  const [file, setFile] = useState(null);
  const [selectOptions, setSelectOptions] = useState([]);
  const [selected, setSelected] = useState('');
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const computeOptions = (fileName) => {
    const ext = getExt(fileName);
    let opts = CONVERSION_OPTIONS[ext] || [];
    if (config.forceOutput) {
      opts = opts.filter((o) => o.value === config.forceOutput);
    }
    return opts.map((o) => ({ label: o.label, value: o.value, ext: o.ext }));
  };

  const { isRestoreSettled } = useToolPersistence({
    toolName,
    snapshot: {
      file,
      fileName: file?.name ?? '',
      selectOptions,
      selected,
      resultBlob,
      resultName,
    },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        const restoredFile = restoreFile(s.file, s.fileName);
        setFile(restoredFile);
        setSelectOptions(
          Array.isArray(s.selectOptions) && s.selectOptions.length
            ? s.selectOptions
            : computeOptions(restoredFile.name)
        );
        applied = true;
      }
      if (typeof s.selected === 'string' && s.selected) setSelected(s.selected);
      if (isRestorableBlob(s.resultBlob)) {
        setResultBlob(s.resultBlob);
        setResultName(s.resultName ?? '');
        applied = true;
      }
      if (applied) return true;
    },
  });

  const acceptedListLabel = acceptTypes.replaceAll('.', '').toUpperCase().replaceAll(',', ', ');

  const handleFiles = (newFiles) => {
    const nextFile = newFiles?.[0] ?? null;
    setResultBlob(null);
    setError('');
    if (!nextFile) {
      setFile(null);
      setSelectOptions([]);
      setSelected('');
      return;
    }
    const opts = computeOptions(nextFile.name);
    if (!opts.length) {
      setError(`Unsupported file type. Accepted: ${acceptedListLabel}`);
      setFile(null);
      setSelectOptions([]);
      setSelected('');
      return;
    }
    try {
      validateFile(nextFile, { maxSizeMB: OFFICE_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      setFile(null);
      setSelectOptions([]);
      setSelected('');
      return;
    }
    setFile(nextFile);
    setSelectOptions(opts);
    setSelected(opts[0]?.value || '');
  };

  const handleClearFile = () => {
    conversionRef.current += 1;
    setFile(null);
    setSelectOptions([]);
    setSelected('');
    setResultBlob(null);
    setResultName('');
    setError('');
  };

  const handleSelectChange = (e) => {
    setSelected(e.target.value);
    setResultBlob(null);
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload a file first.');
      return;
    }
    const ext = getExt(file.name);
    const fn = getConversionFn(ext, selected);
    if (!fn) {
      setError('No conversion option available.');
      return;
    }

    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const data = await fn(file);
      if (conversionRef.current !== requestId) return;
      const blob = data instanceof Blob ? data : new Blob([data]);
      setResultBlob(blob);
      const outputExt = selectOptions.find((o) => o.value === selected)?.ext;
      const baseName = stripFileExtension(file.name) || 'result';
      setResultName(outputExt ? `${baseName}.${outputExt}` : baseName);
    } catch (err) {
      if (conversionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, resultName || 'converted');
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Converting Document" />
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName}
      subtitle="Convert your document to another format"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your document' },
                { text: 'Choose the output format' },
                { text: 'Download the converted file' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <PdfPreviewPanel
            file={file}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={acceptTypes}
            uploadTitle="Drag & drop your file"
            uploadSubtitle={`Accepted: ${acceptedListLabel}`}
            renderLoader={() => (
              <PdfLoader fileName={file?.name ?? ''} operationLabel="Converting Document" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert"
            applyingLabel="Converting..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Convert to</span>
              {selectOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectChange({ target: { value: opt.value } })}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-colors
                    ${
                      selected === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

DocumentConverter.propTypes = {
  toolName: PropTypes.string.isRequired,
};
