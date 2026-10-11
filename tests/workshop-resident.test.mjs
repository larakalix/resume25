import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorkshopResident,roomWalkable,ivanHome,homeWaypoints} from '../src/experience/globe/workshop-resident.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {targets} from '../src/experience/globe/layout.ts';
import {isHomeRoom} from '../src/experience/globe/home-layout.ts';
const exteriorDoor=room=>targets.find(target=>!target.room&&target.interior===(isHomeRoom(room)?'home':room));
const idle={x:0,forward:0,run:false},far={x:-3.2,z:-3.2};
function tick(resident,seconds,player=far,engaged=false,reduced=false,hz=60){for(let i=0;i<seconds*hz;i++)resident.step(1/hz,player,engaged,reduced)}
test('all randomized home route segments avoid the desk and sofa while other room furniture stays solid',()=>{
 for(const from of homeWaypoints)for(const to of homeWaypoints)for(let i=0;i<=100;i++){
  const p={x:from.x+(to.x-from.x)*i/100,z:from.z+(to.z-from.z)*i/100};assert.ok(roomWalkable('home',p));
 }
 for(const room of ['home','workshop'])for(const p of [{x:0,z:-2.2},{x:-2.8,z:1.7},{x:3.7,z:0},{x:NaN,z:0}])assert.equal(roomWalkable(room,p),false);
 for(const p of [{x:0,z:-1.8},{x:-1.8,z:.7},{x:-1.8,z:2.7}])assert.equal(roomWalkable('home',p),false,'the desk and sofa retain body clearance');
 assert.equal(roomWalkable('library',{x:1.4,z:1.2}),false);assert.equal(roomWalkable('library',{x:0,z:2.7}),true);
});
test('Ivan wanders with pauses and a measured walking gait, at bounded frame rates',()=>{
 for(const hz of [30,60,120]){
  const resident=createWorkshopResident(()=>.2);let moving=0,resting=0,total=0,previous={...resident.state};
  for(let i=0;i<hz*90;i++){
   resident.step(1/hz,far,false,false);const state=resident.state,travel=Math.hypot(state.x-previous.x,state.z-previous.z);total+=travel;
   assert.ok(travel<=.72/hz+1e-9);assert.ok(roomWalkable('home',state));assert.ok(Number.isFinite(state.yaw));
   if(state.speed>0){moving++;assert.ok(state.speed<=.7200001)}else resting++;previous={...state};
  }
  assert.ok(total>12);assert.ok(moving>hz*15);assert.ok(resting>hz*10);
 }
 const a=createWorkshopResident(()=>.05),b=createWorkshopResident(()=>.85);tick(a,20);tick(b,20);assert.notDeepEqual({x:a.state.x,z:a.state.z},{x:b.state.x,z:b.state.z});
});
test('a proximity greeting stops, turns and waves once, with hysteresis and reapproach',()=>{
 const resident=createWorkshopResident(()=>.2);tick(resident,5);const p={x:resident.state.x-.9,z:resident.state.z+.3},position={x:resident.state.x,z:resident.state.z};resident.step(.02,p,false,false);
 assert.equal(resident.state.encounters,1);assert.ok(resident.state.greeting>0);assert.equal(resident.state.stopped,true);assert.equal(resident.state.mode,'greeting');tick(resident,4,p);
 assert.deepEqual({x:resident.state.x,z:resident.state.z},position);assert.equal(resident.state.greeting,0);assert.equal(resident.state.encounters,1);assert.equal(resident.state.speed,0);
 assert.ok(Math.abs(Math.atan2(Math.sin(resident.state.yaw-Math.atan2(p.x-position.x,p.z-position.z)),Math.cos(resident.state.yaw-Math.atan2(p.x-position.x,p.z-position.z))))<.01);
 resident.step(.02,{x:position.x+2.5,z:position.z},false,false);assert.equal(resident.state.stopped,true);assert.equal(resident.state.encounters,1);
 resident.step(.02,{x:position.x+3,z:position.z},false,false);assert.equal(resident.state.stopped,false);const returned={x:resident.state.x,z:resident.state.z};resident.step(.02,p,false,false);assert.equal(resident.state.encounters,2);
 tick(resident,4,far,true);assert.equal(resident.state.mode,'chatting');assert.deepEqual({x:resident.state.x,z:resident.state.z},returned);
});
test('Calm and inactive rooms hold position, avoid ambient waves, and reset clears encounters',()=>{
 const resident=createWorkshopResident(()=>.2),start={...resident.state};tick(resident,20,far,false,true);assert.equal(resident.state.x,start.x);assert.equal(resident.state.z,start.z);
 tick(resident,1,{x:2,z:1},false,true);assert.equal(resident.state.encounters,1);assert.equal(resident.state.greeting,0);assert.equal(resident.state.speed,0);
 for(let i=0;i<300;i++)resident.step(1/60,far,false,false,false);assert.equal(resident.state.x,start.x);assert.equal(resident.state.z,start.z);assert.equal(resident.state.stopped,false);
 resident.step(100,far,false,false);assert.ok(Math.hypot(resident.state.x-start.x,resident.state.z-start.z)<=.72*.05+1e-9);const before={...resident.state};resident.step(NaN,far,false,false);resident.step(-1,far,false,false);assert.deepEqual(resident.state,before);
 resident.reset();assert.deepEqual(resident.state,start);
});
test('live target follows Ivan, direct arrivals stay safe, and visitor movement cannot cross him',()=>{
 const s=createGlobeSimulation();s.enter('home');Object.assign(s.roomBody,far);for(let i=0;i<1200;i++)s.step(1/60,idle);
 const target=s.target('ivan');assert.equal(target.room,'home');assert.equal(target.x,s.ivan.x);assert.equal(target.z,s.ivan.z);assert.ok(roomWalkable('home',target.arrival));assert.ok(Math.hypot(target.arrival.x-s.ivan.x,target.arrival.z-s.ivan.z)>.6);
 s.visit('ivan');assert.equal(s.inside,'home');assert.equal(s.nearest(),'ivan');s.step(.02,idle);assert.equal(s.ivan.encounters,1);assert.equal(s.ivan.stopped,true);
 const ivan={x:s.ivan.x,z:s.ivan.z};Object.assign(s.roomBody,{x:ivan.x-1,z:ivan.z});for(let i=0;i<60;i++){s.step(1/60,{...idle,x:1,run:true});assert.ok(Math.hypot(s.roomBody.x-s.ivan.x,s.roomBody.z-s.ivan.z)>=.6-1e-9)}
 assert.deepEqual({x:s.ivan.x,z:s.ivan.z},ivan);s.setEngaged('ivan');Object.assign(s.roomBody,far);for(let i=0;i<120;i++)s.step(1/60,idle);assert.deepEqual({x:s.ivan.x,z:s.ivan.z},ivan);assert.equal(s.ivan.mode,'chatting');
 s.leave();assert.deepEqual({x:s.body.x,z:s.body.z},exteriorDoor('home').arrival);const outside={x:s.ivan.x,z:s.ivan.z};for(let i=0;i<120;i++)s.step(1/60,idle);assert.deepEqual({x:s.ivan.x,z:s.ivan.z},outside);
 s.reset();assert.equal(s.ivan.encounters,0);assert.deepEqual({x:s.ivan.x,z:s.ivan.z},ivanHome);
});
test('every room arrival stays clear of Ivan on any route segment, and retains its target proximity',()=>{
 const s=createGlobeSimulation();
 for(const from of homeWaypoints)for(const to of homeWaypoints)for(let sample=0;sample<=8;sample++){
  Object.assign(s.ivan,{x:from.x+(to.x-from.x)*sample/8,z:from.z+(to.z-from.z)*sample/8});
  for(const target of targets.filter(t=>t.room)){
   s.visit(target.id);const p=s.player(),live=s.target(target.id);assert.equal(s.nearest(),target.id);assert.ok(roomWalkable(target.room,p),target.id);
   assert.ok(Math.hypot(p.x-live.x,p.z-live.z)<live.radius,target.id);
   assert.deepEqual({x:s.body.x,z:s.body.z},exteriorDoor(target.room).arrival,'direct room travel anchors the exterior minimap at its door');
   if(target.room==='home')assert.ok(Math.hypot(p.x-s.ivan.x,p.z-s.ivan.z)>=.6,target.id);
   for(const host of targets.filter(t=>t.room===target.room&&t.kind==='person'&&t.id!=='ivan'))assert.ok(Math.hypot(p.x-host.x,p.z-host.z)>=.55,target.id);
  }
  s.enter('home');assert.ok(roomWalkable('home',s.roomBody));assert.ok(Math.hypot(s.roomBody.x-s.ivan.x,s.roomBody.z-s.ivan.z)>=.6);
 }
 Object.assign(s.ivan,{x:1.7,z:-.9});s.visit('lamp');const start={...s.roomBody};for(let i=0;i<30;i++)s.step(1/60,{...idle,forward:-1});assert.ok(Math.hypot(s.roomBody.x-start.x,s.roomBody.z-start.z)>.3,'lamp arrival can walk away');
 s.reset();for(const target of targets.filter(t=>t.room&&t.id!=='ivan')){s.visit(target.id);assert.equal(s.roomBody.x,target.arrival.x);assert.equal(s.roomBody.z,target.arrival.z)}
});
test('the workshop keeps Theo and the workbench without a hidden Ivan collider or home roaming',()=>{
 const s=createGlobeSimulation();Object.assign(s.ivan,{x:1,z:1});s.enter('workshop');Object.assign(s.roomBody,{x:0,z:1});let closest=Infinity;
 for(let i=0;i<60;i++){s.step(1/60,{...idle,x:1});closest=Math.min(closest,Math.hypot(s.roomBody.x-s.ivan.x,s.roomBody.z-s.ivan.z))}
 assert.ok(closest<.1,'visitors can cross coordinates that only contain Ivan in his separate house');assert.deepEqual({x:s.ivan.x,z:s.ivan.z},{x:1,z:1});assert.equal(s.ivan.encounters,0);
 assert.equal(targets.find(t=>t.id==='theo').room,'workshop');assert.equal(targets.find(t=>t.id==='notebook').room,'workshop');
 s.visit('notebook');assert.equal(s.inside,'workshop');assert.equal(s.nearest(),'notebook');s.action('notebook','shape');assert.equal(s.workshop.stage,1);
});
