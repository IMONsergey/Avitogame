// Content and event settings. Keep this file separate from game mechanics.
export const CONFIG = Object.freeze({
  version: '1.4.2',
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
// Two tints are 20% brand blue/green over white (tonal UI variations).
// Color belongs to the front only and never indicates an error or a match.
export const PAIR_COLORS = Object.freeze([
  '#DFCDF3', '#BADAFB', '#FFFFFF', '#C9FFBF', '#CCEEFF',
  '#FEEADB', '#EBBFEB', '#CDF9DF', '#F7C1C5',
]);
export const PRODUCTS = Object.freeze([
  { id: 'headphones', label: 'Наушники' },
  { id: 'skates', label: 'Коньки' },
  { id: 'kettle', label: 'Чайник' },
  { id: 'sneaker', label: 'Кроссовок' },
  { id: 'phone', label: 'Телефон' },
  { id: 'backpack', label: 'Рюкзак' },
  { id: 'guitar', label: 'Гитара' },
  { id: 'lamp', label: 'Лампа' },
  { id: 'camera', label: 'Фотоаппарат' },
  { id: 'chair', label: 'Кресло', extension: 'webp' },
  { id: 'toaster', label: 'Тостер', extension: 'webp' },
  { id: 'gamepad', label: 'Геймпад', extension: 'webp' },
  { id: 'suitcase', label: 'Чемодан', extension: 'webp' },
  { id: 'bicycle', label: 'Велосипед', extension: 'webp' },
  { id: 'drill', label: 'Шуруповёрт', extension: 'webp' },
  { id: 'watch', label: 'Часы', extension: 'webp' },
  { id: 'ball', label: 'Мяч', extension: 'webp' },
  { id: 'plant', label: 'Растение', extension: 'webp' },
]);
