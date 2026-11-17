import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Upload, X, FileText } from 'lucide-react';

export default function FileUpload({
  label,
  accept,
  multiple = false,
  onFiles,
  error,
  className = '',
  value,
  icon: Icon = Upload,
  title = null,
  subtitle = null,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [internalFiles, setInternalFiles] = useState([]);
  const isControlled = value !== undefined;
  const files = isControlled ? value : internalFiles;

  const updateFiles = (next) => {
    if (!isControlled) setInternalFiles(next);
    onFiles?.(next);
  };

  const handleFiles = (incoming) => {
    const newList = Array.from(incoming);
    const merged = multiple ? [...files, ...newList] : newList;
    updateFiles(merged);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    updateFiles(updated);
  };

  const clear = () => {
    updateFiles([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <span className="text-xs font-bold text-slate-400 ml-1 uppercase">{label}</span>}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full p-6 sm:p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
          ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-slate-50/50'}
          ${error ? 'border-red-300 bg-red-50/30' : ''}
          ${files.length ? 'border-emerald-400 bg-emerald-50/20' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />
        <Icon className={`w-7 h-7 ${files.length ? 'text-emerald-500' : 'text-slate-400'}`} />
        {files.length === 0 ? (
          <>
            <p className="text-sm font-medium text-slate-600 text-center">
              {title ?? (
                <>
                  Drag & drop or <span className="text-blue-600 font-bold">browse</span>
                </>
              )}
            </p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            {!subtitle && accept && (
              <p className="text-xs text-slate-400">{accept.replace(/,/g, ', ')}</p>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-emerald-700">
            {files.length === 1 ? files[0].name : `${files.length} files selected`}
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
          {files.length > 1 && (
            <button
              onClick={clear}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors self-end"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
}

FileUpload.propTypes = {
  label: PropTypes.string,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  onFiles: PropTypes.func,
  error: PropTypes.string,
  className: PropTypes.string,
  value: PropTypes.arrayOf(PropTypes.object),
  icon: PropTypes.elementType,
  title: PropTypes.node,
  subtitle: PropTypes.node,
};
