import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

// Exercise the generated worker: release updates must not retain old UI,
// while an event touchscreen must still open the game without a connection.
execFileSync(process.execPath, ['scripts/build.mjs']);
const source = await readFile('dist/sw.js', 'utf8');
function worker(fetcher, cached) {
  const handlers = {}, writes = [];
  const cache = { match: async key => cached.get(typeof key === 'string' ? key : key.url), put: async (...args) => writes.push(args) };
  const self = { location: { origin: 'https://game.example' }, addEventListener: (name, fn) => { handlers[name] = fn; } };
  vm.runInNewContext(source, { self, URL, Request, caches: { open: async () => cache }, fetch: fetcher });
  return { writes, async request(path, mode = 'cors') {
    let response;
    handlers.fetch({ request: { url: 'https://game.example' + path, method: 'GET', mode }, respondWith: value => { response = value; } });
    return response;
  } };
}
test('online CSS uses the latest response even when an old copy is cached', async () => {
  const w = worker(async () => new Response('latest styles'), new Map([['https://game.example/styles.css', new Response('old red cards')]]));
  assert.equal(await (await w.request('/styles.css')).text(), 'latest styles');
  assert.equal(w.writes.length, 1);
});
test('offline code and navigation keep working from the installed release', async () => {
  const w = worker(async () => { throw new Error('offline'); }, new Map([
    ['https://game.example/src/app.js', new Response('cached app')], ['./index.html', new Response('cached game')],
  ]));
  assert.equal(await (await w.request('/src/app.js')).text(), 'cached app');
  assert.equal(await (await w.request('/?round=next', 'navigate')).text(), 'cached game');
});
test('a server error cannot replace the last working code in the offline cache', async () => {
  const w = worker(async () => new Response('bad gateway', { status: 502 }), new Map([['https://game.example/styles.css', new Response('working styles')]]));
  assert.equal(await (await w.request('/styles.css')).text(), 'working styles');
  assert.equal(w.writes.length, 0);
});
