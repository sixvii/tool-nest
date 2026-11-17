export const ESIGN_MODES = [
  { key: 'text', label: 'Type' },
  { key: 'draw', label: 'Draw' },
  { key: 'image', label: 'Image' },
  { key: 'certificate', label: 'Certificate' },
];

export const ESIGN_GOOGLE_FONTS = {
  stylesheetId: 'esign-google-fonts',
  preconnectId: 'esign-google-fonts-preconnect',
  url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Indie+Flower&family=Mrs+Saint+Delafield&family=Pacifico&family=Permanent+Marker&family=Pinyon+Script&family=Rock+Salt&family=Satisfy&display=swap',
};

// Matches backend google_fonts list in pdf_service.py
export const SIGNATURE_FONTS = [
  { key: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { key: 'pinyon-script', label: 'Pinyon Script', family: "'Pinyon Script', cursive" },
  {
    key: 'mrs-saint-delafield',
    label: 'Mrs Saint Delafield',
    family: "'Mrs Saint Delafield', cursive",
  },
  { key: 'dancing-script', label: 'Dancing Script', family: "'Dancing Script', cursive" },
  { key: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive" },
  { key: 'satisfy', label: 'Satisfy', family: "'Satisfy', cursive" },
  { key: 'caveat', label: 'Caveat', family: "'Caveat', cursive" },
  { key: 'indie-flower', label: 'Indie Flower', family: "'Indie Flower', cursive" },
  { key: 'permanent-marker', label: 'Permanent Marker', family: "'Permanent Marker', cursive" },
  { key: 'rock-salt', label: 'Rock Salt', family: "'Rock Salt', cursive" },
];
