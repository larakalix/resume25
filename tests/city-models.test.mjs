import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import data from '../src/experience/globe/assets/simple-houses.json' with {type:'json'};
import {parseCityModels,loadCityModels} from '../src/experience/globe/city-models.ts';
import {fittedCityModel} from '../src/experience/globe/city-model-specs.ts';
import {buildImportedCityBuilding} from '../src/experience/globe/city-model-art.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {meshOccluder} from '../src/experience/globe/occlusion.ts';

const bytes=await readFile(new URL('../public/models/city-street/simple-houses.glb',import.meta.url));
const buffer=()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
function canvas(run){const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=previous}}

test('the shipped asset retains all seven actual source meshes and their source triangle counts',async()=>{
 assert.equal(data.sourceSha256,'bebd082b26fed49eddc6948e9e9b82c04f105d88b8cf1072efcc70aab5a1bbcc');
 assert.equal(data.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(data.bytes,bytes.length);assert.equal(data.sourceColorsRetained,false);assert.equal(data.paletteSha256,null);
 assert.match(data.source,/simplepolygon\.itch\.io\/simple-houses-lowpoly-pack/u);assert.match(data.preparation,/authored replacement colours/u);
 assert.deepEqual(Object.fromEntries(data.models.map(model=>[model.name,model.triangles])),{Cube008:626,Cube010:1634,Cube004:2030,Cube015:3230,Cube012:1490,Cube013:1484,Cube009:2596});
 const library=await parseCityModels(buffer());let releases=0;
 for(const source of data.models){
  const geometry=library.get(source.name);geometry.addEventListener('dispose',()=>releases++);
  assert.equal(geometry.index.count/3,source.triangles);assert.equal(geometry.getAttribute('uv'),undefined);
  for(const name of ['position','normal','color'])assert.ok([...geometry.getAttribute(name).array].every(Number.isFinite),`${source.name} ${name}`);
  assert.ok(geometry.getAttribute('color').array.some(value=>value!==1),'the real model carries its replacement palette');
 }
 library.dispose();library.dispose();assert.equal(releases,7);assert.throws(()=>library.get('Cube008'),/disposed/u);
});

test('uniform model fitting supplies the exact render dimensions to collision and map layouts',async()=>{
 const library=await parseCityModels(buffer());
 try{for(const source of data.models)for(const [maxWidth,maxDepth] of [[5.2,4.8],[4.8,4.8],[4.4,4.8]]){
  const fitted=fittedCityModel(source.name,maxWidth,maxDepth),geometry=library.get(source.name),size=geometry.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(fitted.width);
  assert.ok(fitted.width<=maxWidth+1e-9&&fitted.depth<=maxDepth+1e-9);assert.ok(Math.abs(size.x-fitted.width)<1e-6&&Math.abs(size.y-fitted.height)<1e-6&&Math.abs(size.z-fitted.depth)<1e-6);
  assert.ok(Math.abs(fitted.height/fitted.width-source.height)<1e-10,'all source proportions remain uniform');
 }}finally{library.dispose()}
 assert.throws(()=>fittedCityModel('invented',5,5),/Unknown/u);for(const value of [0,-1,NaN,Infinity])assert.throws(()=>fittedCityModel('Cube008',value,4.8),/positive finite/u);
});

test('the renderer keeps source vertex colours, real surface occlusion and all resources under world ownership',async()=>{
 const library=await parseCityModels(buffer());
 canvas(()=>{
  const art=createGlobeArt(new THREE.Scene()),spec={id:'source-cafe',name:'Corner Café',x:0,z:36,cityModel:'Cube008',roof:'blue',style:'city',...fittedCityModel('Cube008',5.2,4.8)},source=library.get(spec.cityModel),sourcePositions=source.attributes.position.array.slice();
  const built=buildImportedCityBuilding(art,spec,library),group=art.occlusionGroups.find(value=>value.id===spec.id);art.scene.updateMatrixWorld(true);
  assert.ok(group.meshes.includes(built.imported),'the actual mesh participates in the building BVH');assert.ok(!art.kit.staticMeshes.includes(built.imported),'the procedural batch must not overwrite baked vertex colours');
  assert.equal(built.imported.userData.sourceMesh,'Cube008');assert.notEqual(built.imported.geometry,source);assert.deepEqual(built.imported.geometry.attributes.color.array,source.attributes.color.array);assert.equal(built.imported.material.vertexColors,true);
  assert.deepEqual(built.imported.scale.toArray(),[spec.width,spec.width,spec.width]);assert.equal(built.windows.length,0,'the asset is not covered by unrelated procedural window geometry');
  const occluder=meshOccluder(group),p=built.imported.geometry.attributes.position,index=built.imported.geometry.index,a=new THREE.Vector3().fromBufferAttribute(p,index.getX(0)),b=new THREE.Vector3().fromBufferAttribute(p,index.getX(1)),c=new THREE.Vector3().fromBufferAttribute(p,index.getX(2));
  const centre=a.clone().add(b).add(c).multiplyScalar(1/3).applyMatrix4(built.imported.matrixWorld),normal=b.sub(a).cross(c.sub(a)).normalize().transformDirection(built.imported.matrixWorld),ray=new THREE.Ray(centre.clone().addScaledVector(normal,3),normal.negate());
  assert.ok(occluder.intersects(ray,4),'a ray hitting an authored source surface fades the house');occluder.fade(.14);assert.equal(built.imported.material.opacity,.14);assert.equal(built.imported.material.depthWrite,false);assert.deepEqual(source.attributes.position.array,sourcePositions);occluder.fade(1);assert.equal(built.imported.material.opacity,1);occluder.dispose();
  library.dispose();assert.deepEqual(built.imported.geometry.attributes.position.array,sourcePositions,'rendered clones outlive the parsed source owner');
  const resources=[...new Set([...art.kit.geometries,...art.kit.extras])];let releases=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>releases++));art.dispose();assert.equal(releases,resources.length);
 });
 library.dispose();
});

test('required model loading passes abort signals and reports missing or incomplete assets',async()=>{
 const previous=globalThis.fetch,controller=new AbortController();let request;
 try{
  globalThis.fetch=async(url,options)=>{request={url,signal:options.signal};return{ok:true,arrayBuffer:async()=>buffer()}};
  const library=await loadCityModels(controller.signal);assert.equal(request.url,`/models/city-street/simple-houses.glb?v=${data.sha256.slice(0,12)}`);assert.equal(request.signal,controller.signal);library.dispose();
  globalThis.fetch=async()=>({ok:false,status:404});await assert.rejects(loadCityModels(controller.signal),/404/u);
  await assert.rejects(parseCityModels(new ArrayBuffer(4)),/Incomplete/u);controller.abort();await assert.rejects(parseCityModels(buffer(),controller.signal),{name:'AbortError'});
 }finally{globalThis.fetch=previous}
});
