import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { PRODUCTS } from '../src/config.js';

test('every selectable product has a shipped image, so preload cannot fail on a missing asset', async () => {
  assert.equal(new Set(PRODUCTS.map(p => p.id)).size, 18);
  for (const product of PRODUCTS) {
    await access(new URL(`../assets/products/${product.id}.${product.extension || 'png'}`, import.meta.url));
  }
});
