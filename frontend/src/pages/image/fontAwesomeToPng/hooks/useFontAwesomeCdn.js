import { useEffect } from 'react';
import { FA_CDN } from '../../../../constants/image/fontAwesomeIcons';

export function useFontAwesomeCdn() {
  useEffect(() => {
    if (document.getElementById(FA_CDN.id)) return;

    const link = document.createElement('link');
    link.id = FA_CDN.id;
    link.rel = 'stylesheet';
    link.href = FA_CDN.url;
    document.head.appendChild(link);
  }, []);
}
