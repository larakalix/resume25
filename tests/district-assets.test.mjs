import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import * as THREE from 'three';
import {createDistrictAssets} from '../src/experience/archipelago/district-assets.ts';
import {parseCityModels} from '../src/experience/globe/city-models.ts';
import {parseJapaneseModels} from '../src/experience/globe/japanese-models.ts';
import {createArtKit} from '../src/experience/explorer/art-kit.ts';
import houses from '../src/experience/globe/assets/simple-houses.json' with {type:'json'};
import japanese from '../src/experience/globe/assets/japanese-town.json' with {type:'json'};

const files={houses:await readFile(new URL('../public/models/city-street/simple-houses.glb',import.meta.url)),japanese:await readFile(new URL('../public/models/japanese-town/town-buildings.glb',import.meta.url))};
const buffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const owned=(kit,geometry)=>{const clone=geometry.clone(),mesh=new THREE.Mesh(clone,kit.materials.cream);kit.geometries.push(clone);kit.scene.add(mesh);return mesh;};

test('construction and exact distant LODs fetch nothing; their bounds and colours come from the prepared sources',async()=>{
 const previous=globalThis.fetch;let fetches=0;globalThis.fetch=async()=>{fetches++;throw new Error('Unexpected eager catalog fetch');};
 const library=createDistrictAssets(new AbortController().signal,()=>{},()=>{});
 const real={houses:await parseCityModels(buffer(files.houses)),japanese:await parseJapaneseModels(buffer(files.japanese))};
 try{for(const[family,manifest]of [['houses',houses],['japanese',japanese]])for(const source of manifest.models){
  const proxy=library.get(source.name),bounds=proxy.boundingBox,size=bounds.getSize(new THREE.Vector3());assert.ok(proxy.userData.districtProxy);assert.equal(proxy.userData.sourceModel,source.name);assert.match(proxy.name,/distant-district-proxy/u);
  assert.ok(Math.abs(size.x-source.width)<1e-6&&Math.abs(size.y-source.height)<1e-6&&Math.abs(size.z-source.depth)<1e-6);assert.equal(bounds.min.y,0);assert.ok(proxy.attributes.position.count<100,'deliberately coarse distant-only geometry');
  const colors=real[family].get(source.name).attributes.color,actual=[];for(let i=0;i<colors.count;i++)actual.push([colors.getX(i),colors.getY(i),colors.getZ(i)]);
  const distant=proxy.attributes.color;for(let i=0;i<distant.count;i++){const value=[distant.getX(i),distant.getY(i),distant.getZ(i)];assert.ok(actual.some(color=>color.every((channel,j)=>Math.abs(channel-value[j])<1e-6)),'proxy colours are sampled from the actual source, not an unrelated palette');}
 }
 await library.ensure('harbor');await library.ensure('tideglass-coast');assert.equal(fetches,0);assert.equal(library.status('maker-heights'),'proxy');assert.equal(library.isReady('harbor'),true);assert.throws(()=>library.get('invented'),/Unknown/u);
 }finally{library.dispose();real.houses.dispose();real.japanese.dispose();globalThis.fetch=previous;}
});

test('district families load only when ensured, coalesce shared requests and replace the same mesh under ArtKit ownership',async()=>{
 const previous=globalThis.fetch,requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,signal:options.signal});return new Response(String(url).includes('japanese-town')?files.japanese:files.houses);};
 let changes=0;const errors=[],library=createDistrictAssets(new AbortController().signal,()=>changes++,error=>errors.push(error)),kit=createArtKit(new THREE.Scene()),proxy=library.get('Cube008'),mesh=owned(kit,proxy),old=mesh.geometry;
 let oldReleases=0,proxyReleases=0;old.addEventListener('dispose',()=>oldReleases++);proxy.addEventListener('dispose',()=>proxyReleases++);library.watch('Cube008',mesh,kit);
 try{
  const first=library.ensure('maker-heights'),second=library.ensure('orchard-village');assert.equal(first,second);assert.equal(library.status('orchard-village'),'loading');await first;
  assert.equal(requests.length,1);assert.ok(String(requests[0].url).includes('city-street'));assert.equal(library.isReady('maker-heights'),true);assert.equal(library.isReady('orchard-village'),true);assert.equal(library.isReady('komorebi-market'),false);
  assert.notEqual(mesh.geometry,old);assert.equal(oldReleases,1);assert.equal(proxyReleases,0,'the source proxy has a separate owner');assert.ok(!kit.geometries.includes(old));assert.equal(kit.geometries.filter(geometry=>geometry===mesh.geometry).length,1);assert.equal(mesh.geometry.userData.districtProxy,undefined);
  assert.notEqual(mesh.geometry,library.get('Cube008'));assert.deepEqual(mesh.geometry.attributes.position.array,library.get('Cube008').attributes.position.array);assert.deepEqual(mesh.geometry.attributes.color.array,library.get('Cube008').attributes.color.array);
  await library.ensure('maker-heights');await library.ensure('orchard-village');assert.equal(requests.length,1);await library.ensure('komorebi-market');assert.equal(requests.length,2);assert.equal(changes,2);assert.deepEqual(errors,[]);
  let cloneReleases=0;mesh.geometry.addEventListener('dispose',()=>cloneReleases++);library.dispose();library.dispose();assert.equal(cloneReleases,0,'disposing source catalogs cannot free actor-owned clones');assert.equal(proxyReleases,1);kit.dispose();assert.equal(cloneReleases,1);
 }finally{library.dispose();globalThis.fetch=previous;}
});

test('unsubscribed meshes remain owned by art; late subscriptions upgrade an existing proxy without replacing the mesh',async()=>{
 const gate=deferred(),raw=await parseCityModels(buffer(files.houses));let changes=0;
 const library=createDistrictAssets(new AbortController().signal,()=>changes++,()=>{},{houses:()=>gate.promise,japanese:async()=>{throw new Error('Unrequested Japanese load');}}),kit=createArtKit(new THREE.Scene());
 const one=owned(kit,library.get('Cube008')),oldOne=one.geometry,two=owned(kit,library.get('Cube010')),oldTwo=two.geometry,stop=library.watch('Cube008',one,kit);stop();library.watch('Cube010',two,kit);const pending=library.ensure('maker-heights');gate.resolve(raw);await pending;
 assert.equal(one.geometry,oldOne);assert.notEqual(two.geometry,oldTwo);assert.equal(changes,1);library.watch('Cube008',one,kit);assert.notEqual(one.geometry,oldOne);assert.equal(changes,2);
 const full=owned(kit,library.get('Cube004')),before=full.geometry;library.watch('Cube004',full,kit);assert.equal(full.geometry,before,'already-native late subscribers need no extra clone');assert.equal(changes,2);
 library.dispose();kit.dispose();
});

test('abort and disposal prevent late upgrades, abort the owned request and release late catalogs exactly once',async()=>{
 for(const mode of ['abort','dispose']){
  const gate=deferred(),controller=new AbortController(),raw=await parseCityModels(buffer(files.houses));let sourceDisposals=0,received,changes=0;const errors=[];
  const catalog={get:raw.get,dispose(){sourceDisposals++;raw.dispose();}};
  const library=createDistrictAssets(controller.signal,()=>changes++,error=>errors.push(error),{houses:signal=>{received=signal;return gate.promise;},japanese:async()=>{throw new Error('Unrequested');}}),kit=createArtKit(new THREE.Scene()),mesh=owned(kit,library.get('Cube008')),before=mesh.geometry;
  library.watch('Cube008',mesh,kit);const pending=library.ensure('maker-heights');if(mode==='abort')controller.abort();else library.dispose();assert.equal(received.aborted,true);gate.resolve(catalog);await assert.rejects(pending,{name:'AbortError'});
  assert.equal(mesh.geometry,before);assert.equal(sourceDisposals,1);assert.equal(changes,0);assert.deepEqual(errors,[]);library.dispose();assert.equal(sourceDisposals,1);assert.throws(()=>library.get('Cube008'),{name:'AbortError'});await assert.rejects(library.ensure('maker-heights'),{name:'AbortError'});kit.dispose();
 }
});

test('a failed required catalog is reported once and never treated as a successful native load',async()=>{
 const failure=new Error('City model asset could not load (404).'),errors=[];let requests=0,changes=0;
 const library=createDistrictAssets(new AbortController().signal,()=>changes++,error=>errors.push(error),{houses:async()=>{requests++;throw failure;},japanese:async()=>{throw new Error('Unrequested');}});
 const first=library.ensure('maker-heights');await assert.rejects(first,error=>error===failure);await assert.rejects(library.ensure('orchard-village'),error=>error===failure);assert.equal(requests,1);assert.equal(changes,0);assert.deepEqual(errors,[failure]);assert.equal(library.status('maker-heights'),'failed');assert.equal(library.isReady('maker-heights'),false);assert.ok(library.get('Cube008').userData.districtProxy,'only the explicit distant LOD remains while root handles the reported world failure');library.dispose();
});

test('malformed catalogs cannot half-upgrade a group and borrowed geometry cannot be watched as an owned clone',async()=>{
 const gate=deferred(),errors=[];let releases=0,sourceDisposals=0;const raw=new THREE.BoxGeometry(1,1,1),nativeClone=raw.clone.bind(raw);raw.clone=()=>{const geometry=nativeClone();geometry.addEventListener('dispose',()=>releases++);return geometry;};
 const library=createDistrictAssets(new AbortController().signal,()=>{throw new Error('No partial refresh');},error=>errors.push(error),{houses:()=>gate.promise,japanese:async()=>{throw new Error('Unrequested');}}),kit=createArtKit(new THREE.Scene());
 const meshes=['Cube008','Cube010'].map(name=>{const mesh=owned(kit,library.get(name));library.watch(name,mesh,kit);return mesh;}),before=meshes.map(mesh=>mesh.geometry);
 assert.throws(()=>library.watch('Cube008',new THREE.Mesh(library.get('Cube008')),kit),/own its geometry/u);
 const request=library.ensure('maker-heights');gate.resolve({get(name){if(name==='Cube010')throw new Error('Incomplete native catalog');return raw;},dispose(){sourceDisposals++;raw.dispose();}});await assert.rejects(request,/Incomplete native catalog/u);
 assert.equal(releases,1,'prepared but unadopted clone released');assert.equal(sourceDisposals,1);assert.equal(errors.length,1);assert.deepEqual(meshes.map(mesh=>mesh.geometry),before);library.dispose();kit.dispose();
});

test('cancellation during a geometry-release callback cannot upgrade later meshes or double-release their catalog',async()=>{
 const raw=await parseCityModels(buffer(files.houses)),controller=new AbortController(),kit=createArtKit(new THREE.Scene());let sourceDisposals=0,changes=0;const errors=[];
 const library=createDistrictAssets(controller.signal,()=>changes++,error=>errors.push(error),{houses:async()=>({get:raw.get,dispose(){sourceDisposals++;raw.dispose();}}),japanese:async()=>{throw new Error('Unrequested');}});
 const one=owned(kit,library.get('Cube008')),two=owned(kit,library.get('Cube010')),oldTwo=two.geometry;library.watch('Cube008',one,kit);library.watch('Cube010',two,kit);one.geometry.addEventListener('dispose',()=>controller.abort());
 await assert.rejects(library.ensure('maker-heights'),{name:'AbortError'});assert.equal(two.geometry,oldTwo);assert.equal(sourceDisposals,1);assert.equal(changes,0);assert.deepEqual(errors,[]);library.dispose();assert.equal(sourceDisposals,1);kit.dispose();
});
