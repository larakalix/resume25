import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import data from '../src/experience/globe/assets/japanese-town.json' with {type:'json'};
import cityData from '../src/experience/globe/assets/simple-houses.json' with {type:'json'};
import {parseJapaneseModels,loadJapaneseModels} from '../src/experience/globe/japanese-models.ts';
import {fittedJapaneseModel} from '../src/experience/globe/japanese-model-specs.ts';
import {loadBuildingModels} from '../src/experience/globe/building-models.ts';
import {buildImportedCityBuilding} from '../src/experience/globe/city-model-art.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {meshOccluder} from '../src/experience/globe/occlusion.ts';
import {buildings,blocked,targets} from '../src/experience/globe/layout.ts';
import {japanPaths,japanStops} from '../src/experience/globe/japan-district.ts';
import {wet,distance} from '../src/experience/globe/geography.ts';

const bytes=await readFile(new URL('../public/models/japanese-town/town-buildings.glb',import.meta.url));
const cityBytes=await readFile(new URL('../public/models/city-street/simple-houses.glb',import.meta.url));
const buffer=(value=bytes)=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);
const japanese=buildings.filter(building=>building.style==='japanese');
function canvas(run){const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=previous}}

test('the Japanese catalog contains the real prepared creator models with intact source topology and colors',async()=>{
 assert.equal(data.bytes,bytes.length);assert.equal(data.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(data.sourceSha256,data.sourceArchive.sha256);assert.equal(data.sourceColorsRetained,true);
 assert.match(data.source,/reodesuxz\.itch\.io\/low-poly-japanese-town-pack/u);assert.equal(data.creator,'reodesuxz');
 const library=await parseJapaneseModels(buffer()),sources=new Map();let released=0;
 try{for(const model of data.models){
  assert.match(model.sourceSha256,/^[a-f0-9]{64}$/u);assert.ok(model.sourceFile.endsWith('.glb'));
  const source=sources.get(model.sourceFile);if(source){assert.equal(source.hash,model.sourceSha256);assert.equal(source.triangles,model.triangles)}else sources.set(model.sourceFile,{hash:model.sourceSha256,triangles:model.triangles});
  const geometry=library.get(model.name),position=geometry.getAttribute('position'),size=geometry.boundingBox.getSize(new THREE.Vector3());geometry.addEventListener('dispose',()=>released++);
  assert.equal((geometry.index?.count??position.count)/3,model.triangles);
  for(const attribute of ['position','normal','color'])assert.ok([...geometry.getAttribute(attribute).array].every(Number.isFinite),`${model.name}: ${attribute}`);
  assert.equal(geometry.getAttribute('color').count,position.count);assert.ok(geometry.getAttribute('color').array.some(value=>value!==1));
  assert.ok(Math.abs(size.x-model.width)<1e-6&&Math.abs(size.y-model.height)<1e-6&&Math.abs(size.z-model.depth)<1e-6);
  assert.ok(Math.abs(geometry.boundingBox.min.y)<1e-6);assert.ok(Math.abs(geometry.boundingBox.min.x+geometry.boundingBox.max.x)<1e-6);assert.ok(Math.abs(geometry.boundingBox.min.z+geometry.boundingBox.max.z)<1e-6);
  assert.ok(Math.abs(model.height-model.sourceDimensions.height/model.sourceDimensions.width)<1e-10);
  assert.ok(Math.abs(model.depth-model.sourceDimensions.depth/model.sourceDimensions.width)<1e-10);
 }}finally{library.dispose();library.dispose()}
 assert.equal(released,data.models.length);assert.throws(()=>library.get(data.models[0].name),/disposed/u);
 assert.ok(sources.size>1,'several actual building shapes are used');
});

test('uniform Japanese fitting retains the complete roof and porch footprint within width, depth and height caps',async()=>{
 const library=await parseJapaneseModels(buffer());
 try{for(const model of data.models)for(const [width,depth,height] of [[4.4,4.6,5.7],[3.2,3.7,3.4],[7.2,5,5.3]]){
  const fitted=fittedJapaneseModel(model.name,width,depth,height),actual=library.get(model.name).boundingBox.getSize(new THREE.Vector3()).multiplyScalar(fitted.width);
  assert.ok(fitted.width<=width+1e-9&&fitted.depth<=depth+1e-9&&fitted.height<=height+1e-9);
  assert.ok(Math.abs(actual.x-fitted.width)<1e-6&&Math.abs(actual.y-fitted.height)<1e-6&&Math.abs(actual.z-fitted.depth)<1e-6);
  assert.ok(Math.abs(fitted.height/fitted.width-model.height)<1e-10&&Math.abs(fitted.depth/fitted.width-model.depth)<1e-10,'the source is uniformly scaled');
 }}finally{library.dispose()}
 assert.throws(()=>fittedJapaneseModel('not-a-source-model',4,4),/Unknown/u);
 for(const invalid of [0,-1,NaN,Infinity])assert.throws(()=>fittedJapaneseModel(data.models[0].name,invalid,4),/positive/u);
});

test('every Komorebi facade renders its real source mesh with one lane-facing plaque and independent camera fading',async()=>{
 const library=await parseJapaneseModels(buffer());
 try{canvas(()=>{
  const art=createGlobeArt(new THREE.Scene()),occluders=[],builtModels=[];
  try{
   assert.ok(japanese.length>0);
   for(const house of japanese){
    const source=data.models.find(model=>model.name===house.cityModel);assert.ok(source,`${house.name} selects an actual Japanese source model`);
    const geometry=library.get(house.cityModel),built=buildImportedCityBuilding(art,house,library),group=art.occlusionGroups.find(item=>item.id===house.id);builtModels.push({built,positions:geometry.attributes.position.array.slice()});
    assert.equal(built.imported.userData.sourceMesh,house.cityModel);assert.equal(built.imported.userData.source,data.source);
    assert.notEqual(built.imported.geometry,geometry);assert.deepEqual(built.imported.geometry.attributes.color.array,geometry.attributes.color.array);assert.equal(built.imported.material.vertexColors,true);
    assert.deepEqual(built.imported.scale.toArray(),[house.width,house.width,house.width]);assert.ok(group.meshes.includes(built.imported));assert.ok(!art.kit.staticMeshes.includes(built.imported));
    const signs=[];built.root.traverse(part=>{if(part.userData.signText===house.name)signs.push(part)});assert.equal(signs.length,1,`${house.name}: no adjacent duplicate name signs`);
    const facing=house.modelFront??'front',sign=signs[0],normal=new THREE.Vector3(0,0,1).applyQuaternion(sign.quaternion);
    if(facing==='east'){assert.ok(sign.position.x>0&&normal.x>.99)}else if(facing==='west'){assert.ok(sign.position.x<0&&normal.x<-.99)}else assert.ok(sign.position.z>0&&normal.z>.99);
    art.scene.updateMatrixWorld(true);
    const face=sign.getObjectByName('building-sign-lettering'),bounds=new THREE.Box3().setFromBufferAttribute(face.geometry.getAttribute('position')),worldNormal=new THREE.Vector3(0,0,1).applyQuaternion(sign.getWorldQuaternion(new THREE.Quaternion()));let tested=0;
    for(const u of [-1,-.5,0,.5,1])for(const v of [-1,-.5,0,.5,1]){
     const point=new THREE.Vector3(bounds.max.x*u,bounds.max.y*v,.021).applyMatrix4(sign.matrixWorld),origin=point.clone().addScaledVector(worldNormal,10),hit=new THREE.Raycaster(origin,worldNormal.clone().negate(),0,30).intersectObject(built.imported)[0];
     if(hit){tested++;assert.ok(hit.distance>10.14,`${house.name}: the whole lettering plane clears source walls, stepped eaves and roof edges`)}
    }
    assert.ok(tested>0,`${house.name}: the plaque faces a source surface`);
    assert.equal(blocked(house),true,`${house.name}: the rendered body remains solid`);
    const occluder=meshOccluder(group);occluders.push(occluder);art.scene.updateMatrixWorld(true);
    const positions=built.imported.geometry.attributes.position,index=built.imported.geometry.index;let found=false;
    for(let triangle=0;triangle<(index?.count??positions.count)/3&&!found;triangle++){
     const at=corner=>index?index.getX(triangle*3+corner):triangle*3+corner,a=new THREE.Vector3().fromBufferAttribute(positions,at(0)),b=new THREE.Vector3().fromBufferAttribute(positions,at(1)),c=new THREE.Vector3().fromBufferAttribute(positions,at(2)),normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-12)continue;
     const center=a.add(b).add(c).multiplyScalar(1/3).applyMatrix4(built.imported.matrixWorld);normal.normalize().transformDirection(built.imported.matrixWorld);
     assert.ok(occluder.intersects(new THREE.Ray(center.clone().addScaledVector(normal,2),normal.negate()),3),`${house.name}: an authored surface participates in the BVH`);found=true;
    }
    assert.ok(found);occluder.fade(.14);assert.equal(built.imported.material.opacity,.14);assert.equal(built.imported.material.depthWrite,false);occluder.fade(1);assert.equal(built.imported.material.opacity,1);
   }
   library.dispose();for(const {built,positions} of builtModels)assert.deepEqual(built.imported.geometry.attributes.position.array,positions,'render clones outlive the parsed library');
  }finally{
   occluders.forEach(occluder=>occluder.dispose());const resources=[...new Set([...art.kit.geometries,...art.kit.extras])];let released=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>released++));art.dispose();assert.equal(released,resources.length);
  }
 })}finally{library.dispose()}
});

test('actual Japanese bounds keep destinations and connected lane centers clear at physical five-centimetre intervals',()=>{
 for(const stop of japanStops){assert.equal(wet(stop.arrival),false);assert.equal(blocked(stop.arrival),false);assert.ok(targets.some(target=>target.id===stop.id))}
 for(const line of japanPaths)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],steps=Math.max(1,Math.ceil(distance(a,b)/.05));
  for(let step=0;step<=steps;step++){const t=step/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};assert.equal(wet(p),false,`wet lane ${p.x},${p.z}`);assert.equal(blocked(p),false,`blocked lane ${p.x},${p.z}`)}
 }
});

test('Japanese loading uses a versioned same-origin asset and both model catalogs keep one disposable owner',async()=>{
 const previous=globalThis.fetch,controller=new AbortController(),requests=[];
 try{
  globalThis.fetch=async(url,options)=>{requests.push({url,signal:options.signal});return{ok:true,arrayBuffer:async()=>buffer(url.includes('japanese-town')?bytes:cityBytes)}};
  const library=await loadBuildingModels(controller.signal);assert.ok(library.get(data.models[0].name));assert.ok(library.get(cityData.models[0].name));
  assert.deepEqual(requests.map(request=>request.url).sort(),[`/models/city-street/simple-houses.glb?v=${cityData.sha256.slice(0,12)}`,`/models/japanese-town/town-buildings.glb?v=${data.sha256.slice(0,12)}`].sort());assert.ok(requests.every(request=>request.signal===controller.signal));
  library.dispose();library.dispose();assert.throws(()=>library.get(data.models[0].name),/disposed/u);assert.throws(()=>library.get(cityData.models[0].name),/disposed/u);
  globalThis.fetch=async()=>({ok:false,status:404});await assert.rejects(loadJapaneseModels(controller.signal),/404/u);
  await assert.rejects(parseJapaneseModels(new ArrayBuffer(4)),/Incomplete/u);controller.abort();await assert.rejects(parseJapaneseModels(buffer(),controller.signal),{name:'AbortError'});
 }finally{globalThis.fetch=previous}
});

test('a failed catalog load releases the other successfully parsed model pack',async()=>{
 const previousFetch=globalThis.fetch,originalDispose=THREE.BufferGeometry.prototype.dispose;let disposed=0;
 try{
  THREE.BufferGeometry.prototype.dispose=function(){disposed++;return originalDispose.call(this)};
  globalThis.fetch=async url=>url.includes('city-street')?{ok:false,status:503}:{ok:true,arrayBuffer:async()=>buffer()};
  await assert.rejects(loadBuildingModels(new AbortController().signal),/503/u);assert.ok(disposed>=data.models.length,'the successful Japanese pack is not leaked when the city load fails');
 }finally{globalThis.fetch=previousFetch;THREE.BufferGeometry.prototype.dispose=originalDispose}
});
