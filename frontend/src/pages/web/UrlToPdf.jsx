import { useState } from 'react';
import { Globe } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import { urlToPdf } from '../../services/webService';
import { downloadBlob } from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';

// Robust edge-case friendly URL validation
function isValidUrl(value) {
  const trimmed = value.trim();

  // Rule 1: Enforce HTTPS explicitly
  if (!trimmed.toLowerCase().startsWith('https://')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    // Rule 2: Strict domain checking
    // This requires: at least one dot, a real domain name, and a final extension between 2 to 6 characters long (like .com, .org, .co)
    const hostnameRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    // Rule 3: Block obvious typos where a dot was skipped (like googleom instead of google.com)
    if (!parsed.hostname.includes('.')) {
      return false;
    }

    return hostnameRegex.test(parsed.hostname);
  } catch {
    return false;
  }
}

export default function UrlToPdf() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { url, resultBlob },
    hasContent: Boolean(url) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      if (typeof s.url === 'string') setUrl(s.url);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const handleCapture = async () => {
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      setError('Please enter a URL.');
      return;
    }

    if (!isValidUrl(cleanUrl)) {
      setError(
        'Please enter a valid, complete web address starting with https:// (e.g., https://example.com)'
      );
      return;
    }

    setError('');
    setResultBlob(null);
    setIsProcessing(true);
    try {
      const blob = await urlToPdf(cleanUrl);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const hostname = (() => {
      try {
        return new URL(url.trim()).hostname.replace(/\W+/g, '-');
      } catch {
        return 'webpage';
      }
    })();
    downloadBlob(resultBlob, `${hostname}.pdf`);
  };

  return (
    <ToolPageLayout
      title="Web URL to PDF"
      subtitle="Capture any webpage as a PDF document"
      error={error}
    >
      <ToolWorkspace
        showOptions
        isProcessing={isProcessing}
        preview={
          <Card
            padding="lg"
            className={`${TOOL_LAYOUT.previewPanel} min-h-[420px] lg:min-h-[600px]`}
          >
            {isProcessing ? (
              <PdfLoader fileName={url.trim() || 'webpage'} operationLabel="Converting to PDF" />
            ) : resultBlob ? (
              <PdfPreview file={resultBlob} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-slate-300">
                <Globe className="w-10 h-10" />
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-400">No PDF captured yet</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Enter a URL and capture to preview the PDF here
                  </p>
                </div>
              </div>
            )}
          </Card>
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Capture"
            applyingLabel="Capturing..."
            downloadLabel="Download"
            canApply={!!url.trim()}
            onApply={handleCapture}
            onDownload={handleDownload}
            showDownload
            description="Enter a webpage URL and capture it as a downloadable PDF."
            descriptionStartLabel="Enter a URL"
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Webpage URL
              </span>
            </div>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
            />
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}
