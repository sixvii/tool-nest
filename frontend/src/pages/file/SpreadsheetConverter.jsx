import PropTypes from 'prop-types';
import WorkspaceCard from '../../components/WorkspaceCard';
import FileLoader from '../../components/loaders/FileLoader';
import { csvToExcel, excelToCsv } from '../../services/fileToolsService';
import { validateFile } from '../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

const serviceMap = {
  '.csv': csvToExcel,
  '.xlsx': excelToCsv,
  '.xls': excelToCsv,
};

export default function SpreadsheetConverter({ toolName }) {
  const handleConvert = async ({ files }) => {
    validateFile(files[0], { maxSizeMB: FILE_DATA_MAX_SIZE_MB });
    const ext = files[0].name.split('.').pop().toLowerCase();
    const fn = serviceMap[`.${ext}`];
    if (!fn) throw new Error('Unsupported file type');
    return fn(files[0]);
  };

  return (
    <WorkspaceCard
      toolName={toolName}
      acceptTypes=".csv,.xlsx,.xls"
      allowMultiple={false}
      hintMessage="Upload a CSV to convert to Excel, or an Excel file to convert to CSV"
      onActionSubmit={handleConvert}
      renderLoader={({ fileName }) => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        return (
          <FileLoader
            fileName={fileName ?? ''}
            sourceFormat={ext}
            targetFormat={ext === 'csv' ? 'xlsx' : 'csv'}
          />
        );
      }}
      downloadButtonVariant="success"
      downloadButtonSize="lg"
      downloadButtonFullWidth
    />
  );
}

SpreadsheetConverter.propTypes = {
  toolName: PropTypes.string,
};
