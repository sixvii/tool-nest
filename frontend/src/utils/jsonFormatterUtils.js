export const validateJSON = (json) => {
  if (!json.trim()) {
    return { isValid: null, error: '' };
  }
  try {
    JSON.parse(json);
    return { isValid: true, error: '' };
  } catch (e) {
    return { isValid: false, error: e.message };
  }
};

export const processJSON = (json, type) => {
  const parsed = JSON.parse(json);
  return type === 'format' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
};
