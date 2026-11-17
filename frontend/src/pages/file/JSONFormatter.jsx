import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Copy, Check, Trash2, AlignLeft, Minimize2 } from 'lucide-react';
import { validateJSON, processJSON } from '../../utils/jsonFormatterUtils';
import { toastSuccess } from '../../utils/toastUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';

const getTextareaBorderClass = (valid) => {
  if (valid === false) return 'border-red-400   focus:border-red-500   focus:ring-red-500/5';
  if (valid === true) return 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/5';
  return 'border-slate-200  focus:border-blue-500   focus:ring-blue-500/5';
};

const getActionButtonClass = (canProcessFlag, isActive) => {
  if (!canProcessFlag) return 'bg-slate-100 text-slate-400 cursor-not-allowed';
  if (isActive) return 'bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-600/10';
  return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10';
};

export default function JSONFormatter() {
  const [inputJSON, setInputJSON] = useState('');
  const [outputJSON, setOutputJSON] = useState('');
  const [isValid, setIsValid] = useState(null); // null | true | false
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [activeAction, setActiveAction] = useState(null); // 'format' | 'minify'

  useToolPersistence({
    snapshot: { inputJSON, outputJSON, activeAction },
    hasContent: Boolean(inputJSON) || Boolean(outputJSON),
    warnOnUnload: true,
    onRestore: (s) => {
      if (typeof s.inputJSON === 'string') {
        setInputJSON(s.inputJSON);
        const { isValid: valid, error: err } = validateJSON(s.inputJSON);
        setIsValid(valid);
        setError(err);
      }
      if (typeof s.outputJSON === 'string') setOutputJSON(s.outputJSON);
      if (s.activeAction) setActiveAction(s.activeAction);
    },
  });

  const handleInputChange = (e) => {
    const v = e.target.value;
    setInputJSON(v);
    const { isValid: valid, error: err } = validateJSON(v);
    setIsValid(valid);
    setError(err);
    setOutputJSON('');
    setActiveAction(null);
    setCopied(false);
  };

  const handleAction = (type) => {
    const { isValid: valid, error: err } = validateJSON(inputJSON);
    setIsValid(valid);
    setError(err);
    if (valid === false) return;
    try {
      setOutputJSON(processJSON(inputJSON, type));
      setActiveAction(type);
      setCopied(false);
      setCopyError('');
    } catch (e) {
      setIsValid(false);
      setError(e.message);
    }
  };

  // ── Copy to clipboard ────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!outputJSON) return;
    try {
      await copyToClipboard(outputJSON);
      setCopied(true);
      setCopyError('');
      toastSuccess('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError(clientErrorMessage(err) || 'Failed to copy. Please try again.');
    }
  };

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setInputJSON('');
    setOutputJSON('');
    setIsValid(null);
    setError('');
    setCopied(false);
    setCopyError('');
    setActiveAction(null);
  };

  const canProcess = inputJSON.trim() && isValid !== false;

  const textareaBorder = getTextareaBorderClass(isValid);

  return (
    <div className="flex justify-center items-center py-2 sm:py-4 px-3 sm:px-4">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-100 shadow-xl"
      >
        {/* ── Card header ── */}
        <div className="text-center mb-4 sm:mb-6">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 sm:px-3 py-1 rounded-full">
            Workspace Mode
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">JSON Formatter</h2>
        </div>

        {/* ── Input area ── */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col">
            <label
              htmlFor="json-formatter-input"
              className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase"
            >
              JSON Input
            </label>
            <textarea
              id="json-formatter-input"
              value={inputJSON}
              onChange={handleInputChange}
              placeholder={'{\n  "paste": "your JSON here..."\n}'}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className={`w-full min-h-[120px] sm:min-h-[160px] p-3 sm:p-4 rounded-2xl border-2
                focus:outline-none focus:ring-4 outline-none transition-all
                text-sm font-mono resize-y leading-relaxed bg-white text-slate-800
                ${textareaBorder}`}
            />
          </div>

          {/* Real-time validity indicator */}
          <div className="min-h-[22px] flex items-start gap-2 flex-wrap">
            <AnimatePresence mode="wait">
              {isValid === true && (
                <motion.span
                  key="valid"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"
                >
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  Valid JSON
                </motion.span>
              )}
              {isValid === false && (
                <motion.div
                  key="invalid"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex flex-col gap-1 w-full"
                >
                  <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full w-fit">
                    <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    Invalid JSON
                  </span>
                  <p className="text-[10px] sm:text-xs text-red-500 ml-1 font-mono break-all">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-5">
          <button
            onClick={() => handleAction('format')}
            disabled={!canProcess}
            className={`w-full py-3 sm:py-4 rounded-2xl font-bold tracking-wide transition-all text-sm sm:text-base flex items-center justify-center gap-2 ${getActionButtonClass(canProcess, activeAction === 'format')}`}
          >
            <AlignLeft className="w-4 h-4 flex-shrink-0" />
            Format
          </button>

          <button
            onClick={() => handleAction('minify')}
            disabled={!canProcess}
            className={`w-full py-3 sm:py-4 rounded-2xl font-bold tracking-wide transition-all text-sm sm:text-base flex items-center justify-center gap-2 ${getActionButtonClass(canProcess, activeAction === 'minify')}`}
          >
            <Minimize2 className="w-4 h-4 flex-shrink-0" />
            Minify
          </button>
        </div>

        {/* ── Output ── */}
        <AnimatePresence>
          {outputJSON && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 sm:mt-6 overflow-hidden border border-emerald-100 bg-emerald-50/20 rounded-2xl p-3 sm:p-5"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {activeAction === 'format' ? 'Formatted Output' : 'Minified Output'}
                  <span className="font-normal text-slate-400 ml-1">
                    · {outputJSON.split('\n').length} lines · {outputJSON.length.toLocaleString()}{' '}
                    chars
                  </span>
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopy}
                    className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-sm
                      flex items-center gap-1.5 flex-1 sm:flex-none justify-center transition-all
                      ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
                      }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Result
                      </>
                    )}
                  </button>
                </div>
              </div>

              {copyError && (
                <p className="text-[10px] sm:text-xs text-red-500 mb-2 ml-1 font-mono break-all">
                  {copyError}
                </p>
              )}

              <div className="bg-white border border-slate-100 rounded-xl p-2 sm:p-4 text-[9px] sm:text-xs font-mono text-slate-600 overflow-x-auto max-h-64 overflow-y-auto">
                <pre className="whitespace-pre leading-relaxed">{outputJSON}</pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Clear ── */}
        <div className="mt-4 sm:mt-6 flex justify-end">
          <button
            onClick={handleClear}
            disabled={!inputJSON && !outputJSON}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs sm:text-sm rounded-lg
              font-medium transition-all
              ${
                inputJSON || outputJSON
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </motion.div>
    </div>
  );
}
