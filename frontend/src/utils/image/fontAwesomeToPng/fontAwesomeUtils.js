import { FA_SIZE_LIMITS } from '../../../constants/image/fontAwesomeIcons';

export function filterFontAwesomeIcons(icons, search) {
  const q = search.trim().toLowerCase();
  if (!q) return icons;

  const normalizedUnicode = q.replace(/^\\u|^u\+|^0x/i, '');
  return icons.filter(
    (icon) =>
      icon.name.includes(q) ||
      icon.label.toLowerCase().includes(q) ||
      icon.unicode.includes(normalizedUnicode)
  );
}

export function getActiveUnicode(selectedIcon, customUnicode) {
  return customUnicode.trim() || selectedIcon?.unicode || '';
}

export function validateFontAwesomeExport({ activeUnicode, size }) {
  if (!activeUnicode) return 'Select an icon or enter a unicode value.';
  if (!size || size < FA_SIZE_LIMITS.min || size > FA_SIZE_LIMITS.max) {
    return `Size must be between ${FA_SIZE_LIMITS.min} and ${FA_SIZE_LIMITS.max} pixels.`;
  }
  return null;
}

export function buildFontAwesomeDownloadName(iconName, size) {
  const slug = iconName ?? 'icon';
  return `${slug}-${size}px.png`;
}
