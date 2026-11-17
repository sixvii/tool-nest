import { useState } from 'react';
import { convertCase } from '../../utils/caseConverterUtils';
import { Card, Textarea, Button, Alert } from '../../components/ui';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { clientErrorMessage } from '../../utils/apiError';

const buttons = [
  { label: 'UPPER CASE', type: 'upper' },
  { label: 'lower case', type: 'lower' },
  { label: 'Title Case', type: 'title' },
  { label: 'Sentence case', type: 'sentence' },
  { label: 'camelCase', type: 'camel' },
  { label: 'snake_case', type: 'snake' },
  { label: 'kebab-case', type: 'kebab' },
  { label: 'AlTeRnAtE', type: 'alternate' },
];

export default function CaseConverter({ toolName = 'Case Converter' }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useToolPersistence({
    toolName,
    snapshot: { text, result },
    hasContent: Boolean(text) || Boolean(result),
    warnOnUnload: true,
    onRestore: (s) => {
      if (typeof s.text === 'string') setText(s.text);
      if (typeof s.result === 'string') setResult(s.result);
    },
  });

  const handleConvert = (type) => {
    setResult(convertCase(text, type));
    setCopied(false);
    setCopyError('');
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await copyToClipboard(result);
      setCopied(true);
      setCopyError('');
      toastSuccess('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError(clientErrorMessage(err) || 'Failed to copy. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 text-center">
        Case Converter
      </h1>
      <p className="text-slate-400 mb-6 sm:mb-10 text-sm sm:text-base text-center px-2">
        Convert your text to any case format
      </p>

      <div className="w-full max-w-3xl flex flex-col gap-4">
        <Card>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">Case converter</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-4">Paste your text below</p>

          <Textarea
            placeholder="Paste or type your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-5">
            {buttons.map((btn) => (
              <Button
                key={btn.type}
                variant="ghost"
                size="sm"
                onClick={() => handleConvert(btn.type)}
                disabled={!text}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </Card>

        {result && (
          <Card>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-slate-700">Result</p>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <Textarea value={result} rows={6} disabled />
            <Alert variant="error" message={copyError} show={!!copyError} className="mt-3" />
          </Card>
        )}

        {text && (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setText('');
                setResult('');
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
