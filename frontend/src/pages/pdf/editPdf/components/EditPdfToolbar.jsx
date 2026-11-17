import PropTypes from 'prop-types';
import {
  FONT_SIZES,
  FONT_FAMILIES,
  TEXT_ALIGNS,
  SHAPE_TYPES,
} from '../../../../constants/pdf-constants/editPdf/editPdfConstants';
import { TOOL_HINTS } from '../../../../constants/pdf-constants/editPdf/editorUiConstants';
import {
  TOOLS,
  SHAPE_ICONS,
  ALIGN_ICONS,
  EditPdfIcons,
} from '../../../../constants/pdf-constants/editPdf/editPdfIcons';

export default function EditPdfToolbar({
  activeTool,
  setActiveTool,
  toolOpts,
  setToolOpts,
  sel,
  onUpdate,
  onDelete,
}) {
  const isText = activeTool === 'text' || sel?.type === 'text';
  const isShape = activeTool === 'shape' || sel?.type === 'shape';
  const opt = (k, v) => {
    setToolOpts((p) => ({ ...p, [k]: v }));
    if (sel) onUpdate({ [k]: v });
  };
  const tog = (k) => opt(k, !(sel?.[k] ?? toolOpts[k]));

  return (
    <div className="flex flex-wrap items-center gap-1 bg-white border-b border-slate-200 px-3 py-2 rounded-t-2xl min-h-[48px]">
      {TOOLS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTool(key)}
          title={label}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all
            ${activeTool === key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
        >
          <Icon />
        </button>
      ))}

      {(isText || isShape || sel) && <div className="w-px h-6 bg-slate-200 mx-1" />}

      {isText && (
        <>
          <select
            value={sel?.fontFamily ?? toolOpts.fontFamily}
            onChange={(e) => opt('fontFamily', e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 h-8 max-w-[100px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={sel?.fontSize ?? toolOpts.fontSize}
            onChange={(e) => opt('fontSize', Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg px-2 h-8 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          {[
            { k: 'bold', Icon: EditPdfIcons.Bold },
            { k: 'italic', Icon: EditPdfIcons.Italic },
            { k: 'underline', Icon: EditPdfIcons.Under },
          ].map(({ k, Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => tog(k)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all
              ${(sel?.[k] ?? toolOpts[k]) ? 'bg-blue-100 border-blue-400 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
            >
              <Icon />
            </button>
          ))}
          <input
            type="color"
            value={sel?.color ?? toolOpts.color}
            onChange={(e) => opt('color', e.target.value)}
            className="h-8 w-9 cursor-pointer rounded border border-slate-200"
            title="Text color"
          />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          {TEXT_ALIGNS.map((a) => {
            const Icon = ALIGN_ICONS[a];
            return (
              <button
                key={a}
                type="button"
                onClick={() => opt('align', a)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all
              ${(sel?.align ?? toolOpts.align) === a ? 'bg-blue-100 border-blue-400 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
              >
                <Icon />
              </button>
            );
          })}
        </>
      )}

      {isShape && (
        <>
          {SHAPE_TYPES.map((s) => {
            const Icon = SHAPE_ICONS[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => opt('shapeType', s.key)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all
              ${(sel?.shapeType ?? toolOpts.shapeType) === s.key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
              >
                <Icon />
              </button>
            );
          })}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Stroke</span>
            <input
              type="color"
              value={sel?.color ?? toolOpts.color}
              onChange={(e) => opt('color', e.target.value)}
              className="h-8 w-9 cursor-pointer rounded border border-slate-200"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Fill</span>
            <input
              type="color"
              value={
                !sel?.fillColor || sel?.fillColor === 'transparent' ? '#ffffff' : sel.fillColor
              }
              onChange={(e) => opt('fillColor', e.target.value)}
              className="h-8 w-9 cursor-pointer rounded border border-slate-200"
            />
            <button
              type="button"
              onClick={() => opt('fillColor', 'transparent')}
              className="text-[10px] text-slate-400 hover:text-slate-600 border border-slate-200 rounded px-1.5 h-8"
            >
              None
            </button>
          </div>
        </>
      )}

      {activeTool === 'draw' && (
        <input
          type="color"
          value={toolOpts.color}
          onChange={(e) => opt('color', e.target.value)}
          className="h-8 w-9 cursor-pointer rounded border border-slate-200"
          title="Draw color"
        />
      )}

      {sel && (
        <>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-rose-200 text-rose-400 hover:bg-rose-50 transition-colors"
          >
            <EditPdfIcons.Trash />
          </button>
        </>
      )}

      {activeTool !== 'select' && (
        <span className="ml-auto text-[10px] text-blue-500 font-medium animate-pulse">
          {TOOL_HINTS[activeTool]}
        </span>
      )}
    </div>
  );
}

EditPdfToolbar.propTypes = {
  activeTool: PropTypes.string.isRequired,
  setActiveTool: PropTypes.func.isRequired,
  toolOpts: PropTypes.object.isRequired,
  setToolOpts: PropTypes.func.isRequired,
  sel: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
