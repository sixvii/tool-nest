import { useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { removeImageMetadata } from '../../services/imageService';
import { validateFile, downloadBlob } from '../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import Button from '../../components/ui/Button';

export default function RemoveMetadata({ file, fileName }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  const handleRemoveMetadata = async () => {
    if (!file) return;
    setError('');
    try {
      validateFile(file, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(err.message);
      return;
    }
    setRemoving(true);
    try {
      const blob = await removeImageMetadata(file);
      downloadBlob(blob, `clean_${fileName}`);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to remove metadata. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Button
        variant="success"
        size="lg"
        fullWidth
        loading={removing}
        disabled={removing}
        onClick={handleRemoveMetadata}
      >
        <Download className="w-4 h-4" />
        {removing ? 'Removing...' : 'Remove Metadata'}
      </Button>

      {error && <p className="text-sm text-red-600 text-center mt-2">{error}</p>}
    </>
  );
}

RemoveMetadata.propTypes = {
  file: PropTypes.instanceOf(File),
  fileName: PropTypes.string,
};
