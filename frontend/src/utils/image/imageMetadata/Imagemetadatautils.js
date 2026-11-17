import {
  SENSITIVE_KEY_GROUPS,
  TECHNICAL_KEYS,
} from '../../../constants/image/imageMetadataConstants/imageMetadataConstants';

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Bytes (${bytes} bytes)`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB (${bytes} bytes)`;
}

export function formatLabel(key) {
  const tag = key.includes(':') ? key.split(':')[1] : key;
  let result = '';

  for (let i = 0; i < tag.length; i += 1) {
    const char = tag[i];
    const prevChar = tag[i - 1];
    const nextChar = tag[i + 1];
    const isUpper = char >= 'A' && char <= 'Z';

    if (i > 0 && isUpper) {
      const prevIsLowerOrDigit =
        (prevChar >= 'a' && prevChar <= 'z') || (prevChar >= '0' && prevChar <= '9');
      const prevIsUpper = prevChar >= 'A' && prevChar <= 'Z';
      const nextIsLower = nextChar >= 'a' && nextChar <= 'z';

      if (prevIsLowerOrDigit || (prevIsUpper && nextIsLower)) {
        result += ' ';
      }
    }

    result += char;
  }

  return result.trim();
}

export function classifyEntries(metadata) {
  const entries = Object.entries(metadata).filter(([, v]) => typeof v !== 'object');
  const groups = { EXIF: [], IPTC: [], XMP: [], 'ICC Profile': [], JFIF: [] };
  const technical = [];
  const other = [];

  entries.forEach(([key, value]) => {
    const tag = key.includes(':') ? key.split(':')[1] : key;
    const group = SENSITIVE_KEY_GROUPS[tag.toLowerCase()];
    if (group) {
      groups[group].push({ key, label: formatLabel(key), value });
    } else if (TECHNICAL_KEYS.some((k) => tag.toLowerCase() === k.toLowerCase())) {
      technical.push({ key, label: formatLabel(key), value });
    } else {
      other.push({ key, label: formatLabel(key), value });
    }
  });

  const sensitiveCount = Object.values(groups).reduce((sum, g) => sum + g.length, 0);
  return { groups, technical, other, sensitiveCount };
}
