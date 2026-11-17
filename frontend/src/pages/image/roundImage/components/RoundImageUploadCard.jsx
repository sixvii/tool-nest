import PropTypes from 'prop-types';
import FileUpload from '../../../../components/ui/FileUpload';
import Card from '../../../../components/ui/Card';
import { ROUND_IMAGE_COPY } from '../../../../constants/image/roundImage/roundImageConstants';

export default function RoundImageUploadCard({ onFiles }) {
  return (
    <Card>
      <FileUpload
        label={ROUND_IMAGE_COPY.uploadLabel}
        accept="image/*"
        multiple={false}
        onFiles={onFiles}
      />
    </Card>
  );
}

RoundImageUploadCard.propTypes = {
  onFiles: PropTypes.func.isRequired,
};
