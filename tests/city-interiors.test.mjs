import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createInterior} from '../src/experience/globe/interiors.ts';
import {buildCityRoomFurniture} from '../src/experience/globe/city-room-art.ts';
import {cityRoomBlocked,cityRoomHosts,cityRoomFurniture} from '../src/experience/globe/city-room-layout.ts';
import {freshWorkshop} from '../src/experience/globe/workshop.ts';

function canvas(run){const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=before}}

test('every furnished city interior has its own host, greeting turns and room-owned resources',()=>canvas(()=>{
 for(const id of Object.keys(cityRoomHosts)){
  const room=createInterior(id),host=cityRoomHosts[id],resident={x:2,z:.5,yaw:0,speed:0,greeting:0},player={x:0,z:1.1};
  try{
   assert.equal(room.host.avatar.name,host.name);assert.deepEqual(room.host.avatar.position.toArray(),[host.x,0,host.z]);assert.equal(room.ivan,undefined);assert.equal(room.cat,undefined);
   room.update(1/60,1,true,true,host.id,player,freshWorkshop(),0,resident);
   assert.ok(Math.abs(room.host.avatar.rotation.y-Math.atan2(player.x-host.x,player.z-host.z))<1e-8,'the actual indoor host turns towards the visitor');
   room.scene.traverse(part=>{if(part.isMesh)assert.ok([...part.geometry.getAttribute('position').array].every(Number.isFinite))});
  }finally{
   const resources=[...new Set([...room.art.kit.geometries,...room.art.kit.extras])];let released=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>released++));room.dispose();assert.equal(released,resources.length);assert.equal(room.host.avatar.parent,null);
  }
 }
}));

test('rendered shop furniture and visitor clearance use the same occupied floor shapes',()=>canvas(()=>{
 for(const id of Object.keys(cityRoomHosts)){
  const art=createGlobeArt(new THREE.Scene()),furniture=buildCityRoomFurniture(art,id),point=new THREE.Vector3();art.scene.updateMatrixWorld(true);
  try{
   assert.equal(furniture.solids.length,cityRoomFurniture[id].length);
   for(const part of furniture.solids){
    part.geometry.computeBoundingBox();const bounds=part.geometry.boundingBox;
    for(const x of [.05,.5,.95])for(const z of [.05,.5,.95]){
     point.set(THREE.MathUtils.lerp(bounds.min.x,bounds.max.x,x),0,THREE.MathUtils.lerp(bounds.min.z,bounds.max.z,z)).applyMatrix4(part.matrixWorld);assert.equal(cityRoomBlocked(id,point),true,part.name);
    }
   }
   const host=cityRoomHosts[id];assert.equal(cityRoomBlocked(id,host),false);assert.equal(cityRoomBlocked(id,host.arrival),false);
   for(const destination of [host.arrival,{x:0,z:3.4}])for(let i=0;i<=100;i++){
    const t=i/100,p={x:destination.x*t,z:2.7+(destination.z-2.7)*t};assert.equal(cityRoomBlocked(id,p),false,'the entry and greeting aisle stay open');
   }
  }finally{art.dispose()}
 }
}));

test('the new arcade and pottery studio offer distinct furniture without blocking the greeting aisle',()=>canvas(()=>{
 for(const [id,expected] of [['arcade',['arcade-cabinet-0','arcade-cabinet-1','arcade-cabinet-2','arcade-console']],['ceramics',['ceramics-wheel','ceramics-kiln','ceramics-counter']]]){
  const art=createGlobeArt(new THREE.Scene());
  try{
   const built=buildCityRoomFurniture(art,id),names=built.solids.map(part=>part.name);
   for(const name of expected)assert.ok(names.includes(name),name);
   for(const piece of cityRoomFurniture[id])assert.equal(cityRoomBlocked(id,piece),true,`${piece.name}: the visible furniture is solid`);
   const host=cityRoomHosts[id];for(let i=0;i<=200;i++){const t=i/200,p={x:host.arrival.x*t,z:2.8+(host.arrival.z-2.8)*t};assert.equal(cityRoomBlocked(id,p),false)}
   assert.equal(cityRoomBlocked(id,host),false);
  }finally{art.dispose()}
 }
}));
