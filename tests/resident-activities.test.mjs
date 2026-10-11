import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createResidentActivities,createWorldReactions,residentActivityProfiles} from '../src/experience/globe/resident-activities.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {createCityResidents} from '../src/experience/globe/city-residents.ts';
import {blocked} from '../src/experience/globe/layout.ts';
import {wet,distance,normalAt,RADIUS} from '../src/experience/globe/geography.ts';

const safe=point=>!wet(point)&&!blocked(point),far={x:0,z:17},idle={x:0,forward:0,run:false};
const cast=()=>residentActivityProfiles.map((profile,index)=>({...profile.route[0],id:profile.id,yaw:0,speed:0,stopped:false,phase:index,greeting:0}));
const position=actor=>({x:actor.x,z:actor.z});
function frameAt(point){const normal=normalAt(point.x,point.z),east={x:Math.cos(point.x/RADIUS),y:-Math.sin(point.x/RADIUS),z:0},south={x:-east.y*normal.z,y:east.x*-normal.z,z:east.x*normal.y-east.y*normal.x};return{right:east,forward:{x:-south.x,y:-south.y,z:-south.z}}}

test('Mira, Sol and Nico have distinct clear paths and reachable dry shelter stops',()=>{
 assert.equal(new Set(residentActivityProfiles.map(profile=>profile.activity)).size,3);
 for(const profile of residentActivityProfiles){assert.ok(safe(profile.route[profile.shelter]));for(let index=1;index<profile.route.length;index++){const a=profile.route[index-1],b=profile.route[index];for(let i=0;i<=100;i++){const t=i/100;assert.ok(safe({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}),`${profile.id}: lane ${index}`)}}}
});

test('activity routes move physically, respect scenery and hold safely at shelter during rain or night',()=>{
 for(const environment of [{rain:1,day:1,walking:false},{rain:0,day:0,walking:false}]){
  const director=createResidentActivities(safe),actors=cast(),starts=actors.map(position);
  for(let frame=0;frame<30*150;frame++){const before=actors.map(position);director.step(1/30,actors,far,null,false,environment);for(const [index,actor]of actors.entries()){assert.ok(safe(actor),actor.id);assert.ok(distance(actor,before[index])<=.72/30+1e-5);assert.ok(Number.isFinite(actor.yaw))}}
  for(const [index,actor]of actors.entries()){assert.ok(distance(actor,starts[index])>.2);assert.equal(director.activity(actor.id),'sheltering');const shelter=residentActivityProfiles[index].route[residentActivityProfiles[index].shelter];assert.ok(distance(actor,shelter)<.05)}
  const held=actors.map(position);for(let i=0;i<120;i++)director.step(1/30,actors,far,null,false,environment);assert.deepEqual(actors.map(position),held);
 }
 const blockedDirector=createResidentActivities(()=>false),actors=cast(),before=actors.map(position);for(let i=0;i<900;i++)blockedDirector.step(1/30,actors,far,null,false,{rain:0,day:1,walking:false});assert.deepEqual(actors.map(position),before);
});

test('conversations and visitor clearance outrank weather, while Calm holds autonomous movement',()=>{
 const director=createResidentActivities(safe),actors=cast(),mira=actors[0],start=position(mira);
 for(let i=0;i<600;i++)director.step(1/30,actors,{x:-3,z:10.8},'mira',false,{rain:1,day:0,walking:true});assert.deepEqual(position(mira),start);assert.equal(director.activity('mira'),'chatting');
 const held=actors.map(position);for(let i=0;i<600;i++)director.step(1/30,actors,far,null,true,{rain:1,day:0,walking:false});assert.deepEqual(actors.map(position),held);
 const player={x:mira.x,z:mira.z+.8};let travelled=0;for(let i=0;i<120;i++){const before=position(mira),gap=distance(mira,player);director.step(1/60,actors,player,null,false,{rain:1,day:0,walking:true});travelled+=distance(before,mira);assert.ok(distance(mira,player)>=gap-1e-6);assert.ok(safe(mira))}assert.ok(travelled>.5&&travelled<1.2,'yield is a short sidestep, not endless orbiting');assert.ok(distance(mira,player)>=1.1);
});

test('only the nearest available villager acknowledges a wave, with an eight-second cooldown and no Calm animation',()=>{
 const reactions=createWorldReactions(),actors=[{id:'near',x:1,z:10,greeting:0},{id:'far',x:3,z:10,greeting:0}],player={x:0,z:10};
 assert.equal(reactions.wave(0,player,actors,null),'near');assert.equal(actors[0].greeting,1.6);assert.equal(actors[1].greeting,0);assert.equal(reactions.wave(7.99,player,actors,null),null);assert.equal(reactions.wave(8,player,actors,'near'),null);actors[0].greeting=0;assert.equal(reactions.wave(8,player,actors,null,true),'near');assert.equal(actors[0].greeting,0);assert.equal(reactions.wave(15.99,player,actors,null),null);assert.equal(reactions.wave(16,player,actors,null),'near');
 assert.equal(reactions.workshop(false),null);assert.equal(reactions.workshop(true).duration,1.8);assert.equal(reactions.workshop(true),null);reactions.reset();assert.equal(reactions.wave(0,player,actors,null),'near');assert.equal(reactions.workshop(true,true).duration,0);
});

test('the mixed city cast keeps circulating after café merges without overlap or permanent queues',()=>{
 for(const hz of [30,60]){
  const city=createCityResidents(safe,()=>.5),director=createResidentActivities(safe),actors=city.states,player={x:70,z:18},lastMove=actors.map(()=>0),travel=actors.map(()=>0);city.delegate(director.ids);let yields=0;
  for(let frame=0;frame<hz*600;frame++){
   const before=actors.map(position);city.step(1/hz,player,null,false,true,false);director.step(1/hz,actors,player,null,false,{rain:0,day:1,walking:false});if(director.activity('city-nico')==='yielding')yields++;
   for(const [index,actor]of actors.entries()){const moved=distance(before[index],actor);travel[index]+=moved;if(moved>.001)lastMove[index]=frame/hz;if(frame%hz===0){assert.ok(safe(actor));for(const other of actors)if(other!==actor)assert.ok(distance(actor,other)>=.65-1e-6)}}
  }
  assert.ok(yields>0,'Nico makes room when returning from the café');for(const [index,actor]of actors.entries()){assert.ok(travel[index]>200,`${hz}Hz ${actor.id} keeps covering the street`);assert.ok(lastMove[index]>580,`${hz}Hz ${actor.id} is not stuck behind the café merge`)}
 }
});

test('V2 simulation owns activities, preserves actual planner completion and keeps indoor wave responses isolated',()=>{
 const sim=createGlobeSimulation();Object.assign(sim.body,far);sim.setEnvironment({rain:1,day:0});const initial=sim.walkers.filter(actor=>['mira','sol','city-nico'].includes(actor.id)).map(position);
 for(let i=0;i<600;i++)sim.step(1/30,idle,frameAt(sim.body));const actors=sim.walkers.filter(actor=>['mira','sol','city-nico'].includes(actor.id));assert.ok(actors.some((actor,index)=>distance(actor,initial[index])>.2));assert.ok(actors.every(actor=>safe(actor)));
 sim.visit('mira');assert.equal(sim.wave(),'mira');assert.equal(sim.wave(),null);sim.enter('workshop');assert.equal(sim.wave(),null);
 for(const action of ['shape','connect','preview'])sim.action('notebook',action);assert.equal(sim.objects.playTime,0);for(let i=0;i<3;i++)sim.action('notebook',`task-${i}`);assert.equal(sim.objects.playTime,1.8);for(let i=0;i<300;i++)sim.step(1/30,idle,frameAt(sim.body));assert.equal(sim.objects.playTime,1.8,'Patch waits until the visitor comes outside');sim.leave();sim.step(1/30,idle,frameAt(sim.body));assert.ok(sim.objects.playTime<1.8&&sim.objects.playTime>1.7);sim.reset();assert.equal(sim.objects.playTime,0);
});

test('live arrivals follow every activity lane and porch rather than an obsolete authored home',()=>{
 const sim=createGlobeSimulation();
 for(const profile of residentActivityProfiles){
  const actor=sim.walkers.find(person=>person.id===profile.id);
  for(let segment=1;segment<profile.route.length;segment++)for(let sample=0;sample<=8;sample++){
   const a=profile.route[segment-1],b=profile.route[segment],t=sample/8;Object.assign(actor,{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
   const target=sim.target(actor.id);assert.ok(target,`${actor.id}: segment ${segment}`);assert.deepEqual(position(target),position(actor));assert.ok(safe(target.arrival));assert.ok(distance(target.arrival,actor)<target.radius-.1);assert.ok([...sim.walkers,...sim.animals].every(other=>distance(target.arrival,other)>=.65));
   sim.visit(actor.id);assert.equal(sim.nearest(),actor.id);assert.ok(distance(sim.body,actor)<target.radius);assert.ok(safe(sim.body));
  }
 }
 const nico=sim.walkers.find(person=>person.id==='city-nico'),aya=sim.walkers.find(person=>person.id==='city-aya');Object.assign(nico,residentActivityProfiles[2].route[residentActivityProfiles[2].shelter]);const preferred=sim.target(nico.id).arrival;Object.assign(aya,preferred);const alternative=sim.target(nico.id);assert.ok(alternative);assert.ok(distance(alternative.arrival,aya)>=.65,'another actor cannot occupy the landing capsule');assert.ok(distance(alternative.arrival,nico)<alternative.radius);sim.visit(nico.id);assert.equal(sim.nearest(),nico.id);assert.ok(distance(sim.body,nico)<2.9,'travel stays at the live café visit');
});

test('Patch celebration receives its full active-world duration after an indoor return at30,60 and120Hz',()=>{
 for(const hz of [30,60,120]){
  const sim=createGlobeSimulation();sim.enter('workshop');for(const action of ['shape','connect','preview','task-0','task-1','task-2'])sim.action('notebook',action);
  for(let frame=0;frame<hz*4;frame++)sim.step(1/hz,idle);assert.equal(sim.objects.playTime,1.8,'indoor time does not consume an unseen reaction');sim.leave();
  for(let frame=0;frame<hz;frame++)sim.step(1/hz,idle);assert.ok(Math.abs(sim.objects.playTime-.8)<1e-10);for(let frame=0;frame<hz;frame++)sim.step(1/hz,idle);assert.equal(sim.objects.playTime,0);
  sim.action('notebook','task-2');sim.action('notebook','task-2');assert.equal(sim.objects.playTime,0,'finishing the same planner does not replay the reward');
 }
 const calm=createGlobeSimulation();calm.setReduced(true);for(const action of ['shape','connect','preview','task-0','task-1','task-2'])calm.action('notebook',action);assert.equal(calm.objects.playTime,0);
});
