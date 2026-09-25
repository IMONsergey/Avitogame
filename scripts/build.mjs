import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
for (const path of ['index.html','styles.css','src','assets']) await cp(path, 'dist/' + path, { recursive:true });
await writeFile('dist/.nojekyll', '');
async function walk(root) {
  const paths=[];
  for (const d of await readdir(root,{withFileTypes:true})) {
    const path=root+'/'+d.name;
    paths.push(...(d.isDirectory()?await walk(path):[path]));
  }
  return paths;
}
const files=await walk('dist');
const hash=createHash('sha256');
for(const file of files.sort()) hash.update(await readFile(file));
const version=hash.digest('hex').slice(0,12);
const urls=files.filter(p=>!p.endsWith('.nojekyll')).map(p=>'./'+p.slice(5));
await writeFile('dist/sw.js', `const CACHE='avito-pairs-${version}';
const FILES=${JSON.stringify(['./',...urls])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('avito-pairs-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
   const cached=await cache.match(event.request,{ignoreSearch:true});
   if(cached)return cached;
   try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return cache.match('./index.html');throw error;}
 }));
});
`);
console.log(`Built ${files.length} files. Offline cache ${version}.`);
