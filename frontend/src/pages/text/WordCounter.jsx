import { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

import Card from '../../components/ui/Card';
import Heading from '../../components/ui/Heading';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { computeTextStats } from '../../utils/wordCounterUtils';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PropTypes from 'prop-types';

const WordCounter = ({ toolName = 'Word Counter' }) => {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const copyTimeoutRef = useRef(null);

  useToolPersistence({
    toolName,
    snapshot: { text },
    hasContent: Boolean(text.trim()),
    warnOnUnload: true,
    onRestore: (s) => {
      if (typeof s.text === 'string') setText(s.text);
    },
  });

  // Clean up timers on component unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Compute values efficiently on state changes
  const stats = useMemo(() => computeTextStats(text), [text]);

  const statCards = [
    { label: 'Words', value: stats.wordCount, color: 'text-indigo-600' },
    { label: 'Characters', value: stats.characters, color: 'text-emerald-600' },
    { label: 'Characters (no spaces)', value: stats.charactersNoSpaces, color: 'text-cyan-600' },
    { label: 'Sentences', value: stats.sentenceCount, color: 'text-amber-600' },
    { label: 'Paragraphs', value: stats.paragraphCount, color: 'text-rose-600' },
  ];

  const handleCopy = async () => {
    if (!text) return;
    try {
      await copyToClipboard(text);
      setCopied(true);
      setCopyError('');
      toastSuccess('Copied to clipboard!');

      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError(clientErrorMessage(err) || 'Failed to copy text.');
    }
  };

  const handleClear = () => {
    setText('');
    setCopied(false);
    setCopyError('');
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col items-center px-4 py-12">
      <Heading as="h1" className="mb-2">
        Word Counter
      </Heading>

      <p className="text-slate-400 text-sm mb-10 text-center">
        Analyze your text metrics live with real-time character, word, and structure counting
      </p>

      <div className="w-full max-w-3xl flex flex-col gap-5">
        {/* IMPROVEMENT: Stat Cards placed on top so they are never obscured by long text entries */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-slate-200 bg-white p-4 text-center flex flex-col justify-center items-center shadow-sm"
            >
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value.toLocaleString()}
              </div>
              <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Text Area Card with Integrated Copy Actions */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-700">Your Text</span>
            {text && (
              <div className="flex gap-2">
                <Button variant={copied ? 'secondary' : 'primary'} size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1 inline" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1 inline" />
                      Copy
                    </>
                  )}
                </Button>
                <Button onClick={handleClear} variant="secondary" size="sm">
                  Clear
                </Button>
              </div>
            )}
          </div>

          <Textarea
            placeholder="Paste or type your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
          />
        </Card>

        <Alert variant="error" message={copyError} show={!!copyError} />
      </div>
    </div>
  );
};

WordCounter.propTypes = {
  toolName: PropTypes.string,
};

export default WordCounter;
