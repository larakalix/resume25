import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import data from '../src/experience/globe/assets/lighthouse.json' with {type:'json'};
import {parseLighthouseAsset,loadLighthouseAsset} from '../src/experience/globe/lighthouse-asset.ts';
import {buildLighthouse} from '../src/experience/globe/lighthouse-art.ts';
import {lighthouse} from '../src/experience/globe/lighthouse.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {meshOccluder} from '../src/experience/globe/occlusion.ts';

const bytes=await readFile(new URL('../public/models/lighthouse/lighthouse.glb',import.meta.url));
const buffer=()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const hash=value=>createHash('sha256').update(value).digest('hex');
const assetUrl=`/models/lighthouse/lighthouse.glb?v=${data.sha256.slice(0,12)}`;

function glb(){
 const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8')),binStart=28+jsonLength;
 return{json,bin:bytes.subarray(binStart)};
}

/** Only local blob decoding is delegated; an unexpected HTTP request fails the test. */
async function imageEnvironment(run){
 const previous={fetch:globalThis.fetch,self:globalThis.self,createImageBitmap:globalThis.createImageBitmap,document:globalThis.document},decoded=[],requests=[];
 const environment={decoded,requests,respond:undefined,onDecode:undefined};
 globalThis.self={URL:globalThis.URL};
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 globalThis.createImageBitmap=async blob=>{
  const imageBytes=Buffer.from(await blob.arrayBuffer());assert.equal(hash(imageBytes),data.embeddedImage.sha256,'the real embedded PNG reaches the image decoder');
  const bitmap={width:imageBytes.readUInt32BE(16),height:imageBytes.readUInt32BE(20),closes:0,close(){this.closes++;}};decoded.push(bitmap);environment.onDecode?.();return bitmap;
 };
 globalThis.fetch=async(url,options)=>{
  const address=typeof url==='string'?url:url.url;
  if(address.startsWith('blob:'))return previous.fetch(url,options);
  requests.push({url:address,signal:options?.signal});
  if(environment.respond)return environment.respond(url,options);
  throw new Error(`Unexpected asset network request: ${address}`);
 };
 try{return await run(environment)}finally{
  globalThis.fetch=previous.fetch;
  for(const name of ['self','createImageBitmap','document'])if(previous[name]===undefined)delete globalThis[name];else globalThis[name]=previous[name];
 }
}

function watch(resources){
 const unique=[...new Set(resources)],counts=new Map(unique.map(resource=>[resource,0]));
 unique.forEach(resource=>resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1)));
 return()=>{for(const resource of unique)assert.equal(counts.get(resource),1,`${resource.type??resource.constructor.name} releases exactly once`)};
}

test('the shipped lighthouse preserves the exact source topology, original PNG and complete uniformly normalized bounds',async()=>{
 assert.equal(bytes.length,361668);assert.equal(data.bytes,bytes.length);assert.equal(hash(bytes),data.sha256);
 assert.equal(data.sourceSha256,'32173017e141d23e5e83245b36f5db075a753ed5d4136508880fceff013b8078');
 assert.equal(data.sha256,'da1316c54330756ba300459e3de5f8b24c6922bc06b124f1e2ace3e5cac8997f');
 assert.equal(data.sourceTextureRetained,true);assert.equal(data.sourceColorsRetained,true);assert.equal(data.creator,'CG ART Creation');assert.equal(data.license,'CC BY 3.0');assert.equal(data.source,'https://poly.pizza/m/c1-hm3Zs-8U');
 const {json,bin}=glb(),image=json.images[0],view=json.bufferViews[image.bufferView],png=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);
 assert.equal(image.mimeType,'image/png');assert.equal(png.length,279852);assert.equal(hash(png),'8379861579edb5ded4d05e330b515eff258612fcdeab5b1a712f689e3b96fc7c');assert.equal(hash(png),data.embeddedImage.sha256);assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1024);
 assert.deepEqual(json.materials,data.materials);assert.deepEqual(json.samplers,data.samplers);assert.deepEqual(json.textures,data.textures);assert.match(json.asset.copyright,/CG ART Creation.*CC BY 3\.0/u);
 assert.deepEqual(Object.fromEntries(data.models.map(model=>[model.name,model.triangles])),{lighthouse_glass:32,lighthouse_01:1642,lighthouse_light:156});assert.equal(data.models.reduce((sum,model)=>sum+model.triangles,0),1830);
 await imageEnvironment(async({decoded,requests})=>{
  const asset=await parseLighthouseAsset(buffer());
  try{
   assert.equal(requests.length,0);assert.equal(decoded.length,1);assert.equal(asset.meshes.length,3);
   let maxRadius=0;
   for(const source of data.models){
    const mesh=asset.meshes.find(mesh=>mesh.name===source.name),geometry=mesh.geometry,position=geometry.getAttribute('position');
    assert.equal(position.count,source.vertices);assert.equal(geometry.index.count/3,source.triangles);assert.equal(geometry.getAttribute('normal').count,position.count);assert.equal(geometry.getAttribute('uv').count,position.count);
    for(const name of ['position','normal','uv'])assert.ok([...geometry.getAttribute(name).array].every(Number.isFinite),`${source.name}: finite ${name}`);
    geometry.computeBoundingBox();assert.deepEqual(geometry.boundingBox.min.toArray(),source.bounds.min);assert.deepEqual(geometry.boundingBox.max.toArray(),source.bounds.max);
    for(let i=0;i<position.count;i++)maxRadius=Math.max(maxRadius,Math.hypot(position.getX(i),position.getZ(i)));
   }
   const bounds=new THREE.Box3().setFromObject(asset.scene),size=bounds.getSize(new THREE.Vector3());assert.deepEqual(size.toArray(),[data.bounds.width,1,data.bounds.depth]);assert.equal(bounds.min.y,0);assert.equal(bounds.min.x,-bounds.max.x);assert.equal(bounds.min.z,-bounds.max.z);assert.equal(maxRadius,data.bounds.horizontalRadius);
   const material=asset.meshes.find(mesh=>mesh.name==='lighthouse_01').material;assert.ok(material.map);assert.equal(material.map.image,decoded[0]);assert.equal(material.map.colorSpace,THREE.SRGBColorSpace);assert.equal(material.map.image.width,1024);assert.equal(material.map.image.height,1024);
  }finally{asset.dispose();asset.dispose()}
  assert.equal(decoded[0].closes,1);
 });
});

test('required lighthouse loading uses one versioned same-origin URL, propagates cancellation and rejects failed downloads',()=>imageEnvironment(async environment=>{
 environment.respond=async()=>({ok:true,arrayBuffer:async()=>buffer()});const controller=new AbortController(),asset=await loadLighthouseAsset(controller.signal);
 assert.deepEqual(environment.requests,[{url:assetUrl,signal:controller.signal}]);asset.dispose();asset.dispose();assert.equal(environment.decoded[0].closes,1);
 environment.respond=async()=>({ok:false,status:404});await assert.rejects(loadLighthouseAsset(controller.signal),/404/u);
 const decoded=environment.decoded.length;await assert.rejects(parseLighthouseAsset(new ArrayBuffer(4)),/Incomplete/u);controller.abort();await assert.rejects(parseLighthouseAsset(buffer(),controller.signal),{name:'AbortError'});assert.equal(environment.decoded.length,decoded,'pre-abort does not allocate decoded image resources');
}));

test('cancellation after texture decoding releases the partially loaded source geometry, materials, texture and image',()=>imageEnvironment(async environment=>{
 const controller=new AbortController(),geometryDispose=THREE.BufferGeometry.prototype.dispose,materialDispose=THREE.Material.prototype.dispose,textureDispose=THREE.Texture.prototype.dispose;let geometries=0,materials=0,textures=0;
 THREE.BufferGeometry.prototype.dispose=function(){geometries++;return geometryDispose.call(this)};
 THREE.Material.prototype.dispose=function(){materials++;return materialDispose.call(this)};
 THREE.Texture.prototype.dispose=function(){textures++;return textureDispose.call(this)};
 environment.onDecode=()=>controller.abort();
 try{await assert.rejects(parseLighthouseAsset(buffer(),controller.signal),{name:'AbortError'});assert.equal(geometries,3);assert.equal(materials,3);assert.equal(textures,1);assert.equal(environment.decoded.length,1);assert.equal(environment.decoded[0].closes,1)}finally{THREE.BufferGeometry.prototype.dispose=geometryDispose;THREE.Material.prototype.dispose=materialDispose;THREE.Texture.prototype.dispose=textureDispose}
}));

test('actual textured source geometry uses uniform fitting, live night materials and independent BVH fading with one resource owner',()=>imageEnvironment(async({decoded})=>{
 const asset=await parseLighthouseAsset(buffer()),scene=new THREE.Scene(),art=createGlobeArt(scene),sourceMaterials=asset.meshes.map(mesh=>mesh.material),sourceGeometry=asset.meshes.map(mesh=>mesh.geometry),body=asset.meshes.find(mesh=>mesh.name==='lighthouse_01'),lamp=asset.meshes.find(mesh=>mesh.name===data.beacon.mesh),glass=asset.meshes.find(mesh=>mesh.name==='lighthouse_glass'),texture=body.material.map,positions=body.geometry.attributes.position.array.slice(),releaseAsset=watch([...sourceMaterials,...sourceGeometry,texture]);let occluder;
 try{
  const built=buildLighthouse(art,asset),group=art.occlusionGroups.find(group=>group.id===lighthouse.id);
  assert.equal(built.root.userData.source,data.source);assert.equal(asset.scene.parent,built.root);assert.deepEqual(asset.scene.scale.toArray(),[lighthouse.scale,lighthouse.scale,lighthouse.scale]);assert.equal(body.material.map,texture);assert.deepEqual(body.geometry.attributes.position.array,positions);assert.ok(asset.meshes.every(mesh=>group.meshes.includes(mesh)));
  assert.ok(sourceGeometry.every(geometry=>!art.kit.geometries.includes(geometry)),'source geometry remains with the asset owner');assert.ok(sourceMaterials.every(material=>!art.kit.extras.includes(material)),'source materials remain with the asset owner');
  const beaconWorld=new THREE.Vector3().fromArray(data.beacon.center).multiplyScalar(lighthouse.scale);assert.ok(beaconWorld.distanceTo(built.pivot.position)<1e-10);
  built.update(0,true,1);assert.equal(built.beam.visible,false);assert.equal(lamp.material.emissiveIntensity,.08);const originalLamp=lamp.material;
  occluder=meshOccluder(group);const clonedMaterials=[...new Set(group.visuals.flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]))],releaseCopies=watch(clonedMaterials);
  assert.notEqual(lamp.material,originalLamp);assert.equal(body.material.map,texture,'the fading material borrows the original source texture');
  scene.updateMatrixWorld(true);const p=body.geometry.attributes.position,index=body.geometry.index;let ray;
  for(let triangle=0;triangle<index.count&&!ray;triangle+=3){const a=new THREE.Vector3().fromBufferAttribute(p,index.getX(triangle)),b=new THREE.Vector3().fromBufferAttribute(p,index.getX(triangle+1)),c=new THREE.Vector3().fromBufferAttribute(p,index.getX(triangle+2)),normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-10)continue;const center=a.add(b).add(c).multiplyScalar(1/3).applyMatrix4(body.matrixWorld);normal.normalize().transformDirection(body.matrixWorld);ray=new THREE.Ray(center.clone().addScaledVector(normal,2),normal.negate())}
  assert.ok(ray&&occluder.intersects(ray,3),'an actual authored surface participates in camera fading');occluder.fade(.14);assert.equal(body.material.opacity,.14);assert.equal(body.material.depthWrite,false);assert.ok(Math.abs(glass.material.opacity-.28*.14)<1e-12);
  built.update(4,false,0);assert.equal(built.beam.visible,true);assert.equal(lamp.material.emissiveIntensity,2.08);assert.equal(originalLamp.emissiveIntensity,.08,'night updates target the drawn material clone');assert.equal(glass.material.emissiveIntensity,.26);assert.equal(built.pivot.rotation.y,.96);
  built.update(50,true,0);const calmYaw=built.pivot.rotation.y;built.update(500,true,0);assert.equal(calmYaw,.4);assert.equal(built.pivot.rotation.y,calmYaw);assert.equal(built.beam.visible,true,'Calm keeps the intentionally selected night view');
  built.update(500,true,1);assert.equal(built.beam.visible,false);occluder.fade(1);assert.equal(body.material.opacity,1);assert.equal(body.material.depthWrite,true);assert.equal(glass.material.opacity,.28);occluder.dispose();occluder.dispose();releaseCopies();occluder=undefined;
  assert.equal(lamp.material,originalLamp);const releaseArt=watch([...art.kit.geometries,...art.kit.extras,...Object.values(art.kit.materials),art.kit.ramp]);built.dispose();built.dispose();releaseAsset();assert.equal(decoded[0].closes,1);art.dispose();releaseArt();assert.equal(decoded[0].closes,1,'the art owner does not close the borrowed source image again');
 }catch(error){occluder?.dispose();asset.dispose();art.dispose();throw error}
}));
