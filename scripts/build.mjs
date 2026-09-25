import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
for (const path of ['index.html','update.html','styles.css','src','assets','checks']) await cp(path, 'dist/' + path, { recursive:true });
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
self.addEventListener('install',event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await caches.open(CACHE);
 await self.clients.claim();
 await Promise.all((await caches.keys()).filter(key=>key.startsWith('avito-pairs-')&&key!==CACHE).map(key=>caches.delete(key)));
})()));
self.addEventListener('fetch',event=>{
 const request=event.request, url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Code and navigation must not get stuck in an old offline release.
 const fresh=request.mode==='navigate'||/\\.(?:html|css|js)$/.test(url.pathname);
 event.respondWith(caches.open(CACHE).then(async cache=>{
   if(fresh){
     try{
       const response=await fetch(request,{cache:'no-cache'});
       if(response.ok){await cache.put(request,response.clone());return response;}
       const cached=await cache.match(request,{ignoreSearch:true});
       return cached||response;
     }catch(error){
       const cached=await cache.match(request,{ignoreSearch:true});
       if(cached)return cached;
       if(request.mode==='navigate')return cache.match('./index.html');
       throw error;
     }
   }
   return (await cache.match(request,{ignoreSearch:true}))||fetch(request);
 }));
});
`);
console.log(`Built ${files.length} files. Offline cache ${version}.`);
