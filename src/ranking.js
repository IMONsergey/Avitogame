import { formatTime } from './engine.js';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Real results occupy individual cards. Unfilled places are marked with an em dash,
// never with invented names or scores. Full names remain available to accessibility.
export function rankingCards(rows, { slots = 10, currentId, columns = false } = {}) {
  if (!rows.length) return '<div class="empty-rank" role="listitem"><p>Пока нет результатов.<br>Сыграйте первым!</p></div>';
  return Array.from({length:slots}, (_,i) => {
    const r = rows[i], n = i + 1;
    // Read each group of ten down the left column, then down the right.
    const placement = columns ? `;grid-row:${Math.floor(i / 10) * 5 + i % 5 + 1};grid-column:${Math.floor(i % 10 / 5) + 1}` : '';
    const style = `--row:${Math.min(i, 9)}${placement}`;
    const placeClass = n > 999 ? ' extra-long-place' : n > 99 ? ' long-place' : '';
    if (!r) return `<div class="leader-card vacant" role="listitem" aria-label="Место ${n}: пока нет результата" style="${style}"><span class="leader-place" aria-hidden="true">${n}</span><span class="vacant-name" aria-hidden="true"></span><span class="leader-time" aria-hidden="true">—</span></div>`;
    const name = `${r.lastName} ${r.firstName}`;
    return `<div class="leader-card place-${n}${r.playerId === currentId ? ' current' : ''}" role="listitem" aria-label="${n}. ${esc(name)}, ${formatTime(r.durationMs)}${r.playerId === currentId ? ', ваш результат' : ''}" style="${style}"><span class="leader-place${placeClass}">${n}</span><span class="leader-name${name.length > 36 ? ' long-name' : ''}" title="${esc(name)}">${esc(name)}</span><strong class="leader-time${formatTime(r.durationMs).length > 5 ? ' long-time' : ''}">${formatTime(r.durationMs)}</strong></div>`;
  }).join('');
}

export function fullRankingList(rows, currentId) {
  return `<div class="leader-list full-leaders ${rows.length ? '' : 'is-empty'}" role="list" tabindex="0" aria-label="Рейтинг игроков">${rankingCards(rows, {slots:Math.max(10, rows.length), currentId, columns:true})}</div>`;
}
