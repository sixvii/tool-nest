import { useState } from 'react';
import PropTypes from 'prop-types';
import { FileText } from 'lucide-react';
import { Card, FileUpload } from '../../../../components/ui';
import { validateFile } from '../../../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../../../constants/fileSizeLimits';

export default function EditPdfUploadGate({ toolName, onFilesChange }) {
  const [error, setError] = useState('');

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;

    try {
      validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB, allowedTypes: ['application/pdf'] });
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    setError('');
    onFilesChange([file]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <Card padding="lg" className="p-6 sm:p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <FileText className="w-7 h-7 text-blue-600" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl sm:text-3xl font-black text-slate-900">{toolName}</h1>
        <p className="mt-2 text-sm text-slate-500">Upload a PDF to start editing</p>

        <FileUpload
          className="mt-7 text-left"
          accept=".pdf"
          multiple={false}
          onFiles={handleFiles}
          error={error}
          title={
            <>
              Drag &amp; drop your PDF or <span className="text-blue-600 font-bold">browse</span>
            </>
          }
          subtitle={`PDF only · Maximum ${PDF_MAX_SIZE_MB} MB`}
        />

        <p className="mt-5 text-xs text-slate-400">
          You can edit text, add shapes, images, and drawings after upload.
        </p>
      </Card>
    </div>
  );
}

EditPdfUploadGate.propTypes = {
  toolName: PropTypes.string.isRequired,
  onFilesChange: PropTypes.func.isRequired,
};
