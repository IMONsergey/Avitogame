import test from 'node:test';
import assert from 'node:assert/strict';
import { Round, createDeck, formatPhone, phoneDigits, validPhone, validName, normalizeName, formatTime, leaderboard, csvCell } from '../src/engine.js';
import { CONFIG } from '../src/config.js';

test('every shuffled round has exactly nine distinct pairs and unique card ids',()=>{
  const layouts=new Set();
  for(let r=0;r<100;r++){
    const deck=createDeck();assert.equal(deck.length,18);assert.equal(new Set(deck.map(c=>c.id)).size,18);
    for(const product of new Set(deck.map(c=>c.product)))assert.equal(deck.filter(c=>c.product===product).length,2);
    layouts.add(deck.map(c=>c.id).join(','));
  }
  assert.ok(layouts.size>95);
});
function setup(){let now=100;const round=new Round(createDeck(n=>n-1),()=>now);return {round,setTime:v=>now=v};}
test('same card, invalid indices and a third click cannot alter a pending pair',()=>{
  const {round}=setup();assert.equal(round.choose(-1),'ignored');assert.equal(round.choose(0),'first');
  assert.equal(round.choose(0),'ignored');assert.equal(round.choose(2),'mismatch');
  assert.equal(round.choose(4),'ignored');assert.deepEqual(round.open,[0,2]);assert.equal(round.moves,1);
  round.settle();assert.equal(round.choose(4),'first');
});
test('matching cards stay solved, do not double-score, and unlock after feedback',()=>{
  const {round}=setup();round.choose(0);assert.equal(round.choose(1),'match');assert.equal(round.matched.size,2);
  round.settle();assert.equal(round.choose(0),'ignored');assert.equal(round.choose(2),'first');
});
test('last pair freezes elapsed time immediately; there is no 45-second hard stop',()=>{
  const {round,setTime}=setup();setTime(60_100);
  for(let i=0;i<18;i+=2){assert.equal(round.choose(i),'first');assert.equal(round.choose(i+1),i===16?'complete':'match');round.settle();}
  assert.ok(round.complete);assert.equal(round.elapsed,60_000);setTime(200_000);assert.equal(round.elapsed,60_000);assert.equal(round.choose(0),'ignored');
});
test('gift threshold is inclusive at exactly 45 seconds',()=>{
  const {round,setTime}=setup();setTime(45_100);assert.equal(round.elapsed<=CONFIG.giftTimeMs,true);setTime(45_101);assert.equal(round.elapsed<=CONFIG.giftTimeMs,false);
});
test('new round has independent clock and identity',()=>{
  const {round,setTime}=setup();round.choose(0);setTime(10_000);const next=new Round(createDeck(),()=>10_000);
  assert.notEqual(next.id,round.id);assert.equal(next.elapsed,0);assert.equal(next.open.length,0);assert.equal(next.matched.size,0);
});
test('phone normalization accepts +7, 8, pasted mask and ten digits',()=>{
  for(const phone of ['89996062811','+7 (999) 606-28-11','9996062811','79996062811']){
    assert.equal(phoneDigits(phone),'9996062811');assert.equal(formatPhone(phone),'+7 (999) 606-28-11');assert.equal(validPhone(phone),true);
  }
  for(const phone of ['','999','1111111111','9999999999'])assert.equal(validPhone(phone),false);
});
test('Cyrillic, Latin, composed accents and compound names work; markup and digits do not',()=>{
  for(const name of ['Настя','Ичко','Анна-Мария',"O’Connor",'И','José'])assert.equal(validName(name),true);
  for(const name of ['','---','Иван2','<script>'])assert.equal(validName(name),false);
  assert.equal(normalizeName('Анна  Мария42'),'Анна Мария');
});
test('leaderboard uses fastest attempt per player and stable ties; no other event leaks',()=>{
  const rows=[
    {id:'a',playerId:'p1',eventId:'e',durationMs:30000,finishedAt:10},
    {id:'b',playerId:'p1',eventId:'e',durationMs:25000,finishedAt:30},
    {id:'c',playerId:'p2',eventId:'e',durationMs:25000,finishedAt:20},
    {id:'d',playerId:'p3',eventId:'other',durationMs:10000,finishedAt:10},
    {id:'e',playerId:'p4',eventId:'e',durationMs:NaN,finishedAt:10},
  ];assert.deepEqual(leaderboard(rows,'e').map(r=>r.id),['c','b']);assert.equal(leaderboard(rows,'e',1).length,1);
});
test('time formatting and CSV formula escaping',()=>{
  assert.equal(formatTime(0),'0:00');assert.equal(formatTime(69999),'1:09');assert.equal(formatTime(600000),'10:00');
  assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a"b'),'"a""b"');
});
