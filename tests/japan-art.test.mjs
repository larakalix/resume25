import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {buildJapan} from '../src/experience/globe/japan.ts';
import {createGlobeArt,frameAt} from '../src/experience/globe/art-kit.ts';
import {japanDistrict,japanGate,japanGatePosts,japanLanterns,japanGardenTrees,japanStops,japanPavingBounds,japanBuildings} from '../src/experience/globe/japan-district.ts';
import {normalAt,mapAt,heightAt,RADIUS} from '../src/experience/globe/geography.ts';
import {targets} from '../src/experience/globe/layout.ts';
import {dialogueFor} from '../src/experience/globe/conversation.ts';

function build(){
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 try{const a=createGlobeArt(new THREE.Scene());return{a,...buildJapan(a)}}finally{globalThis.document=previous}
}
function hit(mesh,point){const n=normalAt(point.x,point.z),normal=new THREE.Vector3(n.x,n.y,n.z),ray=new THREE.Raycaster(normal.clone().multiplyScalar(RADIUS+heightAt(point)+2),normal.negate());mesh.updateMatrixWorld(true);return ray.intersectObject(mesh)[0];}

test('the Japanese lanes and courtyard use one shallow terrain-following paving draw with no old-city replacement',()=>{
 const {a,pavement}=build(),positions=pavement.geometry.attributes.position,v=new THREE.Vector3();
 assert.ok(positions.count/3<20000,'paving stays within a small static budget');assert.ok(pavement.material.vertexColors);assert.equal(Array.isArray(pavement.material),false);
 for(let i=0;i<positions.count;i++){
  v.fromBufferAttribute(positions,i);const radius=v.length(),point=mapAt(v.normalize()),lift=radius-RADIUS-heightAt(point);
  assert.ok(lift>.022&&lift<.039);assert.ok(point.x>=japanPavingBounds.minX-1e-5&&point.x<=japanPavingBounds.maxX+1e-5);assert.ok(point.z>=japanPavingBounds.minZ-1e-5&&point.z<=japanPavingBounds.maxZ+1e-5);
 }
 for(const place of japanStops)assert.ok(hit(pavement,place.arrival),place.id);
 assert.ok(hit(pavement,{x:-33,z:-28}));assert.ok(hit(pavement,{x:-39,z:-25.7}));
 assert.ok(a.kit.geometries.includes(pavement.geometry));assert.ok(a.kit.extras.includes(pavement.material));a.dispose();
});

test('the gate matches shared post locations, its hanging lantern clears jumps and night lights stay instanced',()=>{
 const {a,gate,lanterns,update}=build(),inverse=frameAt(japanGate.x,japanGate.z).invert(),point=new THREE.Vector3(),matrix=new THREE.Matrix4();
 assert.equal(gate.name,'japan-lantern-gate');assert.ok(a.occlusionGroups.some(group=>group.id==='japan-lantern-gate'));
 for(const post of japanGatePosts){point.setFromMatrixPosition(frameAt(post.x,post.z)).applyMatrix4(inverse);assert.ok(Math.abs(point.x-post.localX)<.02);assert.ok(Math.abs(point.z-post.localZ)<.02)}
 lanterns.getMatrixAt(0,matrix);point.setFromMatrixPosition(matrix).applyMatrix4(inverse);assert.ok(point.y-.57*.9>3.25,'paper clears the jumping explorer');
 assert.equal(lanterns.count,japanLanterns.length+1);assert.ok(a.kit.instances.includes(lanterns));const version=lanterns.instanceMatrix.version;update(1);const day=lanterns.material.emissiveIntensity;update(0);assert.ok(lanterns.material.emissiveIntensity>day*10);assert.equal(lanterns.instanceMatrix.version,version);
 for(const [index] of japanGardenTrees.entries())assert.ok(a.occlusionGroups.some(group=>group.id===`japan-garden-${index}`));
 const batch=a.finish();assert.equal(batch.meshes.length,1);const owned=[...new Set([...a.kit.geometries,...a.kit.extras])];let disposed=0;owned.forEach(value=>value.addEventListener('dispose',()=>disposed++));a.dispose();assert.equal(disposed,owned.length);
});

test('the new quarter conversations offer real travel between the lane and courtyard and identify their inspirations',()=>{
 const empty={name:'A visitor',headline:'Developer',email:'visitor@example.test'},roles=[],skills=[];
 for(const [index,place] of japanStops.entries()){
  const target=targets.find(target=>target.id===place.id),dialogue=dialogueFor(target,'start',empty,roles,skills),travel=dialogue.choices.find(reply=>reply.action?.startsWith('travel:'));
  assert.equal(travel.action,`travel:${japanStops[index?0:1].id}`);assert.ok(targets.some(target=>target.id===travel.action.slice(7)));assert.ok(dialogue.choices.some(reply=>reply.href==='/resume'));assert.ok(dialogue.choices.some(reply=>reply.href==='/projects'));
  const references=dialogueFor(target,'inspiration',empty,roles,skills);assert.equal(references.choices.filter(reply=>reply.href?.startsWith('https://sketchfab.com/')).length,2);assert.ok(references.detail.includes('fictional'));
 }
 assert.ok(japanDistrict.name.length>0);assert.ok(japanBuildings.every(building=>building.style==='japanese'));
});
