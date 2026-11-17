import { LayoutGrid, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter } from 'lucide-react';

export const COLLAGE_LAYOUTS = [
  { label: 'Grid', value: 'grid', icon: 'LayoutGrid', desc: 'Arrange in a grid' },
  {
    label: 'Horizontal',
    value: 'horizontal',
    icon: 'AlignHorizontalJustifyCenter',
    desc: 'Side by side',
  },
  {
    label: 'Vertical',
    value: 'vertical',
    icon: 'AlignVerticalJustifyCenter',
    desc: 'Stacked in a column',
  },
];

export const ICON_MAP = {
  LayoutGrid,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
};
