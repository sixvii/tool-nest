export const TOOL_LAYOUT = {
  pageShell: 'flex flex-col items-center px-4 py-1 sm:py-1 lg:px-6',
  contentWidth: 'w-full max-w-6xl flex flex-col gap-4',
  workspace:
    'bg-slate-100 p-4 border border-slate-300 rounded-lg grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 lg:gap-6 items-start w-full',
  previewColumn: 'min-w-0 w-full',
  optionsColumn: 'min-w-0 w-full',

  previewPanel: 'flex flex-col w-full max-h-[min(60vh,820px)] w-auto object-contain gap-3',

  optionsPanel: 'flex flex-col w-full max-h-fit',

  previewCanvas: 'min-h-[55vh] max-h-fit',
  previewImage: 'max-w-full max-h-[50vh] w-auto h-auto object-contain',
  uploadArea: 'min-h-[50vh] max-h-fit flex flex-col justify-center',
};
