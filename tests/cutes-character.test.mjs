import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import * as THREE from 'three';
import {createArtKit} from '../src/experience/explorer/art-kit.ts';
import {CUTES_MODELS,CUTES_VARIANTS,parseCutesAsset,createCutesFamily,loadCutesFamily} from '../src/experience/archipelago/cutes-assets.ts';
import {cutesClips,createCutesMotion} from '../src/experience/archipelago/cutes-motion.ts';
import {createCutesCharacter} from '../src/experience/archipelago/cutes-character.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createIslandFerry,FERRY_RIDER_OFFSET} from '../src/experience/archipelago/ferry-art.ts';
import manifest from '../public/models/cutes/manifest.json' with {type:'json'};

const files=new Map(await Promise.all(CUTES_MODELS.map(async id=>[id,await readFile(new URL(`../public/models/cutes/${id}.glb`,import.meta.url))])));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const toBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const idle={speed:0,y:0,vy:0,waving:false,reduced:false};

/** The real embedded PNG reaches the decoder. Only bitmap decoding is replaced in Node. */
async function environment(run){
 const before={self:globalThis.self,createImageBitmap:globalThis.createImageBitmap,fetch:globalThis.fetch},decoded=[];
 globalThis.self={URL:globalThis.URL};
 globalThis.createImageBitmap=async blob=>{
  const bytes=Buffer.from(await blob.arrayBuffer());
  assert.ok(manifest.models.some(model=>model.atlasSha256===hash(bytes)),'original supplied atlas, not a flat substitute');
  const bitmap={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),closed:0,close(){this.closed++;}};decoded.push(bitmap);return bitmap;
 };
 const state={decoded,respond:undefined,requests:[]};
 globalThis.fetch=async(url,options)=>{
  const address=typeof url==='string'?url:url.url;
  if(address.startsWith('blob:'))return before.fetch(url,options);
  state.requests.push({url:address,signal:options?.signal});
  if(state.respond)return state.respond(address,options);
  throw new Error(`Unexpected request: ${address}`);
 };
 try{return await run(state)}finally{globalThis.fetch=before.fetch;for(const name of ['self','createImageBitmap'])if(before[name]===undefined)delete globalThis[name];else globalThis[name]=before[name];}
}
async function family(){
 const entries=await Promise.all(CUTES_MODELS.map(async id=>[id,await parseCutesAsset(toBuffer(files.get(id)))]));
 return createCutesFamily(new Map(entries));
}
function resources(asset){const values=[];asset.scene.traverse(object=>{if(object.isSkinnedMesh){values.push(object.geometry,object.material,object.material.map);}});return[...new Set(values)];}

test('the shipped family retains the real source mesh topology, skin weights, UVs, materials, atlas and five authored clips',async()=>{
 assert.equal(manifest.creator,'J-Toastie');assert.equal(manifest.license,'CC-BY-3.0');assert.match(manifest.atlasCredit,/Kay Lousberg/u);
 assert.ok(manifest.models.reduce((sum,model)=>sum+model.bytes,0)<1_700_000);
 await environment(async state=>{
  for(const source of manifest.models){
   const bytes=files.get(source.id);assert.equal(hash(bytes),source.sha256);assert.equal(bytes.length,source.bytes);
   const n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n));assert.ok(json.images[0].bufferView>=0);assert.ok(!json.buffers[0].uri,'self-contained source GLB');
   const asset=await parseCutesAsset(toBuffer(bytes)),meshes=[];asset.scene.traverse(object=>{if(object.isSkinnedMesh)meshes.push(object);});
   assert.equal(meshes.length,2);assert.equal(asset.animations.length,5);assert.deepEqual(asset.animations.map(clip=>clip.name),source.clips.map(clip=>clip.name));
   for(const [i,mesh]of meshes.entries()){
    assert.equal(mesh.geometry.attributes.position.count,source.meshes[i].vertices);assert.equal(mesh.geometry.index.count/3,source.meshes[i].triangles);assert.equal(mesh.material.name,source.materialNames[0]);assert.ok(mesh.material.map);
    for(const name of ['position','normal','uv','skinIndex','skinWeight'])assert.ok([...mesh.geometry.attributes[name].array].every(Number.isFinite),`${source.id}: ${name}`);
    const weights=mesh.geometry.attributes.skinWeight;for(let j=0;j<weights.count;j++)assert.ok(Math.abs(weights.getX(j)+weights.getY(j)+weights.getZ(j)+weights.getW(j)-1)<.001);
   }
   const owner=createCutesFamily(new Map(CUTES_MODELS.map(id=>[id,asset])));owner.dispose();owner.dispose();
  }
  assert.equal(state.requests.length,0);assert.equal(state.decoded.length,6);assert.ok(state.decoded.every(bitmap=>bitmap.width===1024&&bitmap.height===1024&&bitmap.closed===1));
 });
});

test('visitor and residents keep distinct actual silhouettes and independent skeletons while Ivan adds unbranded accessories',async()=>environment(async()=>{
 const library=await family(),kit=createArtKit(new THREE.Scene()),actors=Object.keys(CUTES_VARIANTS).map(variant=>createCutesCharacter(kit,library,{variant,phase:.12}));
 try{
  const visitor=actors[0],ivan=actors[1];
  assert.ok(actors.every(actor=>actor.source==='cutes'&&actor.isCutes));assert.ok(ivan.avatar.getObjectByName('Ivan-portrait-accessories'));assert.equal(ivan.avatar.name,'Ivan');
  const meshes=actor=>{const values=[];actor.avatar.traverse(object=>{if(object.isSkinnedMesh)values.push(object);});return values;};
  assert.notEqual(meshes(actors[2])[1].geometry,meshes(actors[3])[1].geometry,'different authored resident geometry');
  assert.equal(meshes(visitor)[1].geometry,library.get('visitor').scene.getObjectByName('Cube003').geometry,'untouched visitor vertex buffer borrowed');
  assert.notEqual(meshes(visitor)[0].skeleton,meshes(ivan)[0].skeleton);assert.notEqual(visitor.head,ivan.head);assert.notEqual(meshes(visitor)[1].material,meshes(ivan)[1].material);
  const custom=meshes(ivan).find(mesh=>mesh.geometry.attributes.cutesAccent);assert.ok(custom);assert.deepEqual(custom.geometry.attributes.uv.array,meshes(visitor)[1].geometry.attributes.uv.array,'portrait retains original UV coordinates');assert.ok(custom.material.map===meshes(visitor)[1].material.map,'portrait retains original atlas');
  const accents=custom.geometry.attributes.cutesAccent;assert.ok([...Array(accents.count)].some((_,i)=>accents.getW(i)===1));assert.ok([...Array(accents.count)].some((_,i)=>accents.getW(i)===0),'only garment vertices recoloured');
  for(const actor of actors){actor.avatar.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(actor.avatar);assert.ok(box.min.y>-.001&&box.max.y<2.8,'floor-safe compact character');}
  const before=actors[3].head.quaternion.clone();for(let i=0;i<40;i++)ivan.motion.update(1/60,{...idle,speed:2,waving:true});assert.deepEqual(actors[3].head.quaternion.toArray(),before.toArray());
 }finally{actors.forEach(actor=>actor.dispose());library.dispose();kit.dispose();}
}));

test('source locomotion remains in-place and waving preserves the actual walking feet',async()=>environment(async()=>{
 const library=await family(),kit=createArtKit(new THREE.Scene()),one=createCutesCharacter(kit,library),two=createCutesCharacter(kit,library);
 try{
  const root=one.avatar.getObjectByName('CORE'),origin=root.position.clone();
  assert.ok(cutesClips(library.get('visitor').animations).every(clip=>clip.tracks.every(track=>track.name!=='CORE.position')));
  for(let i=0;i<60;i++){one.motion.update(1/60,{...idle,speed:2,waving:true});two.motion.update(1/60,{...idle,speed:2});}
  for(const name of ['FootL','FootR']){assert.deepEqual(one.avatar.getObjectByName(name).position.toArray(),two.avatar.getObjectByName(name).position.toArray());assert.deepEqual(one.avatar.getObjectByName(name).quaternion.toArray(),two.avatar.getObjectByName(name).quaternion.toArray());}
  assert.ok(one.avatar.getObjectByName('HandR').position.y>two.avatar.getObjectByName('HandR').position.y+.006,'actual rig hand greets at head level');
  one.motion.update(.016,{...idle,y:.2,vy:4});assert.equal(one.motion.state,'jumpStart');one.motion.update(.016,{...idle,y:.8,vy:-2});assert.equal(one.motion.state,'jumpAir');one.motion.update(.016,idle);assert.equal(one.motion.state,'land');assert.deepEqual(root.position.toArray(),origin.toArray());
  const foot=one.avatar.getObjectByName('FootL').position.clone(),body=one.avatar.getObjectByName('Body'),standing=body.position.y;one.posture(1);assert.ok(body.position.y<standing-.001);assert.deepEqual(one.avatar.getObjectByName('FootL').position.toArray(),foot.toArray());one.posture(0);assert.equal(body.position.y,standing);
 }finally{one.dispose();two.dispose();library.dispose();kit.dispose();}
}));

test('real animation blending is travel-driven, frame-rate independent, and stable for reduced motion',async()=>environment(async()=>{
 const library=await family(),results=[];
 try{for(const rate of [30,60,120]){
  const {clone}=await import('three/examples/jsm/utils/SkeletonUtils.js'),model=clone(library.get('visitor').scene),motion=createCutesMotion(model,library.get('visitor').animations);
  for(let i=0;i<rate/2;i++)motion.update(1/rate,{...idle,speed:4.2});const running=motion.snapshot();motion.update(1/rate,idle);assert.ok(motion.snapshot().run<running.run&&motion.snapshot().run>0);
  for(let i=1;i<rate/2;i++)motion.update(1/rate,idle);results.push(motion.snapshot());motion.update(0,{...idle,reduced:true});const pose=model.getObjectByName('Head').quaternion.clone();for(let i=0;i<60;i++)motion.update(1/60,{...idle,reduced:true});assert.ok(pose.angleTo(model.getObjectByName('Head').quaternion)<1e-6);
  const stopped=motion.snapshot().stride;for(let i=0;i<60;i++)motion.update(1/60,idle);assert.equal(motion.snapshot().stride,stopped,'blocked movement never advances a walking cycle');motion.dispose();
 }
 for(const sample of results)assert.ok(Math.abs(sample.idle-results[0].idle)<1e-6);
 }finally{library.dispose();}
}));

test('head sockets retain seasonal hats and actor removal never frees shared source resources',async()=>environment(async()=>{
 const library=await family(),kit=createArtKit(new THREE.Scene()),actor=createCutesCharacter(kit,library),other=createCutesCharacter(kit,library),asset=library.get('visitor'),owned=resources(asset),released=new Map(owned.map(resource=>[resource,0]));
 owned.forEach(resource=>resource.addEventListener('dispose',()=>released.set(resource,released.get(resource)+1)));
 assert.equal(actor.hatSocket.parent,actor.head);const hats=['everyday','thanksgiving','christmas','halloween','birthday'];
 for(const id of hats){actor.hats.set(id);actor.avatar.updateMatrixWorld(true);const visible=actor.hatSocket.children.filter(value=>value.visible);assert.equal(visible.length,1);const bounds=new THREE.Box3().setFromObject(visible[0]);assert.ok(bounds.min.y>1.6&&bounds.max.y<3.1,`${id} sits on the supplied head`);}
 const counts=[kit.geometries.length,kit.extras.length];for(let i=0;i<10;i++)for(const id of hats)actor.hats.set(id);assert.deepEqual([kit.geometries.length,kit.extras.length],counts,'hat wardrobe is cached');
 actor.dispose();actor.dispose();assert.ok([...released.values()].every(count=>count===0));other.dispose();library.dispose();assert.ok([...released.values()].every(count=>count===1));kit.dispose();
}));

test('required family loading propagates abort and HTTP failures without a procedural fallback or late resource leaks',async()=>environment(async state=>{
 const controller=new AbortController();state.respond=async url=>{const id=/\/([^/]+)\.glb$/u.exec(url)?.[1];return new Response(files.get(id),{status:200});};
 const library=await loadCutesFamily(controller.signal);assert.equal(state.requests.length,6);assert.ok(state.requests.every(request=>request.signal===controller.signal));library.dispose();
 state.respond=async url=>url.endsWith('generic-female.glb')?new Response('missing',{status:404}):new Response(files.get(/\/([^/]+)\.glb$/u.exec(url)[1]),{status:200});
 await assert.rejects(loadCutesFamily(controller.signal),/404/u);assert.ok(state.decoded.every(bitmap=>bitmap.closed===1),'all successful siblings are released after any required failure');
 controller.abort();await assert.rejects(loadCutesFamily(controller.signal),{name:'AbortError'});await assert.rejects(parseCutesAsset(new ArrayBuffer(4)),Error);
}));


test('the passenger ferry canopy clears the real visitor and every seasonal hat',async()=>environment(async()=>{
 const library=await family(),scene=new THREE.Scene(),a=createGlobeArt(scene),actor=createCutesCharacter(a.kit,library),ferry=createIslandFerry(a);
 try{
  actor.avatar.position.y=FERRY_RIDER_OFFSET;
  const canopy=ferry.root.getObjectByName('ferry canopy');assert.ok(canopy);ferry.update(0,false,true);assert.equal(canopy.material.opacity,.22,'roof cutaway keeps the passenger readable while aboard');assert.equal(canopy.material.depthWrite,false);ferry.update(0,false,false);assert.equal(canopy.material.opacity,1,'moored ferry restores its full roof');assert.equal(canopy.material.depthWrite,true);
  scene.updateMatrixWorld(true);const underside=new THREE.Box3().setFromObject(canopy).min.y;
  for(const id of ['everyday','thanksgiving','christmas','halloween','birthday']){
   actor.hats.set(id);actor.motion.update(0,{...idle,reduced:true});scene.updateMatrixWorld(true);
   const boxes=[];actor.avatar.traverseVisible(object=>{if(object.isMesh)boxes.push(new THREE.Box3().setFromObject(object))});
   const top=Math.max(...boxes.map(box=>box.max.y));assert.ok(top+.08<underside,`${id}: passenger top ${top} must clear canopy ${underside}`);
  }
 }finally{actor.dispose();library.dispose();a.dispose();}
}));
