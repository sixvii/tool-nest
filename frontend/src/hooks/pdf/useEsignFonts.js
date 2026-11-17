import { useEffect } from 'react';
import { ESIGN_GOOGLE_FONTS } from '../../constants/pdf-constants/esignConstants';

function appendLink(id, href, rel, crossOrigin) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.appendChild(link);
}

export function useEsignFonts() {
  useEffect(() => {
    appendLink(ESIGN_GOOGLE_FONTS.preconnectId, 'https://fonts.googleapis.com', 'preconnect');
    appendLink(
      `${ESIGN_GOOGLE_FONTS.preconnectId}-gstatic`,
      'https://fonts.gstatic.com',
      'preconnect',
      'anonymous'
    );
    appendLink(ESIGN_GOOGLE_FONTS.stylesheetId, ESIGN_GOOGLE_FONTS.url, 'stylesheet');
  }, []);
}
