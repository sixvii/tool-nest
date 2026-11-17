export const convertCase = (text, type) => {
  switch (type) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    case 'sentence':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    case 'camel':
      return text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
    case 'snake':
      return text.toLowerCase().trim().replace(/\s+/g, '_');
    case 'kebab':
      return text.toLowerCase().trim().replace(/\s+/g, '-');
    case 'alternate':
      return text
        .split('')
        .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
        .join('');
    default:
      return text;
  }
};
