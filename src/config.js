// Content and event settings. Keep this file separate from game mechanics.
export const CONFIG = Object.freeze({
  version: '1.0.0',
  eventId: 'avito-pairs-2026',
  giftTimeMs: 45_000,
  giftLocation: 'на стенде М2',
  mismatchMs: 900,
  matchMs: 240,
  finishMs: 500,
  inactivityMs: 180_000,
  // Event-specific legal documents were not supplied in Figma.
  // Add approved HTTPS URLs here; do not substitute unrelated website terms.
  termsUrl: '',
  privacyUrl: '',
});

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
]);
