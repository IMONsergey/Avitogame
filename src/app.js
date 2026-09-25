import { CONFIG, PRODUCTS } from './config.js';
import { Round, createDeck, normalizeName, validName, editPhone, formatPhone, validPhone, formatTime, leaderboard, csvCell } from './engine.js';
import { typograph } from './typography.js';
import { rankingCards } from './ranking.js';
import { icon, iconPaths } from './icons.js';
import { canvasMetrics } from './layout.js';
import { openDatabase, registerPlayer, saveAttempt, readStore, allData } from './storage.js';

const stage = document.querySelector('#stage');
const announce = document.querySelector('#announce');
const operatorMode = new URLSearchParams(location.search).get('operator') === '1';
let screen = 'start', player = null, round = null, activeInput = null, language = 'RU';
let animationFrame = 0, generation = 0, busy = false, modalClose = null, lastActivity = Date.now();
const timeouts = new Set();
const form = { firstName: '', lastName: '', phone: '' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const copy = text => esc(typograph(text));
const image = (name, cls = '', alt = '') => `<img class="${cls}" src="./assets/${name}" alt="${esc(alt)}" draggable="false">`;
const productPath = id => `products/${id}.${PRODUCTS.find(p => p.id === id)?.extension || 'png'}`;
const button = (label, action, classes = '', glyph = 'arrow', disabled = false) => `<button type="button" class="action ${classes}" data-action="${action}" ${disabled ? 'disabled' : ''}><span>${label}</span>${glyph ? `<span class="action-disc">${icon(glyph)}</span>` : ''}</button>`;
const closeButton = () => `<button type="button" class="close" data-action="close" aria-label="Закрыть">${icon('close')}</button>`;
function later(callback, ms) { const current = generation; const id = setTimeout(() => { timeouts.delete(id); if (current === generation) callback(); }, ms); timeouts.add(id); }
function cancelPending() { generation++; for (const id of timeouts) clearTimeout(id); timeouts.clear(); cancelAnimationFrame(animationFrame); }
function say(message) { announce.textContent = message; }
function resize() {
  const canvas = canvasMetrics(innerWidth, innerHeight);
  stage.style.setProperty('--scale', canvas.scale);
  stage.style.setProperty('--canvas-width', `${canvas.width}px`);
  stage.style.setProperty('--canvas-height', `${canvas.height}px`);
}
addEventListener('resize', resize); resize();

const backButton = action => `<button type="button" class="screen-back" data-action="${action}">${icon('back')}<span>Назад</span></button>`;
function heart(cls) {
  return `<svg class="match-heart ${cls}" viewBox="0 0 100 96" aria-hidden="true"><path d="M50 87 13 52C-11 26 19-2 40 17l10 10 10-10C81-2 111 26 87 52Z" fill="currentColor"/><path d="M19 34c-1-12 11-17 19-9" fill="none" stroke="white" stroke-opacity=".65" stroke-width="6" stroke-linecap="round"/></svg>`;
}

function backFace(hero = false) {
  return `<span class="card-back"><span class="card-surface">${image(hero ? 'hero-rim.svg' : 'card-rim.svg', 'card-rim')}${image(hero ? 'hero-face.svg' : 'card-face.svg', 'card-token')}<span class="question">?</span></span></span>`;
}
function frontFace(product, hero = false, color = '#C9FFBF') {
  return `<span class="card-front" style="--pair-color:${color}"><span class="card-surface">${image(hero ? 'hero-stage.svg' : 'card-stage.svg', 'product-stage')}${image(productPath(product), 'product')}</span></span>`;
}
function homeMarkup() {
  return `<section class="screen start-screen" aria-label="Найди пару">
    ${image('logo.svg', 'brand', 'Авито')}
    <div class="start-grid"><div class="start-left"><div class="title-tile"><h1>Найди<br>пару</h1><span class="underline"></span></div>
      ${button('Играть', 'rules', 'start-action')}${button('Рейтинг', 'rank', 'quiet', 'trophy')}</div>
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
  stage.innerHTML = `<section class="screen rules-screen" aria-labelledby="rules-title"><h1 id="rules-title" class="screen-title">${copy('Вы в игре «Найди пару»')}</h1>${backButton('home')}
  <ol class="rules-grid">
    <li class="rule-register"><span class="rule-number">1</span><div class="rule-symbol">${icon('registration')}</div><p>Зарегистрируйтесь<br>${copy('в игре')}</p></li>
    <li class="rule-pairs"><span class="rule-number">2</span><p>Переворачивайте карточки<br>${copy('и находите пары')}</p><div class="rule-pair-art" aria-hidden="true"><div class="rule-mini-card first">${image('products/headphones.png')}</div><div class="rule-mini-card second">${image('products/headphones.png')}</div></div></li>
    <li class="rule-speed"><span class="rule-number">3</span><p>${copy('Уложитесь в 45 секунд')}<br>${copy('и получите подарок')}</p><div class="rule-symbol">${icon('gift')}</div></li>
    <li class="rule-prize"><span class="rule-number">4</span><p>${copy('Попадите в топ-10,')}<br>чтобы стать обладателем<br>суперприза</p><div class="rule-symbol">${icon('trophy')}</div></li>
  </ol><div class="rules-footer"><p>${copy('Количество попыток не ограничено')}<br><span>Удачи!</span></p></div>${button('Далее', 'register', 'rules-next')}</section>`;
}

function field(key, label) {
  return `<label class="field ${form[key] ? 'filled' : ''}"><span>${label}</span><span class="field-hint" id="${key}-hint" aria-live="polite"></span><input aria-label="${label}" aria-describedby="${key}-hint" name="${key}" id="${key}" type="text" inputmode="none" autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="${key === 'phone' ? 24 : 32}" value="${esc(form[key])}" placeholder=" "></label>`;
}
function showRegister() {
  cancelPending(); screen = 'register'; activeInput = null; busy = false;
  stage.innerHTML = `<section class="screen register-screen" aria-labelledby="form-title"><h1 class="screen-title" id="form-title">Давайте познакомимся</h1>${backButton('rules')}
  <form id="registration" novalidate><div class="form-panel"><div class="form-fields">${field('firstName', 'Имя')}${field('lastName', 'Фамилия')}${field('phone', 'Телефон')}</div><div class="form-error" role="alert"></div></div>
  <div class="form-aside"><p class="consent">${copy('оставляя личную информацию, вы соглашаетесь')} <button type="button" data-action="terms">${copy('с Условиями использования')}</button> <button type="button" data-action="privacy">${copy('и с Политикой обработки персональных данных')}</button></p>${button('Играть', 'submit', 'form-next', 'arrow', true)}</div></form>
  <div id="keyboard"></div></section>`;
  document.querySelector('#registration').addEventListener('submit', e => { e.preventDefault(); submitRegistration(); });
  for (const input of document.querySelectorAll('.field input')) {
    input.addEventListener('focus', () => { activeInput = input; input.closest('.field').classList.add('focused'); renderKeyboard(); });
    input.addEventListener('blur', () => { input.closest('.field').classList.remove('focused'); if (input.value) validateField(input.name); });
    input.addEventListener('input', () => {
      const caret = input.selectionStart;
      const clean = input.name === 'phone' ? formatPhone(input.value) : normalizeName(input.value);
      const changed = clean !== input.value;
      input.value = clean;
      if (changed && input.name !== 'phone') input.setSelectionRange(Math.min(caret, clean.length), Math.min(caret, clean.length));
      form[input.name] = clean; updateForm();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); keyboardNext(); } if (e.key === 'Escape') input.blur(); });
  }
  updateForm();
  document.querySelector('#firstName').focus({ preventScroll: true });
}
function updateForm() {
  for (const input of document.querySelectorAll('.field input')) input.closest('.field').classList.toggle('filled', !!input.value);
  const valid = validName(form.firstName) && validName(form.lastName) && validPhone(form.phone);
  document.querySelector('[data-action="submit"]').disabled = !valid || busy;
  const err = document.querySelector('.form-error');
  if (err) err.textContent = '';
  for (const input of document.querySelectorAll('.field input[aria-invalid="true"]')) validateField(input.name);
}
function validateField(key) {
  const input = document.querySelector(`#${key}`);
  const valid = key === 'phone' ? validPhone(form[key]) : validName(form[key]);
  input.setAttribute('aria-invalid', String(!valid));
  input.closest('.field').classList.toggle('invalid', !valid);
  document.querySelector(`#${key}-hint`).textContent = valid ? '' : key === 'phone' ? 'Проверьте номер телефона' : key === 'firstName' ? 'Введите имя' : 'Введите фамилию';
  return valid;
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
  if (!validateField(key)) return;
  if (key !== 'phone') document.querySelector(key === 'firstName' ? '#lastName' : '#phone').focus();
  else {
    document.querySelector('[data-action="submit"]').focus({ preventScroll: true });
  }
}
function typeKey(key) {
  if (!activeInput || !activeInput.isConnected) return;
  if (key === 'language') { language = language === 'RU' ? 'EN' : 'RU'; renderKeyboard(); return; }
  if (key === 'next') { keyboardNext(); return; }
  const input = activeInput;
  let start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
  let text = input.value;
  if (input.name === 'phone') {
    input.value = editPhone(text, key, start, end);
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
  <div class="pairs-tile"><span>Найдено пар</span><strong><span id="pair-count">0</span><span class="pair-total"> / 9</span></strong><div class="pair-progress" role="progressbar" aria-label="Найдено пар" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0">${Array.from({length:9}, () => '<span aria-hidden="true"></span>').join('')}</div></div>
  <div class="time-tile"><span>Время</span><output id="timer" aria-label="Время игры">0:00</output></div>
  <div class="board" aria-label="Игровое поле, 18 карточек">${round.deck.map((c, i) => `<div class="card-slot" style="--deal:${i}"><button class="card" data-card="${i}" aria-label="Карточка ${i + 1}, закрыта" aria-pressed="false"><span class="card-inner">${backFace()}${frontFace(c.product, false, c.color)}</span></button></div>`).join('')}</div>
  <button type="button" class="game-control game-exit" data-action="exit"><span>Выйти из игры</span>${icon('exit')}</button><div class="match-feedback" aria-hidden="true"></div><button type="button" class="game-control restart" data-action="restart"><span>Рестарт</span>${icon('restart')}</button></section>`;
  function tick() { const timer = document.querySelector('#timer'); if (timer && round) timer.textContent = formatTime(round.elapsed); if (!round?.complete && screen === 'game') animationFrame = requestAnimationFrame(tick); }
  tick(); say('Игра началась. Найдите девять пар.');
}
function updateCards(result) {
  document.querySelectorAll('[data-card]').forEach((node, i) => {
    const open = round.open.includes(i), matched = round.matched.has(i), revealed = open || matched;
    node.classList.toggle('flipped', revealed);
    node.classList.toggle('matched', matched);
    node.classList.toggle('mismatch', open && result === 'mismatch');
    node.setAttribute('aria-pressed', String(revealed));
    node.setAttribute('aria-label', `Карточка ${i + 1}, ${revealed ? round.deck[i].label + (matched ? ', пара найдена' : '') : 'закрыта'}`);
    node.setAttribute('aria-disabled', String(matched || round.locked));
  });
  const count = round.matched.size / 2;
  document.querySelector('#pair-count').textContent = count;
  document.querySelector('.pair-progress').setAttribute('aria-valuenow', count);
  document.querySelectorAll('.pair-progress > span').forEach((bar, i) => bar.classList.toggle('found', i < count));
}
function celebrateMatch() {
  for (const i of round.open) {
    const card = document.querySelector(`[data-card="${i}"]`);
    card.classList.add('match-flash');
    card.insertAdjacentHTML('beforeend', `<span class="card-burst" aria-hidden="true">${Array.from({length:8}, (_,n) => `<i style="--angle:${n*45}deg;--travel:${n%2?86:108}px"></i>`).join('')}</span>`);
    later(() => { card.classList.remove('match-flash'); card.querySelector('.card-burst')?.remove(); }, 1500);
  }
  const feedback = document.querySelector('.match-feedback');
  feedback.innerHTML = `<div class="pair-celebration"><span class="heart-halo"></span>${heart('heart-left')}${heart('heart-main')}${heart('heart-right')}<span class="match-spark s1">✦</span><span class="match-spark s2">✦</span><span class="match-spark s3">✦</span><span class="match-spark s4">✦</span></div>`;
  const celebration = feedback.firstElementChild;
  later(() => celebration.remove(), 1700);
}
function showExit() {
  if (screen !== 'game' || round?.complete) return;
  showDialog('Выйти из игры?', `<p>Текущая попытка не сохранится.<br>Вы сможете начать новую игру.</p><div class="exit-actions">${button('Продолжить', 'close')}${button('Выйти', 'home', 'quiet solid', 'exit')}</div>`, () => document.querySelector('[data-action="exit"]')?.focus());
}
function requestRestart() {
  if (screen === 'game' && round && !round.complete && (round.moves || round.open.length)) {
    showDialog('Начать заново?', `<p>Текущая попытка не сохранится.<br>Карточки перемешаются, время начнётся с нуля.</p><div class="exit-actions">${button('Продолжить', 'close')}${button('Рестарт', 'restart-now', 'quiet solid', 'restart')}</div>`, () => document.querySelector('[data-action="restart"]')?.focus());
  } else { removeModal(); startRound(); }
}
function chooseCard(index) {
  if (screen !== 'game' || !round || modalClose) return;
  const result = round.choose(index);
  if (result === 'ignored') return;
  updateCards(result);
  if (result === 'match' || result === 'complete') celebrateMatch();
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
function victoryMedal() {
  return `<svg class="victory-medal" viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="132" r="88" fill="#003914" opacity=".18"/><circle cx="120" cy="112" r="88" fill="#04E061" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="3"/><circle cx="120" cy="112" r="66" fill="#C9FFBF" stroke="#003914" stroke-opacity=".16" stroke-width="3"/><path d="M57 76c12-28 45-47 77-40" fill="none" stroke="white" stroke-opacity=".7" stroke-width="7" stroke-linecap="round"/><g transform="translate(80 71) scale(1.25)" fill="#003914">${iconPaths.star}</g><path d="m204 32 4 10 11 4-11 4-4 10-4-10-11-4 11-4Z" fill="#003914"/><path d="m32 176 3 8 9 3-9 3-3 8-3-8-9-3 9-3Z" fill="#003914"/></svg>`;
}
function victoryConfetti() {
  const colors = ['#04E061','#C9FFBF','#BADAFB','#DFCDF3','#FFFFFF'];
  return `<div class="victory-confetti" aria-hidden="true">${Array.from({length:42}, (_,i) => `<i style="--x:${(i*97)%100}%;--drift:${((i*43)%240)-120}px;--spin:${(i%2?1:-1)*(240+(i*31)%480)}deg;--delay:${(i%9)*.065}s;--duration:${2.2+(i%5)*.23}s;--confetti:${colors[i%colors.length]};--size:${12+(i%4)*5}px"></i>`).join('')}</div>`;
}
function openModal(markup, onClose) {
  document.querySelector('.overlay')?.remove();
  const base = stage.querySelector('.screen'); if (base) { base.inert = true; base.setAttribute('aria-hidden', 'true'); }
  stage.insertAdjacentHTML('beforeend', `<div class="overlay">${markup}</div>`);
  modalClose = onClose;
  const dialog = stage.querySelector('.overlay [role="dialog"]');
  if (dialog) { dialog.tabIndex = -1; dialog.focus({ preventScroll: true }); }
}
function removeModal() {
  stage.querySelector('.overlay')?.remove();
  const base = stage.querySelector('.screen'); if (base) { base.inert = false; base.removeAttribute('aria-hidden'); }
  modalClose = null;
}
function closeModal() { const callback = modalClose; removeModal(); callback?.(); }
function showResult(rows) {
  const eligible = round.elapsed <= CONFIG.giftTimeMs;
  const time = formatTime(round.elapsed);
  openModal(`<section class="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
    <div class="result-left"><div class="result-hero"><h2 id="result-title">Вы прошли<br>игру!</h2>${victoryMedal()}</div>
    <div class="result-time"><p>Ваше время</p><strong class="${time.length > 5 ? 'long-time' : ''}">${time}</strong><div class="result-message"><p>${eligible ? `Ваш подарок уже ждёт вас<br>${esc(CONFIG.giftLocation)}` : 'Попробуйте ещё раз<br>и уложитесь в 45 секунд'}</p></div></div></div>
    <div class="result-leaders"><h2>Топ-3 игроков</h2>${closeButton()}<div class="leader-labels"><span>Имя</span><span>Время</span></div><div class="leader-list compact-leaders" role="list" aria-label="Топ-3 игроков">${rankingCards(rows, {slots:3, currentId:player?.id})}</div></div>
    <div class="result-actions">${button('На главную', 'home', 'quiet solid', 'back')}${button('Рестарт', 'restart', '', 'restart')}</div>${victoryConfetti()}
  </section>`, showHome);
  later(() => document.querySelector('.victory-confetti')?.remove(), 4400);
}
async function showRank() {
  const current = generation;
  try {
    const rows = leaderboard(await readStore('attempts'), CONFIG.eventId);
    if (current !== generation) return;
    openModal(`<section class="rank-modal" role="dialog" aria-modal="true" aria-labelledby="rank-title"><div class="rank-panel"><header class="rank-heading"><h2 id="rank-title">Самые быстрые</h2></header>${closeButton()}<div class="leader-list full-leaders ${rows.length ? '' : 'is-empty'}" role="list" aria-label="Рейтинг игроков">${rankingCards(rows, {slots:10, currentId:player?.id})}</div></div>${button('Играть', 'rules')}</section>`, () => document.querySelector('[data-action="rank"]')?.focus());
  } catch { showDialog('Не удалось открыть рейтинг', '<p>Обновите страницу и попробуйте ещё раз.</p>'); }
}

function showDialog(title, body, onClose = () => {}) {
  openModal(`<section class="message-modal" role="dialog" aria-modal="true" aria-labelledby="message-title"><h2 id="message-title">${esc(title)}</h2>${closeButton()}<div class="message-body">${body}</div></section>`, onClose);
}
function showLegal(which) {
  hideKeyboard();
  const url = which === 'terms' ? CONFIG.termsUrl : CONFIG.privacyUrl;
  if (url && /^https:\/\//.test(url)) { window.open(url, '_blank', 'noopener,noreferrer'); document.querySelector('#firstName')?.focus({ preventScroll: true }); return; }
  showDialog('Документ недоступен', '<p>Документ мероприятия пока не добавлен.<br>Обратитесь к организатору.</p>', () => document.querySelector('#firstName')?.focus({ preventScroll: true }));
}

stage.addEventListener('pointerdown', e => {
  lastActivity = Date.now();
  if (e.target.closest('[data-key]')) e.preventDefault();
});
stage.addEventListener('click', e => {
  const key = e.target.closest('[data-key]'); if (key) { typeKey(key.dataset.key); return; }
  const card = e.target.closest('[data-card]'); if (card) { chooseCard(Number(card.dataset.card)); return; }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'close') { closeModal(); return; }
  if (action === 'rules') { removeModal(); showRules(); }
  else if (action === 'home') { removeModal(); showHome(); }
  else if (action === 'register') showRegister();
  else if (action === 'submit') submitRegistration();
  else if (action === 'rank') showRank();
  else if (action === 'exit') showExit();
  else if (action === 'restart') requestRestart();
  else if (action === 'restart-now') { removeModal(); startRound(); }
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
    if (e.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) { e.preventDefault(); last?.focus(); }
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
  const paths = [...PRODUCTS.map(p => productPath(p.id)), 'logo.svg','card-rim.svg','card-face.svg','card-stage.svg','hero-rim.svg','hero-face.svg','hero-stage.svg'];
  await Promise.all(paths.map(path => new Promise((resolve,reject) => { const img = new Image(); img.onload = resolve; img.onerror = () => reject(new Error(path)); img.src = './assets/' + path; })));
  await document.fonts.ready;
}
async function boot() {
  try {
    await Promise.all([openDatabase(), preload()]);
    if (operatorMode) await showOperator(); else showHome();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => registration.update()).catch(() => {});
  } catch {
    stage.innerHTML = `<section class="screen boot-error"><h1>Не удалось загрузить игру</h1><p>Проверьте соединение и разрешите хранение данных в браузере.</p>${button('Повторить', 'reload')}</section>`;
  }
}
boot();
