import { CONFIG, PRODUCTS } from './config.js';
import { Round, createDeck, normalizeName, validName, phoneDigits, formatPhone, validPhone, formatTime, leaderboard, csvCell } from './engine.js';
import { openDatabase, registerPlayer, saveAttempt, readStore, allData } from './storage.js';

const stage = document.querySelector('#stage');
const announce = document.querySelector('#announce');
const operatorMode = new URLSearchParams(location.search).get('operator') === '1';
let screen = 'start', player = null, round = null, activeInput = null, language = 'RU';
let animationFrame = 0, generation = 0, busy = false, modalClose = null, lastActivity = Date.now();
const timeouts = new Set();
const form = { firstName: '', lastName: '', phone: '' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const image = (name, cls = '', alt = '') => `<img class="${cls}" src="./assets/${name}" alt="${esc(alt)}" draggable="false">`;
const button = (label, action, classes = '', icon = 'arrow', disabled = false) => `<button type="button" class="action ${classes}" data-action="${action}" ${disabled ? 'disabled' : ''}><span>${label}</span>${icon ? `<span class="action-disc">${image(icon + '.svg')}</span>` : ''}</button>`;
const closeButton = () => `<button class="close" data-action="close" aria-label="Закрыть">${image('close.svg')}</button>`;
function later(callback, ms) { const current = generation; const id = setTimeout(() => { timeouts.delete(id); if (current === generation) callback(); }, ms); timeouts.add(id); }
function cancelPending() { generation++; for (const id of timeouts) clearTimeout(id); timeouts.clear(); cancelAnimationFrame(animationFrame); }
function say(message) { announce.textContent = message; }
function resize() { stage.style.setProperty('--scale', Math.min(innerWidth / 1920, innerHeight / 1080)); }
addEventListener('resize', resize); resize();

function backFace(hero = false) {
  return `<span class="card-back"><span class="card-surface">${image(hero ? 'hero-rim.svg' : 'card-rim.svg', 'card-rim')}${image(hero ? 'hero-face.svg' : 'card-face.svg', 'card-token')}<span class="question">?</span></span></span>`;
}
function frontFace(product, hero = false) {
  return `<span class="card-front"><span class="card-surface">${image(hero ? 'hero-stage.svg' : 'card-stage.svg', 'product-stage')}${image('products/' + product + '.png', 'product')}</span></span>`;
}
function homeMarkup() {
  return `<section class="screen start-screen" aria-label="Найди пару">
    ${image('logo.svg', 'brand', 'Авито')}
    <div class="start-grid"><div class="start-left"><div class="title-tile"><h1>Найди<br>пару</h1><span class="underline"></span></div>
      ${button('Начать игру', 'rules', 'start-action', 'play')}${button('Рейтинг', 'rank', 'quiet', '')}</div>
      <div class="hero-art" aria-hidden="true"><div class="hero-hidden"><div class="card static">${backFace(true)}</div></div><div class="hero-revealed"><div class="card static matched flipped">${frontFace('headphones', true)}</div></div></div>
    </div></section>`;
}
function showHome() {
  cancelPending(); player = null; round = null; busy = false; activeInput = null;
  Object.assign(form, { firstName: '', lastName: '', phone: '' });
  screen = 'start'; stage.innerHTML = homeMarkup(); modalClose = null; lastActivity = Date.now();
}
function showRules() {
  cancelPending(); screen = 'rules';
  stage.innerHTML = `<section class="screen" aria-labelledby="rules-title"><h1 id="rules-title" class="screen-title">Вы в игре «Найди пару»</h1>
  <ol class="rules-grid"><li><span class="rule-number">1</span><p>Зарегистрируйтесь<br>в игре</p></li><li><span class="rule-number">2</span><p>Переворачивайте карточки<br>и находите пары</p></li><li><span class="rule-number">3</span><p>Уложитесь в 45 секунд<br>и получите подарок</p></li><li><span class="rule-number">4</span><p>Попадите в топ-10,<br>чтобы стать обладателем<br>суперприза</p></li></ol>
  <p class="rules-footer">Количество попыток не ограничено<br>Удачи!</p>${button('Далее', 'register', 'rules-next')}</section>`;
}
function field(key, label) {
  return `<label class="field ${form[key] ? 'filled' : ''}"><span>${label}</span><input aria-label="${label}" name="${key}" id="${key}" type="text" inputmode="none" autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="${key === 'phone' ? 24 : 32}" value="${esc(form[key])}" placeholder=" "></label>`;
}
function showRegister() {
  cancelPending(); screen = 'register'; activeInput = null; busy = false;
  stage.innerHTML = `<section class="screen" aria-labelledby="form-title"><h1 class="screen-title" id="form-title">Давайте познакомимся</h1>
  <form id="registration" novalidate><div class="form-panel">${field('firstName', 'Имя')}${field('lastName', 'Фамилия')}${field('phone', 'Телефон')}</div>
  ${button('Далее', 'submit', 'form-next', 'arrow', true)}<div class="form-error" role="alert"></div></form>
  <div class="consent"><p>Оставляя личную информацию,<br>вы соглашаетесь с</p><button data-action="terms">Условиями использования</button><button data-action="privacy">и с Политикой обработки персональных данных</button></div>
  <div id="keyboard"></div></section>`;
  document.querySelector('#registration').addEventListener('submit', e => { e.preventDefault(); submitRegistration(); });
  for (const input of document.querySelectorAll('.field input')) {
    input.addEventListener('focus', () => { activeInput = input; input.closest('.field').classList.add('focused'); document.querySelector('.consent').hidden = true; renderKeyboard(); });
    input.addEventListener('blur', () => input.closest('.field').classList.remove('focused'));
    input.addEventListener('input', () => {
      const caret = input.selectionStart;
      const clean = input.name === 'phone' ? formatPhone(input.value) : normalizeName(input.value);
      const changed = clean !== input.value;
      input.value = clean;
      if (changed && input.name !== 'phone') input.setSelectionRange(Math.min(caret, clean.length), Math.min(caret, clean.length));
      form[input.name] = clean; updateForm();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); keyboardNext(); } if (e.key === 'Escape') hideKeyboard(); });
  }
  updateForm();
}
function updateForm() {
  for (const input of document.querySelectorAll('.field input')) input.closest('.field').classList.toggle('filled', !!input.value);
  const valid = validName(form.firstName) && validName(form.lastName) && validPhone(form.phone);
  document.querySelector('[data-action="submit"]').disabled = !valid || busy;
  const err = document.querySelector('.form-error');
  if (err) err.textContent = '';
}
function hideKeyboard() {
  activeInput?.blur(); activeInput = null;
  document.querySelector('#keyboard')?.replaceChildren();
  const consent = document.querySelector('.consent'); if (consent) consent.hidden = false;
}
function renderKeyboard() {
  if (!activeInput) return;
  const numeric = activeInput.name === 'phone';
  const ru = ['Й Ц У К Е Н Г Ш Щ З Х Ъ', 'Ё Ф Ы В А П Р О Л Д Ж Э', 'Я Ч С М И Т Ь Б Ю'];
  const en = ['Q W E R T Y U I O P', 'A S D F G H J K L', 'Z X C V B N M'];
  const key = (value, label = value, cls = '') => `<button type="button" class="key ${cls}" data-key="${esc(value)}" aria-label="${esc(value === 'back' ? 'Удалить символ' : label)}">${label}</button>`;
  let html;
  if (numeric) {
    html = `<div class="numeric-keys">${[1,2,3,4,5,6,7,8,9].map(n => key(String(n))).join('')}${key('back', '⌫')}${key('0')}${key('next', 'Готово', 'key-action')}</div>`;
  } else {
    const rows = (language === 'RU' ? ru : en).map(s => s.split(' '));
    html = `<div class="keyboard-row">${rows[0].map(c => key(c)).join('')}${key('back', '⌫', 'wide')}</div><div class="keyboard-row">${rows[1].map(c => key(c)).join('')}${key('-')}${key("'", '’')}</div><div class="keyboard-row">${key('language', language === 'RU' ? 'EN' : 'RU')}${key('space', 'Пробел', 'space')}${rows[2].map(c => key(c)).join('')}${key('next', 'Далее', 'key-action wide')}</div>`;
  }
  document.querySelector('#keyboard').innerHTML = `<div class="keyboard ${numeric ? 'numeric' : ''}" aria-label="Экранная клавиатура">${html}</div>`;
}
function keyboardNext() {
  if (!activeInput) return;
  const key = activeInput.name;
  if (key !== 'phone') document.querySelector(key === 'firstName' ? '#lastName' : '#phone').focus();
  else { hideKeyboard(); if (!validPhone(form.phone)) document.querySelector('.form-error').textContent = 'Проверьте номер телефона'; }
}
function typeKey(key) {
  if (!activeInput || !activeInput.isConnected) return;
  if (key === 'language') { language = language === 'RU' ? 'EN' : 'RU'; renderKeyboard(); return; }
  if (key === 'next') { keyboardNext(); return; }
  const input = activeInput;
  let start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
  let text = input.value;
  if (input.name === 'phone') {
    const selectedStart = phoneDigits(text.slice(0, start)).length;
    const selectedEnd = phoneDigits(text.slice(0, end)).length;
    const digits = phoneDigits(text);
    if (key === 'back') text = digits.slice(0, Math.max(0, selectedStart - (start === end ? 1 : 0))) + digits.slice(selectedEnd);
    else text = digits.slice(0, selectedStart) + key + digits.slice(selectedEnd);
    input.value = formatPhone(text);
    input.setSelectionRange(input.value.length, input.value.length);
  } else {
    if (key === 'back') { if (start === end) start = Math.max(0, start - 1); text = text.slice(0, start) + text.slice(end); }
    else { const character = key === 'space' ? ' ' : (start === 0 || /[ \-]/.test(text[start - 1]) ? key : key.toLowerCase()); text = text.slice(0, start) + character + text.slice(end); start += character.length; }
    input.value = normalizeName(text); input.setSelectionRange(start, start);
  }
  form[input.name] = input.value; updateForm();
}
async function submitRegistration() {
  if (busy || !validName(form.firstName) || !validName(form.lastName) || !validPhone(form.phone)) return;
  busy = true; hideKeyboard(); updateForm(); const current = generation;
  try {
    const registered = await registerPlayer(form);
    if (current !== generation) return;
    player = registered; startRound();
  } catch { if (current === generation) { busy = false; updateForm(); document.querySelector('.form-error').textContent = 'Не удалось сохранить данные. Проверьте доступ к хранилищу браузера и повторите.'; } }
}

function startRound() {
  if (!player) { showRegister(); return; }
  cancelPending(); screen = 'game'; busy = false; activeInput = null;
  const previous = round?.deck.map(c => c.id).join(',');
  let deck = createDeck();
  if (deck.map(c => c.id).join(',') === previous) deck.push(deck.shift());
  round = new Round(deck);
  stage.innerHTML = `<section class="screen game-screen" aria-labelledby="game-title"><h1 id="game-title" class="game-title">Найдите пару одинаковых картинок<br>за максимально короткое время</h1>
  <div class="time-tile"><span>Время</span><output id="timer" aria-label="Время игры">0:00</output></div>
  <div class="board" aria-label="Игровое поле, 18 карточек">${round.deck.map((c, i) => `<button class="card" data-card="${i}" aria-label="Карточка ${i + 1}, закрыта" aria-pressed="false"><span class="card-inner">${backFace()}${frontFace(c.product)}</span></button>`).join('')}</div>
  <button class="restart" data-action="restart">${image('restart.svg')}<span>Рестарт</span></button></section>`;
  function tick() { const timer = document.querySelector('#timer'); if (timer && round) timer.textContent = formatTime(round.elapsed); if (!round?.complete && screen === 'game') animationFrame = requestAnimationFrame(tick); }
  tick(); say('Игра началась. Найдите девять пар.');
}
function updateCards(result) {
  document.querySelectorAll('[data-card]').forEach((node, i) => {
    const open = round.open.includes(i), matched = round.matched.has(i), revealed = open || matched;
    node.classList.toggle('flipped', revealed);
    node.classList.toggle('matched', matched);
    node.classList.toggle('mismatch', open && result === 'mismatch');
    node.classList.toggle('pulse', matched && open && (result === 'match' || result === 'complete'));
    node.setAttribute('aria-pressed', String(revealed));
    node.setAttribute('aria-label', `Карточка ${i + 1}, ${revealed ? round.deck[i].label + (matched ? ', пара найдена' : '') : 'закрыта'}`);
    node.setAttribute('aria-disabled', String(matched || round.locked));
  });
}
function chooseCard(index) {
  if (screen !== 'game' || !round || modalClose) return;
  const result = round.choose(index);
  if (result === 'ignored') return;
  updateCards(result);
  if (result === 'first') return;
  if (result === 'mismatch') {
    say('Карточки не совпали'); later(() => { round.settle(); updateCards(); }, CONFIG.mismatchMs);
  } else if (result === 'match') {
    say(`Пара найдена. Найдено ${round.matched.size / 2} из 9.`); later(() => { round.settle(); updateCards(); }, CONFIG.matchMs);
  } else {
    cancelAnimationFrame(animationFrame); document.querySelector('#timer').textContent = formatTime(round.elapsed);
    say('Вы прошли игру!'); finishRound();
  }
}
async function finishRound() {
  const current = generation, finishedRound = round;
  try {
    await saveAttempt(player, finishedRound);
    const rows = leaderboard(await readStore('attempts'), CONFIG.eventId, 3);
    if (current !== generation) return;
    later(() => showResult(rows), CONFIG.finishMs);
  } catch {
    if (current !== generation) return;
    showDialog('Результат не сохранён', `<p>Ваше время: ${formatTime(finishedRound.elapsed)}. Не закрывайте игру. Повторите сохранение.</p>${button('Повторить', 'retry-save')}`, () => {});
  }
}
function tableRows(rows, compact = false) {
  if (!rows.length) return `<p class="empty-rank">Пока нет результатов.<br>Сыграйте первым!</p>`;
  return rows.map((r, i) => `<div class="ranking-row ${r.playerId === player?.id ? 'current' : ''} ${compact ? 'compact' : ''}" role="row"><span role="cell">${i + 1}</span><span class="player-name" role="cell">${esc(r.lastName)} ${esc(r.firstName)}</span><strong role="cell">${formatTime(r.durationMs)}</strong></div>`).join('');
}
function openModal(markup, onClose) {
  document.querySelector('.overlay')?.remove();
  const base = stage.querySelector('.screen'); if (base) { base.inert = true; base.setAttribute('aria-hidden', 'true'); }
  stage.insertAdjacentHTML('beforeend', `<div class="overlay">${markup}</div>`);
  modalClose = onClose;
  const focus = stage.querySelector('.overlay button'); focus?.focus({ preventScroll: true });
}
function removeModal() {
  stage.querySelector('.overlay')?.remove();
  const base = stage.querySelector('.screen'); if (base) { base.inert = false; base.removeAttribute('aria-hidden'); }
  modalClose = null;
}
function closeModal() { const callback = modalClose; removeModal(); callback?.(); }
function showResult(rows) {
  const eligible = round.elapsed <= CONFIG.giftTimeMs;
  openModal(`<section class="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="result-top"><div class="result-time"><p>Ваше время</p><strong>${formatTime(round.elapsed)}</strong></div><div class="result-gift"><h2 id="result-title">Вы прошли<br>игру!</h2><p>${eligible ? `Ваш подарок уже ждёт вас<br>${esc(CONFIG.giftLocation)}` : 'Попробуйте ещё раз<br>и уложитесь в 45 секунд'}</p>${closeButton()}</div></div><div class="top-three"><h2>Топ-3<br>игроков</h2><div class="compact-table" role="table" aria-label="Топ-3 игроков"><div class="ranking-head"><span>Имя</span><span>Время</span></div>${tableRows(rows, true)}</div></div><div class="result-actions">${button('На главную', 'home', 'quiet solid', '')}${button('Рестарт', 'restart', '', 'restart-large')}</div></section>`, showHome);
}
async function showRank() {
  const current = generation;
  try {
    const rows = leaderboard(await readStore('attempts'), CONFIG.eventId);
    if (current !== generation) return;
    openModal(`<section class="rank-modal" role="dialog" aria-modal="true" aria-labelledby="rank-title"><div class="rank-panel"><h2 id="rank-title">Статистика</h2><p class="rank-subtitle">Самые быстрые</p>${closeButton()}<div class="rank-table" role="table" aria-label="Рейтинг игроков"><div class="ranking-head"><span>Имя</span><span>Время</span></div><div class="ranking-scroll" tabindex="0">${tableRows(rows)}</div></div></div>${button('Начать игру', 'rules', '', 'arrow-large')}</section>`, () => document.querySelector('[data-action="rank"]')?.focus());
  } catch { showDialog('Не удалось открыть рейтинг', '<p>Обновите страницу и попробуйте ещё раз.</p>'); }
}
function showDialog(title, body, onClose = () => {}) {
  openModal(`<section class="message-modal" role="dialog" aria-modal="true" aria-labelledby="message-title"><h2 id="message-title">${esc(title)}</h2>${closeButton()}<div class="message-body">${body}</div></section>`, onClose);
}
function showLegal(which) {
  hideKeyboard();
  const url = which === 'terms' ? CONFIG.termsUrl : CONFIG.privacyUrl;
  if (url && /^https:\/\//.test(url)) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
  showDialog('Документ недоступен', '<p>Документ мероприятия пока не добавлен.<br>Обратитесь к организатору.</p>');
}

stage.addEventListener('pointerdown', e => {
  lastActivity = Date.now();
  if (e.target.closest('[data-key]')) e.preventDefault();
});
stage.addEventListener('click', e => {
  const key = e.target.closest('[data-key]'); if (key) { typeKey(key.dataset.key); return; }
  const card = e.target.closest('[data-card]'); if (card) { chooseCard(Number(card.dataset.card)); return; }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) { if (screen === 'register' && !e.target.closest('.field, .keyboard, .overlay')) hideKeyboard(); return; }
  if (action === 'close') { closeModal(); return; }
  if (action === 'rules') { removeModal(); showRules(); }
  else if (action === 'home') { removeModal(); showHome(); }
  else if (action === 'register') showRegister();
  else if (action === 'submit') submitRegistration();
  else if (action === 'rank') showRank();
  else if (action === 'restart') { removeModal(); startRound(); }
  else if (action === 'terms' || action === 'privacy') showLegal(action);
  else if (action === 'retry-save') { removeModal(); finishRound(); }
  else if (action === 'reload') location.reload();
  else if (action === 'operator-refresh') showOperator();
  else if (action === 'export-csv') exportData('csv');
  else if (action === 'export-json') exportData('json');
  else if (action === 'fullscreen') document.documentElement.requestFullscreen?.();
});
document.addEventListener('keydown', e => {
  lastActivity = Date.now();
  if (e.key === 'Escape' && modalClose) { e.preventDefault(); closeModal(); }
  if (e.key === 'Tab' && modalClose) {
    const focusable = [...document.querySelectorAll('.overlay button:not(:disabled), .overlay [tabindex="0"]')];
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }
});
setInterval(() => { if (!operatorMode && screen !== 'start' && !busy && Date.now() - lastActivity > CONFIG.inactivityMs) { removeModal(); showHome(); } }, 1000);

async function showOperator() {
  cancelPending(); screen = 'operator'; const data = await allData();
  stage.innerHTML = `<section class="screen operator"><h1>Пульт организатора</h1><p>Данные этого браузера · ${esc(CONFIG.eventId)}</p><div class="operator-stats"><div>Участники<strong>${data.players.filter(p => p.eventId === CONFIG.eventId).length}</strong></div><div>Попытки<strong>${data.attempts.filter(p => p.eventId === CONFIG.eventId).length}</strong></div></div><div class="operator-buttons">${button('Скачать CSV', 'export-csv')}${button('Резервная копия', 'export-json')}${button('Обновить', 'operator-refresh', 'quiet', '')}</div><p>CSV содержит контакты участников. Храните выгрузку у организатора.<br>Результаты остаются на этом устройстве и не передаются на сервер.</p><div class="operator-buttons"><a class="action quiet" href="./">Открыть игру</a>${button('На весь экран', 'fullscreen', 'quiet', '')}</div><p class="operator-version">Версия ${CONFIG.version}</p></section>`;
}
async function exportData(format) {
  try {
    const data = await allData(); let content;
    if (format === 'json') content = JSON.stringify(data, null, 2);
    else {
      const players = new Map(data.players.map(p => [p.id, p]));
      content = '\uFEFF' + [['ID попытки','Дата','Имя','Фамилия','Телефон','Время, мс','Время','Ходы','Подарок'], ...data.attempts.filter(a => a.eventId === CONFIG.eventId).map(a => [a.id, new Date(a.finishedAt).toISOString(), a.firstName, a.lastName, players.get(a.playerId)?.phone ?? '', a.durationMs, formatTime(a.durationMs), a.moves, a.giftEligible ? 'Да' : 'Нет'])].map(row => row.map(csvCell).join(';')).join('\r\n');
    }
    const url = URL.createObjectURL(new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `avito-results-${new Date().toISOString().slice(0,10)}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch { showDialog('Не удалось выгрузить результаты', '<p>Попробуйте ещё раз.</p>'); }
}
async function preload() {
  const paths = [...PRODUCTS.map(p => `products/${p.id}.png`), 'logo.svg','play.svg','arrow.svg','restart.svg','restart-large.svg','close.svg','card-rim.svg','card-face.svg','card-stage.svg','hero-rim.svg','hero-face.svg','hero-stage.svg','arrow-large.svg'];
  await Promise.all(paths.map(path => new Promise((resolve,reject) => { const img = new Image(); img.onload = resolve; img.onerror = () => reject(new Error(path)); img.src = './assets/' + path; })));
  await document.fonts.ready;
}
async function boot() {
  try {
    await Promise.all([openDatabase(), preload()]);
    if (operatorMode) await showOperator(); else showHome();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  } catch {
    stage.innerHTML = `<section class="screen boot-error"><h1>Не удалось загрузить игру</h1><p>Проверьте соединение и разрешите хранение данных в браузере.</p>${button('Повторить', 'reload')}</section>`;
  }
}
boot();
