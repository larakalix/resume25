import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createTalkCamera,projectTalkAnchor,createTalkViewPublisher} from '../src/experience/globe/talk-camera.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {targets} from '../src/experience/globe/layout.ts';
import {normalAt} from '../src/experience/globe/geography.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
const idle={x:0,forward:0,run:false};
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const heading=(from,to,inside=false)=>{
 if(inside)return Math.atan2(to.x-from.x,to.z-from.z);
 const local=new THREE.Vector3().setFromMatrixPosition(frameAt(to.x,to.z)).applyMatrix4(frameAt(from.x,from.z).invert());
 return Math.atan2(local.x,local.z);
};

test('all four person conversations fit both participants in a stable side view on desktop and portrait',()=>{
 for(const person of targets.filter(target=>target.kind==='person'))for(const small of [false,true]){
  const indoor=!!person.room,n=normalAt(person.arrival.x,person.arrival.z),up=indoor?new THREE.Vector3(0,1,0):new THREE.Vector3(n.x,n.y,n.z);
  const player=indoor?new THREE.Vector3(person.arrival.x,0,person.arrival.z):new THREE.Vector3().setFromMatrixPosition(frameAt(person.arrival.x,person.arrival.z));
  const speaker=indoor?new THREE.Vector3(person.x,0,person.z):new THREE.Vector3().setFromMatrixPosition(frameAt(person.x,person.z));
  const originalPlayer=player.clone(),originalSpeaker=speaker.clone(),position=new THREE.Vector3(),look=new THREE.Vector3();
  createTalkCamera()(player,speaker,up,small,position,look,indoor);
  const camera=new THREE.PerspectiveCamera(small?56:50,small?375/812:1440/960,.14,420);camera.position.copy(position);camera.up.copy(up);camera.lookAt(look);camera.updateMatrixWorld();
  const p=projectTalkAnchor(player.clone().addScaledVector(up,1.98),camera),s=projectTalkAnchor(speaker.clone().addScaledVector(up,1.95),camera);
  assert.ok(p.visible&&s.visible,person.id);if(!indoor)assert.ok(p.x<s.x,`${person.id}: Ivan is left of speaker`);
  for(const point of [p,s]){assert.ok(point.x>10&&point.x<90,person.id);assert.ok(point.y>20&&point.y<50,`${person.id}: head stays above replies`)}
  for(const feet of [player,speaker])assert.ok(projectTalkAnchor(feet,camera).y<70,`${person.id}: feet are above the reply bar`);
  if(indoor){
   const walls=[new THREE.Box3(new THREE.Vector3(-4.2,0,-4.2),new THREE.Vector3(-4,3.1,4.2)),new THREE.Box3(new THREE.Vector3(4,0,-4.2),new THREE.Vector3(4.2,3.1,4.2)),new THREE.Box3(new THREE.Vector3(-4.2,0,-4.15),new THREE.Vector3(4.2,3.1,-3.95))];
   assert.ok(camera.position.z>4.2,'interior conversation looks through the open front');
   for(const actor of [player,speaker])for(const lift of [.05,1.95]){const point=actor.clone().addScaledVector(up,lift),line=point.clone().sub(camera.position),ray=new THREE.Ray(camera.position,line.clone().normalize());for(const wall of walls){const hit=ray.intersectBox(wall,new THREE.Vector3());assert.ok(!hit||hit.distanceTo(camera.position)>=line.length(),`${person.id}: a solid wall blocks the conversation`)}}
  }
  assert.ok(player.equals(originalPlayer)&&speaker.equals(originalSpeaker),'framing does not move actors');
 }
});
test('head projection rejects behind-camera and invalid points while staying finite',()=>{
 const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(0,1,6);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 assert.ok(projectTalkAnchor(new THREE.Vector3(0,1,0),camera).visible);
 assert.equal(projectTalkAnchor(new THREE.Vector3(0,1,10),camera).visible,false);
 assert.equal(projectTalkAnchor(new THREE.Vector3(1000,1,0),camera).visible,false);
 assert.deepEqual(projectTalkAnchor(new THREE.Vector3(NaN,0,0),camera),{x:50,y:40,visible:false});
});
test('talk projection updates are bounded, deduplicated, and clear exactly once',()=>{
 const seen=[],publisher=createTalkViewPublisher(value=>seen.push(value)),camera=new THREE.PerspectiveCamera(50,1,.1,100),player=new THREE.Vector3(-1,1,0),speaker=new THREE.Vector3(1,1,0);camera.position.set(0,1,6);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 for(let frame=0;frame<120;frame++){speaker.x=1+frame*.01;publisher.update(frame/120,camera,player,speaker)}
 assert.ok(seen.length>=10&&seen.length<=20);
 const before=seen.length;publisher.update(2,camera,player,speaker);const stable=seen.length;publisher.update(3,camera,player,speaker);assert.equal(seen.length,stable);assert.ok(stable<=before+1);
 publisher.clear();publisher.clear();assert.equal(seen.filter(value=>value===null).length,1);publisher.update(3,camera,player,speaker);assert.notEqual(seen.at(-1),null);
});
test('conversation participants face each other, hold position, and release walking on close',()=>{
 for(const id of ['mira','sol','theo','rue']){
  const sim=createGlobeSimulation();sim.visit(id);sim.setEngaged(id);const before={x:sim.player().x,z:sim.player().z};
  for(let frame=0;frame<80;frame++)sim.step(1/60,{x:1,forward:1,run:true});
  assert.deepEqual({x:sim.player().x,z:sim.player().z},before,id);
  const person=sim.target(id);assert.ok(angle(sim.player().yaw,heading(before,person,!!sim.inside))<.001,id);
  sim.setEngaged(null);sim.step(.05,{...idle,x:1});assert.ok(sim.player().x>before.x,id);
 }
 const calm=createGlobeSimulation();calm.setReduced(true);calm.visit('mira');calm.setEngaged('mira');const mira=calm.walkers.find(actor=>actor.id==='mira');assert.ok(angle(calm.body.yaw,heading(calm.body,mira))<1e-10);assert.ok(angle(mira.yaw,heading(mira,calm.body))<1e-10);
});
