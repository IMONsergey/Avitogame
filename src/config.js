// Content and event settings. Keep this file separate from game mechanics.
export const CONFIG = Object.freeze({
  version: '1.5.0',
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
  { id: 'home-armchair', label: 'Кресло', extension: 'webp' },
  { id: 'home-sofa', label: 'Диван', extension: 'webp' },
  { id: 'home-nightstand', label: 'Тумба', extension: 'webp' },
  { id: 'home-side-table', label: 'Столик', extension: 'webp' },
  { id: 'home-mirror', label: 'Зеркало', extension: 'webp' },
  { id: 'home-vase', label: 'Ваза', extension: 'webp' },
  { id: 'home-plant', label: 'Растение', extension: 'webp' },
  { id: 'home-cushion', label: 'Подушка', extension: 'webp' },
  { id: 'home-blanket', label: 'Плед', extension: 'webp' },
  { id: 'home-basket', label: 'Корзина', extension: 'webp' },
  { id: 'home-rug', label: 'Ковёр', extension: 'webp' },
  { id: 'home-mug', label: 'Кружка', extension: 'webp' },
  { id: 'home-teapot', label: 'Чайник', extension: 'webp' },
  { id: 'home-casserole', label: 'Кастрюля', extension: 'webp' },
  { id: 'home-cutting-board', label: 'Доска', extension: 'webp' },
  { id: 'home-pitcher', label: 'Кувшин', extension: 'webp' },
  { id: 'home-candle', label: 'Свеча', extension: 'webp' },
  { id: 'home-wall-clock', label: 'Настенные часы', extension: 'webp' },
]);
