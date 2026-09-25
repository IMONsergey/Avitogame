import test from 'node:test';
import assert from 'node:assert/strict';
import { rankingCards } from '../src/ranking.js';
import { PRODUCTS } from '../src/config.js';

const result = (n, overrides = {}) => ({playerId:`p${n}`,firstName:'Анна',lastName:'Иванова',durationMs:43200+n, ...overrides});
test('each of the nine pairs has a stable unique color from the Sellers palette', () => {
  const palette=new Set(['#DFCDF3','#BADAFB','#FEEADB','#C9FFBF','#00AAFF','#FF944D','#965EEB','#04E061','#F7C1C5']);
  assert.equal(PRODUCTS.length,9);assert.equal(new Set(PRODUCTS.map(p=>p.color)).size,9);
  for(const p of PRODUCTS)assert.ok(palette.has(p.color));
});
test('an empty ranking has no fictitious player or score', () => {
  const html=rankingCards([]);assert.match(html,/Пока нет результатов/);assert.doesNotMatch(html,/leader-card|0:00/);
});
test('a partial top three separates real scores from explicitly vacant positions', () => {
  const html=rankingCards([result(1)],{slots:3,currentId:'p1'});
  assert.equal((html.match(/role="listitem"/g)||[]).length,3);
  assert.equal((html.match(/class="leader-card vacant"/g)||[]).length,2);
  assert.equal((html.match(/class="leader-card place-1 current"/g)||[]).length,1);
  assert.equal((html.match(/<strong class="leader-time">0:43/g)||[]).length,1);
});
test('a full top ten retains rank order, long names and long times', () => {
  const rows=Array.from({length:10},(_,i)=>result(i,{lastName:'Александрова-Александрова',firstName:'Александра-Александрина',durationMs:6_000_000+i}));
  const html=rankingCards(rows);
  assert.equal((html.match(/role="listitem"/g)||[]).length,10);assert.doesNotMatch(html,/class="leader-card vacant"/);
  assert.match(html,/leader-name long-name/);assert.match(html,/leader-time long-time/);
  assert.match(html,/100:00/);assert.ok(html.indexOf('place-1"')<html.indexOf('place-10"'));
});
test('stored names cannot inject markup into ranking content or accessibility labels', () => {
  const html=rankingCards([result(1,{firstName:'<img src=x>',lastName:'" onclick="alert(1)'})]);
  assert.doesNotMatch(html,/<img| onclick="alert/);assert.match(html,/&lt;img src=x&gt;/);assert.match(html,/&quot;/);
});
