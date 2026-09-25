// Content and event settings. Keep this file separate from game mechanics.
export const CONFIG = Object.freeze({
  version: '1.3.1',
  eventId: 'avito-pairs-2026',
  giftTimeMs: 45_000,
  giftLocation: 'на стенде М2',
  mismatchMs: 900,
  matchMs: 240,
  finishMs: 1300,
  inactivityMs: 180_000,
  // Event-specific legal documents were not supplied in Figma.
  // Add approved HTTPS URLs here; do not substitute unrelated website terms.
  termsUrl: '',
  privacyUrl: '',
});

// Light pair colors: Goods Guides B2B / Sellers, palette node 16289:41062.
// Phone and lamp are 20% brand blue/green over white (tonal UI variations).
// Color belongs to the front only and never indicates an error or a match.
export const PRODUCTS = Object.freeze([
  { id: 'headphones', color: '#DFCDF3', label: 'Наушники' },
  { id: 'skates', color: '#BADAFB', label: 'Коньки' },
  { id: 'kettle', color: '#FFFFFF', label: 'Чайник' },
  { id: 'sneaker', color: '#C9FFBF', label: 'Кроссовок' },
  { id: 'phone', color: '#CCEEFF', label: 'Телефон' },
  { id: 'backpack', color: '#FEEADB', label: 'Рюкзак' },
  { id: 'guitar', color: '#EBBFEB', label: 'Гитара' },
  { id: 'lamp', color: '#CDF9DF', label: 'Лампа' },
  { id: 'camera', color: '#F7C1C5', label: 'Фотоаппарат' },
]);
