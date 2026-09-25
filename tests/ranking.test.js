import test from 'node:test';
import assert from 'node:assert/strict';
import { rankingCards } from '../src/ranking.js';
import { PAIR_COLORS } from '../src/config.js';

const result = (n, overrides = {}) => ({playerId:`p${n}`,firstName:'Анна',lastName:'Иванова',durationMs:43200+n, ...overrides});
test('all nine pairs use unique light Sellers colors or light brand tints', () => {
  const palette=new Set(['#DFCDF3','#BADAFB','#FEEADB','#C9FFBF','#FFFFFF','#EBBFEB','#F7C1C5','#CCEEFF','#CDF9DF']);
  assert.equal(PAIR_COLORS.length,9);assert.equal(new Set(PAIR_COLORS).size,9);
  for(const color of PAIR_COLORS){
    assert.ok(palette.has(color));
    const channels=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    assert.ok(channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.58, `${color} must remain light`);
  }
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
