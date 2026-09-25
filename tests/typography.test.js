import test from 'node:test';
import assert from 'node:assert/strict';
import { typograph } from '../src/typography.js';

test('short Russian words attach to the next word, including chains and capitals', () => {
  assert.equal(typograph('и с Политикой обработки персональных данных'), 'и\u00a0с\u00a0Политикой обработки персональных данных');
  assert.equal(typograph('Вы в игре'), 'Вы\u00a0в\u00a0игре');
  assert.equal(typograph('Количество попыток не ограничено'), 'Количество попыток не\u00a0ограничено');
  const text='оставляя личную информацию, вы соглашаетесь';
  assert.equal(typograph(text),'оставляя личную информацию, вы\u00a0соглашаетесь');
  assert.equal(typograph(typograph(text)),typograph(text));
});
