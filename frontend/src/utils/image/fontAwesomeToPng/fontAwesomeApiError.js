function formatFastApiDetail(detail) {
  if (!detail) return null;
  return Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail;
}

function parseJsonErrorText(text, status) {
  let message = `Server error (${status})`;
  try {
    const json = JSON.parse(text);
    message = formatFastApiDetail(json.detail) || json.message || json.error || message;
  } catch {
    if (text) message = text;
  }
  return message;
}

async function normalizeFontAwesomeApiError(err, { timeoutMessage } = {}) {
  if (err.code === 'ECONNABORTED') {
    return timeoutMessage || 'Request timed out. Please try again.';
  }

  const { response } = err;
  if (!response) {
    return err.message || 'Cannot reach the server. Check your connection and try again.';
  }

  const { status, data } = response;

  if (data instanceof Blob) {
    const text = await data.text();
    return parseJsonErrorText(text, status);
  }

  return (
    formatFastApiDetail(data?.detail) || data?.message || data?.error || `Server error (${status})`
  );
}

/** Font Awesome to PNG only — not used by other image tools or services. */
export async function throwFontAwesomeApiError(err, options) {
  const message = await normalizeFontAwesomeApiError(err, options);
  throw new Error(message, { cause: err });
}
