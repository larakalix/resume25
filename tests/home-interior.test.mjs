import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildHomeFurniture} from '../src/experience/globe/home-art.ts';
import {createInterior} from '../src/experience/globe/interiors.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
import {freshWorkshop} from '../src/experience/globe/workshop.ts';

function canvas(run){const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=before}}

test('Ivan has a furnished home of his own; Theo and Rue retain their separate rooms',()=>canvas(()=>{
 const home=createInterior('home'),workshop=createInterior('workshop'),library=createInterior('library');
 try{
  assert.equal(home.host,undefined);assert.equal(home.ivan.avatar.name,'Ivan');assert.equal(home.cat,undefined);
  assert.equal(workshop.host.avatar.name,'Theo');assert.equal(workshop.ivan,undefined);
  assert.equal(library.host.avatar.name,'Rue');assert.equal(library.ivan,undefined);assert.ok(library.cat);
  const resident={x:1.7,z:-.9,yaw:.3,speed:0,greeting:0},player={x:1,z:1.2};
  home.update(1/60,1,true,true,'ivan',player,freshWorkshop(),0,resident);
  assert.deepEqual(home.ivan.avatar.position.toArray(),[1.7,0,-.9]);assert.equal(home.ivan.avatar.rotation.y,.3);
  home.scene.traverse(part=>{if(part.isMesh)assert.ok([...part.geometry.getAttribute('position').array].every(Number.isFinite))});
  const resources=[...new Set([...home.art.kit.geometries,...home.art.kit.extras])];let releases=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>releases++));home.dispose();assert.equal(releases,resources.length);assert.equal(home.ivan.avatar.parent,null);
 }finally{workshop.dispose();library.dispose()}
}));

test('home furniture leaves the centre aisle clear and its occupied floor lies inside collision bounds',()=>{
 const art=createGlobeArt(new THREE.Scene()),furniture=buildHomeFurniture(art),point=new THREE.Vector3();art.scene.updateMatrixWorld(true);
 try{
  for(const part of [furniture.desk,furniture.sofa,furniture.bookcase]){
   part.geometry.computeBoundingBox();const box=part.geometry.boundingBox;
   for(const x of [.1,.5,.9])for(const z of [.1,.5,.9]){
    point.set(THREE.MathUtils.lerp(box.min.x,box.max.x,x),0,THREE.MathUtils.lerp(box.min.z,box.max.z,z)).applyMatrix4(part.matrixWorld);
    assert.equal(roomWalkable('home',{x:point.x,z:point.z}),false,part.name);
   }
  }
  for(const p of [{x:2,z:.5},{x:1.3,z:1.8},{x:0,z:2.7},{x:0,z:3.4}])assert.ok(roomWalkable('home',p),'the greeting and exit aisle remain open');
 }finally{art.dispose()}
});
