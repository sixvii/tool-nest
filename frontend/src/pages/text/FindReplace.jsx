import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

import Card from '../../components/ui/Card';
import Heading from '../../components/ui/Heading';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';

const FindReplace = ({ toolName = 'Find & Replace' }) => {
  const [inputText, setInputText] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [replaceCount, setReplaceCount] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  useToolPersistence({
    toolName,
    snapshot: {
      inputText,
      findText,
      replaceText,
      outputText,
      replaceCount,
      hasResult,
      caseSensitive,
    },
    hasContent: Boolean(inputText) || Boolean(outputText),
    warnOnUnload: true,
    onRestore: (s) => {
      if (typeof s.inputText === 'string') setInputText(s.inputText);
      if (typeof s.findText === 'string') setFindText(s.findText);
      if (typeof s.replaceText === 'string') setReplaceText(s.replaceText);
      if (typeof s.outputText === 'string') setOutputText(s.outputText);
      if (s.replaceCount != null) setReplaceCount(s.replaceCount);
      if (typeof s.hasResult === 'boolean') setHasResult(s.hasResult);
      if (typeof s.caseSensitive === 'boolean') setCaseSensitive(s.caseSensitive);
    },
  });

  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleReplaceAll = () => {
    setError('');
    setReplaceCount(null);

    if (!inputText.trim()) {
      setError('Please enter some text first.');
      return;
    }

    if (!findText.trim()) {
      setError('Please enter a word or phrase to find.');
      return;
    }

    const specialCharsSet = new Set([
      '.',
      '*',
      '+',
      '?',
      '^',
      '$',
      '{',
      '}',
      '(',
      ')',
      '|',
      '[',
      ']',
      '\\',
    ]);

    const escaped = findText
      .split('')
      .map((char) => (specialCharsSet.has(char) ? '\\' + char : char))
      .join('');

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escaped, flags);

    let count = 0;

    const result = inputText.replace(regex, () => {
      count++;
      return replaceText;
    });

    if (count === 0) {
      setError(`"${findText}" was not found in the text.`);
      setOutputText('');
      setHasResult(false);
      return;
    }

    setOutputText(result);
    setReplaceCount(count);
    setHasResult(true);
  };

  const handleCopy = async () => {
    if (outputText) {
      try {
        await copyToClipboard(outputText);
        setCopied(true);
        setError('');
        toastSuccess('Copied to clipboard!');

        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }

        copyTimeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        setError(clientErrorMessage(err) || 'Failed to copy. Please try again.');
      }
    }
  };

  const handleClear = () => {
    setInputText('');
    setFindText('');
    setReplaceText('');
    setOutputText('');
    setReplaceCount(null);
    setError('');
    setCopied(false);
    setHasResult(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col items-center px-4 py-12">
      <Heading as="h1" className="mb-2">
        Find & Replace
      </Heading>

      <p className="text-slate-400 text-sm mb-10">
        Find any word or phrase and replace it instantly
      </p>

      <div className="w-full max-w-3xl flex flex-col gap-5">
        <Card>
          <Textarea
            label="Your Text"
            placeholder="Paste or type your text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={7}
          />
        </Card>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Input
              label="Find"
              placeholder='e.g. "hello"'
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />

            <Input
              label="Replace With"
              placeholder='e.g. "hi"'
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span className="text-sm text-slate-700">Case Sensitive</span>
          </label>

          <div className="flex gap-3">
            <Button
              onClick={handleReplaceAll}
              size="md"
              disabled={!inputText.trim() || !findText.trim()}
            >
              Replace All
            </Button>

            <Button onClick={handleClear} variant="secondary" size="md">
              Clear
            </Button>
          </div>
        </Card>

        <Alert variant="error" message={error} show={!!error} />

        {hasResult && (
          <Card>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <Heading as="h4">Result</Heading>

                {replaceCount !== null && (
                  <Badge variant="success">
                    {replaceCount} replacement
                    {replaceCount === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>

              <Button variant={copied ? 'secondary' : 'primary'} size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <Textarea value={outputText} rows={7} disabled />
          </Card>
        )}
      </div>
    </div>
  );
};

export default FindReplace;
