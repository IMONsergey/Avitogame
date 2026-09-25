import { PRODUCTS } from './config.js';

export function randomIndex(limit) {
  // Rejection sampling avoids modulo bias.
  const cutoff = Math.floor(0x100000000 / limit) * limit;
  const word = new Uint32Array(1);
  do { crypto.getRandomValues(word); } while (word[0] >= cutoff);
  return word[0] % limit;
}

export function createDeck(pick = randomIndex) {
  const deck = PRODUCTS.flatMap(product => [0, 1].map(copy => ({
    id: `${product.id}-${copy}`, product: product.id, label: product.label,
  })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Pure rules: the view cannot open a third card or double-score a pair. */
export class Round {
  constructor(deck = createDeck(), now = () => performance.now()) {
    this.id = crypto.randomUUID();
    this.deck = deck;
    this.now = now;
    this.startedAt = now();
    this.endedAt = null;
    this.open = [];
    this.matched = new Set();
    this.locked = false;
    this.moves = 0;
  }
  get elapsed() { return Math.max(0, (this.endedAt ?? this.now()) - this.startedAt); }
  get complete() { return this.matched.size === this.deck.length; }
  choose(index) {
    if (!Number.isInteger(index) || !this.deck[index] || this.complete || this.locked || this.open.includes(index) || this.matched.has(index)) return 'ignored';
    this.open.push(index);
    if (this.open.length === 1) return 'first';
    this.moves++;
    this.locked = true;
    const [a, b] = this.open;
    if (this.deck[a].product !== this.deck[b].product) return 'mismatch';
    this.matched.add(a); this.matched.add(b);
    if (this.complete) this.endedAt = this.now();
    return this.complete ? 'complete' : 'match';
  }
  settle() { this.open = []; this.locked = false; }
}

export function normalizeName(value) {
  return value.normalize('NFC').replace(/[^\p{L}\p{M}\s’'\-]/gu, '').replace(/\s+/g, ' ').slice(0, 32);
}
export function validName(value) { return /^[\p{L}\p{M}]+(?:[ ’'\-][\p{L}\p{M}]+)*$/u.test(value.trim()) && value.trim().length <= 32; }
export function phoneDigits(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1);
  else if (value.startsWith('+7')) digits = digits.slice(1);
  return digits.slice(0, 10);
}
export function formatPhone(value) {
  const d = phoneDigits(value);
  if (!d) return '';
  return '+7 (' + d.slice(0, 3) + (d.length >= 3 ? ') ' : '') + d.slice(3, 6) + (d.length > 6 ? '-' + d.slice(6, 8) : '') + (d.length > 8 ? '-' + d.slice(8, 10) : '');
}
export function validPhone(value) { const d = phoneDigits(value); return /^[3489]\d{9}$/.test(d) && !/^(\d)\1{9}$/.test(d); }
export function formatTime(ms) {
  const sec = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
export function leaderboard(attempts, eventId, limit = 10) {
  const best = new Map();
  for (const result of attempts) {
    if (result.eventId !== eventId || !Number.isFinite(result.durationMs) || result.durationMs <= 0) continue;
    const prev = best.get(result.playerId);
    if (!prev || compareResults(result, prev) < 0) best.set(result.playerId, result);
  }
  return [...best.values()].sort(compareResults).slice(0, limit);
}
export function compareResults(a, b) { return a.durationMs - b.durationMs || a.finishedAt - b.finishedAt || a.id.localeCompare(b.id); }
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
