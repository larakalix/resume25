import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import * as THREE from 'three';
import {archipelagoWorld as world} from '../src/experience/archipelago/compile.ts';
import {archipelagoRoadGeometry,buildArchipelagoArt} from '../src/experience/archipelago/art.ts';
import {loadKayKit} from '../src/experience/archipelago/kaykit-assets.ts';
import {loadBuildingModels} from '../src/experience/globe/building-models.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {loadJapaneseProps} from '../src/experience/archipelago/japanese-props.ts';
import propsManifest from '../public/models/japanese-props/manifest.json' with {type:'json'};
import {createHash} from 'node:crypto';
import {buildArchipelagoCliffs} from '../src/experience/archipelago/cliffs.ts';
import cliffSource from '../src/experience/globe/assets/layered-cliffs.json' with {type:'json'};

async function resources(run){
 const before={self:globalThis.self,document:globalThis.document,createImageBitmap:globalThis.createImageBitmap,fetch:globalThis.fetch};
 globalThis.self={URL:globalThis.URL};
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 globalThis.createImageBitmap=async blob=>{const bytes=Buffer.from(await blob.arrayBuffer());return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),close(){}};};
 globalThis.fetch=async(url,options)=>{if(String(url).startsWith('blob:'))return before.fetch(url,options);const path=String(url).split('?')[0];return new Response(await readFile(new URL(`../public${path}`,import.meta.url)));};
 try{const signal=new AbortController().signal,city=await loadBuildingModels(signal),kaykit=await loadKayKit(signal),props=await loadJapaneseProps(signal);try{return await run(city,kaykit,props)}finally{city.dispose();kaykit.dispose();props.dispose();}}finally{globalThis.fetch=before.fetch;for(const name of ['self','document','createImageBitmap'])if(before[name]===undefined)delete globalThis[name];else globalThis[name]=before[name];}
}

test('every road surface follows the compiled spherical deck heights and exact declared width, including seams',()=>{
 let triangles=0;
 for(const road of world.roads){
  const geometry=archipelagoRoadGeometry(world,road),positions=geometry.attributes.position;
  assert.equal(positions.count,road.points.length*4);assert.ok([...positions.array].every(Number.isFinite));
  for(let i=0;i<road.points.length;i++){
   const left=new THREE.Vector3().fromBufferAttribute(positions,i*4),right=new THREE.Vector3().fromBufferAttribute(positions,i*4+1);
   assert.ok(Math.abs(left.length()-world.RADIUS-road.points[i].height)<.00001,`${road.id}: left deck`);
   assert.ok(Math.abs(right.length()-world.RADIUS-road.points[i].height)<.00001,`${road.id}: right deck`);
   assert.ok(Math.abs(world.distance(world.mapAt(left),world.mapAt(right))-road.width)<.00001,`${road.id}: exact route width`);
  }
  const p=geometry.attributes.position,index=geometry.index;let up=0,down=0;
  for(let face=0;face<index.count-12;face+=24){
   const a=new THREE.Vector3().fromBufferAttribute(p,index.getX(face)),b=new THREE.Vector3().fromBufferAttribute(p,index.getX(face+1)),c=new THREE.Vector3().fromBufferAttribute(p,index.getX(face+2)),normal=b.clone().sub(a).cross(c.clone().sub(a));
   if(normal.length()<1e-8)continue;
   if(normal.dot(a)>0)up++;else down++;
  }
  assert.ok(up>0||road.length<.001);assert.equal(down,0,`${road.id}: top faces are visible from above`);
  triangles+=index.count/3;geometry.dispose();
 }
 assert.ok(triangles<30000,'compiled lanes remain inexpensive geometry');
});

test('native exterior geometry, UV atlas and source dimensions survive fitting and independent fade registration',async()=>resources(async(city,kaykit,props)=>{
 const scene=new THREE.Scene(),a=createGlobeArt(scene,{heightAt:world.heightAt}),art=buildArchipelagoArt(a,world,city,kaykit,props);
 try{
  for(const building of world.buildings){
   const root=scene.getObjectByName(`archipelago-building-${building.id}`),group=a.occlusionGroups.find(group=>group.id===building.id);assert.ok(root);assert.ok(group,'each building independently fades');assert.equal(root.userData.buildingId,building.id);
   assert.equal(root.userData.district,building.area);assert.ok(art.buildingRoots.includes(root));
   for(const visual of group.visuals){let parent=visual;while(parent&&parent!==root)parent=parent.parent;assert.equal(parent,root,'horizon culling owns all fade-batched details under the building root');}
   const native=[];root.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.sourceAsset===building.assetId)native.push(mesh);});assert.ok(native.length>0);
   for(const mesh of native){assert.ok(group.meshes.includes(mesh));assert.ok(!a.kit.staticMeshes.includes(mesh),'source geometry must not enter the procedural batching path');assert.ok(mesh.castShadow&&mesh.receiveShadow);}
   const sign=scene.getObjectByName(`sign-${building.id}`);assert.ok(sign);assert.equal(sign.userData.signText,building.name);
   if(building.assetId.startsWith('kay-')){
    const source=kaykit.get(building.assetId);assert.notEqual(native[0].geometry,source.geometry);assert.deepEqual(native[0].geometry.attributes.position.array,source.geometry.attributes.position.array);assert.deepEqual(native[0].geometry.attributes.uv.array,source.geometry.attributes.uv.array);assert.equal(native[0].material.map,source.material.map);
    const scale=building.width/kaykit.spec(building.assetId).width;assert.deepEqual(native[0].scale.toArray(),[scale,scale,scale]);assert.equal(native[0].material.name,source.material.name);
   }else{assert.deepEqual(native[0].geometry.attributes.position.array,city.get(building.assetId).attributes.position.array);assert.deepEqual(native[0].scale.toArray(),[building.width,building.width,building.width]);assert.ok(native[0].material.vertexColors);}
  }
  const surfaces=[];scene.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.compiledSurface)surfaces.push(mesh);});assert.ok(surfaces.length>=world.roads.length);assert.ok(scene.getObjectByName('surface-meadow-bridge'));assert.ok(scene.getObjectByName('parapet-meadow-bridge-1'));
  const posts=world.definition.placements.filter(placement=>/-(?:streetlight|pennant-post)-(?:west|east)$/.test(placement.id));assert.ok(posts.some(post=>post.id.includes('streetlight'))&&posts.some(post=>post.id.includes('pennant-post')));
  for(const placement of posts){const root=scene.getObjectByName(`placement-${placement.id}`),expected=world.localToMap(placement.at.frame,placement.at.x,placement.at.z);assert.ok(root,`${placement.id}: collision must not hide its own art`);assert.equal(root.userData.placementId,placement.id);assert.ok(root.children.length>0);const actual=world.mapAt(root.getWorldPosition(new THREE.Vector3()));assert.ok(world.distance(actual,expected)<1e-6,`${placement.id}: rendering and collision share one authored center`);assert.equal(world.blocked(actual),true,placement.id);assert.equal(world.wet(actual),false,placement.id);assert.ok(placement.solidRadius>0);}
  art.setWeather({wind:1.5,rain:.8});art.setDaylight(.1);art.update(1,false,{windmill:true,bell:1,campfire:true});art.update(2,true,{windmill:true,bell:1,campfire:false});
  assert.ok(a.kit.extras.every(material=>!material.color||[material.color.r,material.color.g,material.color.b].every(Number.isFinite)));
  const owned=[...new Set([...a.kit.geometries,...a.kit.extras])],counts=new Map(owned.map(value=>[value,0]));owned.forEach(value=>value.addEventListener('dispose',()=>counts.set(value,counts.get(value)+1)));a.dispose();assert.ok([...counts.values()].every(count=>count===1),'world owns every cloned art resource exactly once');
 }finally{scene.clear();}
}));

test('the extra Japanese scenery retains all six real source shapes and original linear colours under an 81KB budget',async()=>resources(async(city,kaykit,props)=>{
 const bytes=await readFile(new URL('../public/models/japanese-props/props.glb',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),propsManifest.sha256);assert.equal(bytes.length,propsManifest.bytes);assert.ok(bytes.length<81000);assert.equal(propsManifest.models.length,6);
 assert.deepEqual(Object.fromEntries(propsManifest.models.map(model=>[model.name,model.triangles])),{torii_gate:104,stone_lantern:82,sakura_tree:136,vending_machine:108,lantern_string:172,bamboo_cluster:268});
 for(const source of propsManifest.models){const geometry=props.get(source.name);assert.equal(geometry.index.count/3,source.triangles);for(const name of ['position','normal','color'])assert.ok([...geometry.attributes[name].array].every(Number.isFinite));assert.ok(geometry.attributes.color.array.some(value=>value!==1));}
 const a=createGlobeArt(new THREE.Scene(),{heightAt:world.heightAt});buildArchipelagoArt(a,world,city,kaykit,props);
 for(const placement of world.definition.placements.filter(place=>['market-torii','market-lantern-a','market-lantern-b','market-sakura','market-vending','market-bamboo','market-lantern-string'].includes(place.id))){assert.ok(a.occlusionGroups.some(group=>group.id===placement.id),'authored native scenery participates in transparency');}
 a.dispose();
}));

test('the new coastal placements use actual prepared cliff topology and never raise dry vertices above the walking terrain',()=>{
 const a=createGlobeArt(new THREE.Scene(),{heightAt:world.heightAt}),cliffs=buildArchipelagoCliffs(a,world);assert.ok(cliffs.sites.length>0);assert.ok(cliffs.triangles<2000);
 const expected=cliffs.sites.reduce((sum,site)=>sum+cliffSource.models.find(model=>model.name===site.sourceMesh).indices.length/3,0);assert.equal(cliffs.triangles,expected,'only source topology, no substitute rocky boxes');
 const positions=cliffs.mesh.geometry.attributes.position,p=new THREE.Vector3();for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i);const radius=p.length(),n=p.clone().normalize(),ground=world.terrainHeight(n);if(ground>world.WATER+.07)assert.ok(radius-world.RADIUS<=ground-.08,'dry cliff vertices are recessed under terrain');}
 a.dispose();
});
