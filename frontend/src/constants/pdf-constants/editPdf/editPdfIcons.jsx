export const EditPdfIcons = {
  Select: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M3 2l10 6-5 1-2 5L3 2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Text: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M3 4h10M8 4v9M5.5 13h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Shape: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <rect x="2" y="5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  Image: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="6.5" r="1" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M2 11l3-3 2.5 2.5L10 8l4 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Draw: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M2 13c2-2 3-5 5-5s2 3 4 3 2-1 2-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Rect: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Circle: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Line: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Bold: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M4 3h5a3 3 0 010 6H4V3zM4 9h5.5a3.5 3.5 0 010 7H4V9z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Italic: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M6 3h6M4 13h6M9 3L7 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Under: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M4 3v5a4 4 0 008 0V3M2 14h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  AlignL: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M2 4h12M2 8h8M2 12h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  AlignC: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M2 4h12M4 8h8M3 12h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  AlignR: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M2 4h12M6 8h8M4 12h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path
        d="M3 5h10M6 5V3h4v2M6 8v5M10 8v5M4 5l1 8h6l1-8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export const TOOLS = [
  { key: 'select', label: 'Select / Move', Icon: EditPdfIcons.Select },
  { key: 'text', label: 'Add Text', Icon: EditPdfIcons.Text },
  { key: 'shape', label: 'Shape', Icon: EditPdfIcons.Shape },
  { key: 'image', label: 'Image', Icon: EditPdfIcons.Image },
  { key: 'draw', label: 'Draw', Icon: EditPdfIcons.Draw },
];

export const SHAPE_ICONS = {
  rect: EditPdfIcons.Rect,
  circle: EditPdfIcons.Circle,
  line: EditPdfIcons.Line,
};

export const ALIGN_ICONS = {
  left: EditPdfIcons.AlignL,
  center: EditPdfIcons.AlignC,
  right: EditPdfIcons.AlignR,
};
