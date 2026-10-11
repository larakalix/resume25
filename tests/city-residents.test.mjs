import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cityResidents,cityResidentRoute,createCityResidents} from '../src/experience/globe/city-residents.ts';
import {blocked} from '../src/experience/globe/layout.ts';
import {distance,wet} from '../src/experience/globe/geography.ts';
import {cityRoad,cityPaths} from '../src/experience/globe/city-district.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';

const far={x:0,z:15},safe=p=>!wet(p)&&!blocked(p);
const position=actor=>({x:actor.x,z:actor.z});
function tick(cast,seconds,player=far,engaged=null,reduced=false,hz=60,active=true){for(let i=0;i<seconds*hz;i++)cast.step(1/hz,player,engaged,reduced,active)}
function seeded(seed=467){let state=seed;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32}}

test('four distinct city residents and every pedestrian route segment stay on the clear central street',()=>{
 assert.equal(cityResidents.length,4);assert.equal(new Set(cityResidents.map(person=>person.id)).size,4);assert.equal(new Set(cityResidents.map(person=>person.name)).size,4);
 assert.ok(new Set(cityResidents.map(person=>person.coat)).size>=3);
 for(const source of cityResidents){assert.ok(safe(source),source.id);assert.ok(cityRoad(source),source.id)}
 for(const [i,start] of cityResidentRoute.entries()){
  const end=cityResidentRoute[(i+1)%cityResidentRoute.length];
  for(let sample=0;sample<=150;sample++){
   const t=sample/150,p={x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t};
   assert.ok(safe(p),`route ${i} at ${t}`);assert.ok(cityRoad(p),`route ${i} at ${t}`);
  }
 }
});

test('walkers pause, cover their loops and retain physical speed and separation at 30, 60 and 120Hz',()=>{
 for(const hz of [30,60,120]){
  const cast=createCityResidents(safe,seeded()),travel=cast.states.map(()=>0),walking=cast.states.map(()=>0),resting=cast.states.map(()=>0);
  for(let frame=0;frame<hz*150;frame++){
   const before=cast.states.map(position);cast.step(1/hz,far,null,false);
   for(const [i,actor] of cast.states.entries()){
    const step=distance(before[i],actor);travel[i]+=step;
    assert.ok(step<=.77/hz+1e-6,`${hz}Hz ${actor.id}: ${step}`);assert.ok(actor.speed<=.77001);assert.ok(Number.isFinite(actor.yaw));assert.ok(safe(actor));
    if(actor.speed>.01)walking[i]++;else resting[i]++;
    for(const other of cast.states)if(other!==actor)assert.ok(distance(actor,other)>=.7-1e-6,'walkers retain room for one another');
   }
  }
  for(const [i,actor] of cast.states.entries()){assert.ok(travel[i]>25,`${actor.id} makes progress`);assert.ok(walking[i]>hz*20);assert.ok(resting[i]>hz*3)}
 }
});

test('approaching a resident prompts one greeting, holds a conversation and resumes after leaving',()=>{
 const cast=createCityResidents(safe,()=>.3);tick(cast,7);const actor=cast.states[0],start=position(actor),player={x:actor.x+1,z:actor.z+.4};
 cast.step(.02,player,null,false);assert.equal(actor.stopped,true);assert.equal(actor.encounters,1);assert.ok(actor.greeting>0);assert.equal(actor.mode,'greeting');
 tick(cast,4,player);assert.deepEqual(position(actor),start);assert.equal(actor.greeting,0);assert.equal(actor.encounters,1);assert.equal(actor.speed,0);
 const near={x:actor.x,z:actor.z+3};cast.step(.02,near,null,false);assert.equal(actor.stopped,true,'the hold has a wider release distance');
 tick(cast,2,far,actor.id);assert.equal(actor.mode,'chatting');assert.deepEqual(position(actor),start);
 tick(cast,6,far);assert.equal(actor.stopped,false);assert.ok(distance(actor,start)>.1);
 cast.step(.02,{x:actor.x,z:actor.z+1},null,false);assert.equal(actor.encounters,2);
});

test('Calm and inactive streets hold the cast, bounded updates stay finite, and reset preserves state references',()=>{
 const cast=createCityResidents(safe,()=>.5),refs=[...cast.states],start=cast.states.map(actor=>({...actor}));
 tick(cast,20,far,null,true);assert.deepEqual(cast.states.map(position),start.map(position));assert.ok(cast.states.every(actor=>actor.speed===0&&actor.greeting===0));
 cast.step(.02,{x:cast.states[1].x,z:cast.states[1].z+1},null,true);assert.equal(cast.states[1].encounters,1);assert.equal(cast.states[1].greeting,0);
 tick(cast,15,far,null,false,60,false);assert.deepEqual(cast.states.map(position),start.map(position));
 tick(cast,8);const before=cast.states.map(position);cast.step(100,far,null,false);for(const [i,actor] of cast.states.entries())assert.ok(distance(actor,before[i])<=.77*.05+1e-6);
 const snapshot=JSON.stringify(cast.states);for(const delta of [NaN,-1,0,-Infinity])cast.step(delta,far,null,false);assert.equal(JSON.stringify(cast.states),snapshot);
 cast.reset();assert.deepEqual(cast.states,start);cast.states.forEach((actor,i)=>assert.equal(actor,refs[i]));
});

test('a blocked route yields without crossing geometry or a nearby visitor',()=>{
 const cast=createCityResidents(()=>false,()=>.4),start=cast.states.map(position);tick(cast,10);assert.deepEqual(cast.states.map(position),start);
 const moving=createCityResidents(safe,seeded());const actor=moving.states[0],player={x:actor.x,z:actor.z+1};tick(moving,10,player);
 assert.deepEqual(position(actor),position(cityResidents[0]));assert.equal(actor.stopped,true);assert.ok(distance(actor,player)>=.7);
});

test('residents step aside for a deliberate walk through the avenue without orbiting or teleporting',()=>{
 for(const hz of [30,60,120])for(const reduced of [false,true]){
  const cast=createCityResidents(safe,()=>.4),actor=cast.states[0],player={x:0,z:32.8};Object.assign(actor,{x:0,z:32});
  const start=position(actor);let moved=0;
  for(let frame=0;frame<hz*2;frame++){
   const before=position(actor),gap=distance(actor,player);cast.step(1/hz,player,null,reduced,true,true);const step=distance(before,actor);moved+=step;
   assert.ok(step<=.9/hz+1e-6);assert.ok(safe(actor));assert.ok(distance(actor,player)>=gap-1e-6,'the sidestep never pushes into the visitor');assert.ok(Math.abs(actor.x)<=4.2);
  }
  assert.ok(moved>.6&&moved<1.2,'only a short bounded sidestep is needed');assert.ok(Math.abs(actor.z-start.z)<.02,'a north/south approach clears sideways');assert.ok(distance(actor,player)>=1.1);
  const stopped=position(actor);for(let i=0;i<hz;i++)cast.step(1/hz,player,actor.id,reduced,true,true);assert.deepEqual(position(actor),stopped);assert.equal(actor.mode,'chatting','an explicit conversation still holds position');
 }
});

test('a sidestep respects scenery and standing visitors retain the ordinary greeting hold',()=>{
 const blockedCast=createCityResidents(()=>false,()=>.4),actor=blockedCast.states[0],player={x:actor.x,z:actor.z+.8},initial=position(actor);
 for(let i=0;i<60;i++)blockedCast.step(1/60,player,null,false,true,true);assert.deepEqual(position(actor),initial,'the visitor cannot push a resident through scenery');
 const cast=createCityResidents(safe,()=>.4),greeter=cast.states[0],near={x:greeter.x,z:greeter.z+.8},start=position(greeter);tick(cast,4,near);assert.deepEqual(position(greeter),start);assert.equal(greeter.stopped,true);assert.equal(greeter.encounters,1);
});

test('a retained sidestep can escape the avenue boundary instead of blocking a crouching visitor',()=>{
 for(const hz of [30,60,120]){
  // The resident factory captures the seeded sampler; restore the process default immediately.
  const previous=Math.random;let sim;
  try{Math.random=seeded(72);sim=createGlobeSimulation()}finally{Math.random=previous}
  Object.assign(sim.body,cityPaths[0][0]);sim.crouch(true);
  for(const goal of [53,29]){
   sim.halt();const direction=goal>sim.body.z?1:-1,limit=Math.ceil((Math.abs(goal-sim.body.z)/1.05+3)*hz);
   for(let frame=0;frame<limit&&(direction>0?sim.body.z<goal:sim.body.z>goal);frame++){
    const before=sim.walkers.map(position);sim.step(1/hz,{x:0,forward:-direction,run:false});
    assert.ok(safe(sim.body),'the visitor respects static collision');
    for(const [i,actor] of sim.walkers.entries())if(actor.id.startsWith('city-')){
     assert.ok(safe(actor));assert.ok(distance(before[i],actor)<=.9/hz+1e-6,'resident motion remains a physical step');
     assert.ok(Math.abs(actor.x)<=4.2&&actor.z>=30&&actor.z<=52.5,'yielding stays within the avenue');
    }
   }
   assert.ok(direction>0?sim.body.z>=goal:sim.body.z<=goal,`${hz}Hz: visitor reaches ${goal}, stopped at ${sim.body.z}`);
  }
 }
});
