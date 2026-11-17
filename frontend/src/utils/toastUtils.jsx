import toast from 'react-hot-toast';
import { DownloadToast, ErrorToast, SuccessToast } from '../components/ui/ToastCards';

export function toastError(message) {
  toast.custom((t) => <ErrorToast t={t} message={message} />, {
    id: `error:${message}`,
    duration: 8000,
  });
}

export function notifyDownload(filename, sizeBytes) {
  toast.custom((t) => <DownloadToast t={t} filename={filename} sizeBytes={sizeBytes} />, {
    duration: 5000,
  });
}

export function toastSuccess(message) {
  toast.custom((t) => <SuccessToast t={t} message={message} />, { duration: 5000 });
}

export function dismissAllToasts() {
  toast.dismiss();
}
