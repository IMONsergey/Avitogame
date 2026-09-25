import { CONFIG } from './config.js';
import { phoneDigits } from './engine.js';

let database;
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('avito-pairs', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('players', { keyPath: 'id' });
      const attempts = db.createObjectStore('attempts', { keyPath: 'id' });
      attempts.createIndex('eventId', 'eventId');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Закройте другие вкладки игры и обновите страницу.'));
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}
function transaction(stores, mode, action) {
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = database.transaction(stores, mode); action(tx); }
    catch (error) { reject(error); return; }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Не удалось сохранить данные.'));
  });
}
export async function registerPlayer(form) {
  const phone = '7' + phoneDigits(form.phone);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CONFIG.eventId + ':' + phone));
  const id = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  const player = { id, firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone, registeredAt: Date.now(), eventId: CONFIG.eventId };
  await transaction(['players'], 'readwrite', tx => tx.objectStore('players').put(player));
  return player;
}
export async function saveAttempt(player, round) {
  const result = {
    id: round.id, eventId: CONFIG.eventId, playerId: player.id,
    firstName: player.firstName, lastName: player.lastName,
    durationMs: Math.max(1, Math.round(round.elapsed)), moves: round.moves,
    finishedAt: Date.now(), giftEligible: round.elapsed <= CONFIG.giftTimeMs,
  };
  // Round id is the primary key: repeat save cannot create a second score.
  await transaction(['attempts'], 'readwrite', tx => tx.objectStore('attempts').put(result));
  return result;
}
export function readStore(name) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(name, 'readonly');
    const request = tx.objectStore(name).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function allData() { const [players, attempts] = await Promise.all([readStore('players'), readStore('attempts')]); return { schemaVersion: 1, exportedAt: new Date().toISOString(), eventId: CONFIG.eventId, players, attempts }; }
