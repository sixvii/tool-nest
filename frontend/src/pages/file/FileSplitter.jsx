import { useState } from 'react';
import PropTypes from 'prop-types';
import WorkspaceCard from '../../components/WorkspaceCard';
import Input from '../../components/ui/Input';
import FileLoader from '../../components/loaders/FileLoader';
import { splitCsv, splitExcel } from '../../services/fileToolsService';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { validateFile } from '../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

const serviceMap = {
  '.csv': splitCsv,
  '.xlsx': splitExcel,
  '.xls': splitExcel,
};

export default function FileSplitter({ toolName }) {
  const [rowsPerFile, setRowsPerFile] = useState('');

  useToolPersistence({
    namespace: 'file-splitter',
    snapshot: { rowsPerFile },
    hasContent: Boolean(rowsPerFile.trim()),
    onRestore: (s) => {
      if (typeof s.rowsPerFile === 'string') setRowsPerFile(s.rowsPerFile);
    },
  });

  const handleConvert = async ({ files }) => {
    validateFile(files[0], { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
    if (!rowsPerFile || Number.isNaN(Number(rowsPerFile)) || Number(rowsPerFile) < 1) {
      throw new Error('Please enter a valid number of rows per file.');
    }
    const ext = files[0].name.split('.').pop().toLowerCase();
    const fn = serviceMap[`.${ext}`];
    if (!fn) throw new Error('Unsupported file type. Use CSV or Excel.');
    return fn(files[0], Number(rowsPerFile));
  };

  return (
    <WorkspaceCard
      toolName={toolName}
      acceptTypes=".csv,.xlsx,.xls"
      allowMultiple={false}
      hintMessage="Upload a large CSV or Excel file and set rows per split file"
      onActionSubmit={handleConvert}
      renderLoader={({ fileName }) => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        return <FileLoader fileName={fileName ?? ''} sourceFormat={ext} targetFormat={ext} />;
      }}
      downloadButtonVariant="success"
      downloadButtonSize="lg"
      downloadButtonFullWidth
    >
      <Input
        label="Rows Per File"
        type="number"
        placeholder="e.g. 1000"
        value={rowsPerFile}
        onChange={(e) => setRowsPerFile(e.target.value)}
        error=""
      />
    </WorkspaceCard>
  );
}

FileSplitter.propTypes = {
  toolName: PropTypes.string,
};
