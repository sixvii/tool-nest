export async function parseBackendError(axiosError) {
  if (!axiosError.response) {
    return 'Cannot reach the server right now. It may be down, or check your connection and try again.';
  }
  const { status, data } = axiosError.response;

  const pick = (o) => {
    const d = o?.detail;

    if (Array.isArray(d)) {
      return d.map((e) => e?.msg || JSON.stringify(e)).join('; ');
    }
    const candidate = d ?? o?.message ?? o?.error;

    return typeof candidate === 'string' ? candidate : null;
  };

  let raw;
  if (data instanceof Blob) {
    try {
      raw = pick(JSON.parse(await data.text()));
    } catch {
      raw = null;
    }
  } else {
    raw = pick(data);
  }

  if (status >= 500) {
    console.error('[API 5xx]', status, raw);
    return 'Something went wrong on our end. Please try again.';
  }
  return raw || `Request failed (${status})`;
}

export function clientErrorMessage(err) {
  return err?.isAxiosError || err?.isTaskFailure ? null : err?.message || 'Something went wrong.';
}
