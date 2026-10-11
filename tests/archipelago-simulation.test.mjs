import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Vector3} from 'three';
import {archipelagoWorld as world} from '../src/experience/archipelago/compile.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {tangentAxes} from '../src/experience/globe/surface-motor.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
import {targets as legacyTargets} from '../src/experience/globe/layout.ts';
import {spawn as legacySpawn} from '../src/experience/globe/geography.ts';

const idle={x:0,forward:0,run:false};
const rooms=['home','home-studio','home-balcony','workshop','library','cafe','bookshop','arcade','ceramics','crystal-cave','tide-cave'];
const point=value=>({x:value.x,z:value.z});
const frameAt=value=>{const axes=tangentAxes(value);return{forward:axes.south.negate(),right:axes.east}};
function toward(from,to){const up=new Vector3().copy(world.normalAt(from.x,from.z)),forward=new Vector3().copy(world.normalAt(to.x,to.z));forward.addScaledVector(up,-forward.dot(up)).normalize();return{forward,right:new Vector3().crossVectors(forward,up).normalize()}}
function tick(sim,seconds,hz=30){for(let frame=0;frame<Math.round(seconds*hz);frame++)sim.step(1/hz,idle,frameAt(sim.body))}
function safe(value,label){assert.equal(world.wet(value),false,`${label}: dry ground or a real deck`);assert.equal(world.blocked(value),false,`${label}: outside solid geometry`)}
function duckHealth(sim){
 for(const [index,duck] of sim.ducks.entries()){
  assert.ok(Object.values(duck).every(Number.isFinite));assert.ok(world.distance(duck,world.pond.center)<world.pond.radius-.2,'a duck stays in the new pond');
  assert.ok(world.terrainHeight(world.normalAt(duck.x,duck.z))<world.WATER-.18,'duck contact uses actual new pond depth');assert.equal(world.dockFootprint(duck),false,'ducks avoid the new dock');
  assert.ok(duck.speed>=0&&duck.speed<.59);assert.ok(duck.peck>=0&&duck.peck<=1);
  for(const other of sim.ducks.slice(index+1))assert.ok(world.distance(duck,other)>.53,'duck bodies remain separated');
 }
}

test('the real simulation starts on the new bridge and uses only the compiled target and resident registries',()=>{
 const sim=createGlobeSimulation(world),bridge=world.bridges.find(candidate=>candidate.id==='meadow-bridge');
 assert.deepEqual(point(sim.body),world.spawn);assert.ok(world.distance(sim.body,legacySpawn)>10,'the former meadow spawn is not reused');assert.ok(world.bridgeHeight(sim.body)!==null);assert.ok(bridge.points.some(value=>world.distance(sim.body,value)<.01));safe(sim.body,'new bridge spawn');
 assert.deepEqual(sim.walkers.map(actor=>actor.id).sort(),world.residents.map(actor=>actor.id).sort());
 for(const actor of sim.walkers){const source=world.residents.find(resident=>resident.id===actor.id);assert.deepEqual(point(actor),point(source));assert.ok(world.residentProfiles.some(profile=>profile.id===actor.id))}
 assert.equal(sim.walkers.some(actor=>actor.id==='ivan'),false,'Ivan remains the single home host');assert.equal(sim.target('ivan').room,'home');
 const oldOnly=legacyTargets.find(target=>!world.targets.some(current=>current.id===target.id));assert.ok(oldOnly);assert.equal(sim.target(oldOnly.id),undefined,'legacy-only places cannot leak into new-world travel');
 assert.equal(sim.snapshot(true).total,world.targets.filter(target=>target.kind!=='exit').length);sim.visit('city-square');sim.reset();assert.deepEqual(point(sim.body),world.spawn);assert.equal(sim.snapshot(true).discovered,0);
});

test('every compiled travel target has a usable landing and the real nearest-interaction prompt',()=>{
 const sim=createGlobeSimulation(world);
 for(const source of world.targets){
  const target=sim.target(source.id);assert.ok(target,source.id);sim.visit(source.id);
  assert.equal(sim.inside,target.room??null,source.id);assert.equal(sim.nearest(),source.id,`${source.id}: direct travel selects its own prompt`);
  if(target.room){assert.ok(roomWalkable(target.room,sim.player()),`${source.id}: clear room landing`);assert.deepEqual(point(sim.body),world.roomReturns[target.room],`${source.id}: new exterior anchor`)}
  else{safe(sim.body,source.id);assert.deepEqual(point(sim.body),target.arrival)}
  const snapshot=sim.snapshot(false);assert.equal(snapshot.near,source.id);assert.equal(snapshot.inside,target.room??null);
 }
 assert.equal(sim.snapshot(false).discovered,sim.snapshot(false).total,'all non-exit discoveries derive from the current registry');
});

test('all eleven preserved rooms enter through real doors and return to their new district coordinates',()=>{
 const sim=createGlobeSimulation(world),seen=new Set();
 for(const room of rooms){
  const exterior=world.targets.find(target=>!target.room&&target.kind==='door'&&target.interior===(room.startsWith('home-')?'home':room));assert.ok(exterior,room);
  sim.visit(exterior.id);assert.equal(sim.nearest(),exterior.id);safe(sim.body,`${room} approach`);sim.enter(exterior.interior,exterior.entry);seen.add(sim.inside);
  for(const id of room==='home-studio'?['home-up']:room==='home-balcony'?['home-up','studio-up']:[]){const stair=sim.target(id);sim.visit(id);assert.equal(sim.nearest(),id);sim.enter(stair.interior,stair.entry);seen.add(sim.inside)}
  assert.equal(sim.inside,room);assert.ok(roomWalkable(room,sim.player()));assert.deepEqual(point(sim.body),exterior.arrival);assert.deepEqual(point(sim.body),world.roomReturns[room]);
  for(let frame=0;frame<90;frame++){sim.step(1/30,{x:1,forward:-1,run:true});assert.ok(roomWalkable(room,sim.player()),`${room}: furniture and walls remain solid`)}
  sim.leave();assert.equal(sim.inside,null);assert.deepEqual(point(sim.body),world.roomReturns[room]);safe(sim.body,`${room} exterior return`);
 }
 assert.deepEqual([...seen].sort(),rooms.slice().sort());
 for(const id of ['home-up','studio-up','balcony-down','studio-down']){const stair=sim.target(id);sim.visit(id);sim.enter(stair.interior,stair.entry);assert.equal(sim.inside,stair.interior);assert.ok(roomWalkable(sim.inside,sim.player()));assert.deepEqual(point(sim.body),world.roomReturns.home)}
 sim.leave();assert.deepEqual(point(sim.body),world.roomReturns.home);
});

test('all six new resident routines move on safe lanes and report gait speed from actual displacement',()=>{
 const sim=createGlobeSimulation(world),travel=new Map(sim.walkers.map(actor=>[actor.id,0])),moving=new Map(sim.walkers.map(actor=>[actor.id,0]));
 for(let frame=0;frame<30*45;frame++){
  const before=new Map(sim.walkers.map(actor=>[actor.id,point(actor)]));sim.step(1/30,idle,frameAt(sim.body));
  for(const actor of sim.walkers){const span=world.distance(before.get(actor.id),actor);safe(actor,actor.id);travel.set(actor.id,travel.get(actor.id)+span);if(span>.0001){moving.set(actor.id,moving.get(actor.id)+1);assert.ok(actor.speed>.1,`${actor.id}: a moving resident drives the walking clip`);assert.ok(Math.abs(actor.speed-span*30)<.01,`${actor.id}: animation speed follows accepted ground travel`)}else assert.ok(actor.speed<.01,`${actor.id}: a resting resident has no sliding gait`)}
 }
 for(const profile of world.residentProfiles){assert.ok(travel.get(profile.id)>5,`${profile.id}: follows the new authored route`);assert.ok(moving.get(profile.id)>150,`${profile.id}: more than a momentary movement`)}
 sim.visit('mira');const actor=sim.walkers.find(person=>person.id==='mira'),before=point(actor);sim.setEngaged('mira');tick(sim,2);assert.deepEqual(point(actor),before);assert.equal(actor.speed,0);assert.equal(sim.residentActivity('mira'),'chatting');
 sim.setEngaged(null);sim.visit('maker-heights');tick(sim,12);assert.ok(world.distance(actor,before)>.5,'the previous activity resumes after the conversation');
});

test('drizzle sends every new resident to its own shelter, holds the pause and resumes its route',()=>{
 const sim=createGlobeSimulation(world);sim.setEnvironment({rain:1,day:1});let sheltered=false;
 for(let frame=0;frame<30*180;frame++){sim.step(1/30,idle,frameAt(sim.body));for(const actor of sim.walkers)safe(actor,`${actor.id} shelter route`);if(sim.walkers.every(actor=>sim.residentActivity(actor.id)==='sheltering')){sheltered=true;break}}
 assert.ok(sheltered,'all authored shelters must be reachable without a teleport');const resting=new Map(sim.walkers.map(actor=>[actor.id,point(actor)]));tick(sim,3);
 for(const actor of sim.walkers){const profile=world.residentProfiles.find(candidate=>candidate.id===actor.id);assert.ok(world.distance(actor,profile.route[profile.shelter])<.05);assert.deepEqual(point(actor),resting.get(actor.id));assert.equal(actor.speed,0)}
 sim.setEnvironment({rain:0,day:1});tick(sim,12);for(const actor of sim.walkers)assert.ok(world.distance(actor,resting.get(actor.id))>.5,`${actor.id}: clear weather resumes the remembered routine`);
});

test('a stationary visitor and opposing market traffic do not leave a permanent queue after the visitor leaves',()=>{
 const sim=createGlobeSimulation(world),marketIds=['city-nico','city-aya'];Object.assign(sim.body,world.localToMap('komorebi-market',0,2));safe(sim.body,'stationary market visitor');const visitor=point(sim.body);
 tick(sim,20);assert.deepEqual(point(sim.body),visitor,'villagers never push or relocate a stationary visitor');
 for(const id of marketIds){const actor=sim.walkers.find(person=>person.id===id);assert.equal(actor.speed,0);assert.ok(world.distance(actor,sim.body)>.65);safe(actor,id)}
 sim.visit('city-square');const travel=new Map(marketIds.map(id=>[id,0])),lastMove=new Map(marketIds.map(id=>[id,0]));
 for(let frame=0;frame<30*100;frame++){
  const before=new Map(sim.walkers.map(actor=>[actor.id,point(actor)]));sim.step(1/30,idle,frameAt(sim.body));
  for(const id of marketIds){const actor=sim.walkers.find(person=>person.id===id),span=world.distance(before.get(id),actor);travel.set(id,travel.get(id)+span);if(span>.001)lastMove.set(id,frame/30);safe(actor,id);for(const other of sim.walkers)if(other!==actor)assert.ok(world.distance(actor,other)>=.65-1e-5,'crossing residents retain body clearance')}
 }
 for(const id of marketIds){assert.ok(travel.get(id)>20,`${id}: resumes its actual town route`);assert.ok(lastMove.get(id)>90,`${id}: no permanent post or NPC blockage after a full circuit`)}
});

test('new pond feeding completes approach, feeding and return naturally on repeated visits',()=>{
 const sim=createGlobeSimulation(world);sim.visit('duck-pond');duckHealth(sim);
 for(let cycle=0;cycle<2;cycle++){
  const modes=new Set([sim.duckMode]);sim.action('duck-pond','feed');let fed=false,returned=false;
  for(let frame=0;frame<60*45;frame++){sim.step(1/60,idle,frameAt(sim.body));duckHealth(sim);modes.add(sim.duckMode);if(sim.duckMode==='feeding'){fed=true;assert.ok(sim.ducks.every(duck=>world.distance(duck,world.pond.feedingPoint)<2.4),'all ducks gather beside the actual feeding point')}if(fed&&sim.duckMode==='roaming'){returned=true;break}}
  assert.ok(fed,`meal ${cycle+1}: ducks reach the new feeding point`);assert.ok(returned,`meal ${cycle+1}: ducks return to roaming`);assert.deepEqual([...modes].sort(),['approaching','feeding','returning','roaming'].sort());
 }
 assert.equal(sim.objects.duckFood,2);sim.reset();assert.equal(sim.duckMode,'roaming');assert.equal(sim.objects.duckFood,0);duckHealth(sim);
});

test('Patch follows across the new connected route and actual bridges rather than old crossing goals',()=>{
 const sim=createGlobeSimulation(world);sim.prepareWorldRoutes();sim.visit('city-square');sim.action('patch','follow');const patch=sim.animals.find(actor=>actor.id==='patch'),crossed=new Set();let reached=false,total=0,previous=point(patch);
 for(let frame=0;frame<30*75;frame++){
  sim.step(1/30,idle,frameAt(sim.body));safe(patch,'Patch route');const span=world.distance(previous,patch);assert.ok(span<.13,'the companion walks continuously without teleporting');total+=span;previous=point(patch);
  for(const bridge of world.bridges)if(bridge.points.some(value=>world.distance(value,patch)<bridge.width/2))crossed.add(bridge.id);
  if(world.distance(patch,sim.body)<2.4){reached=true;break}
 }
 assert.ok(reached,'Patch reaches the visitor on the harbor island');assert.ok(total>40);assert.ok(crossed.has('west-bridge'));assert.ok(crossed.has('meadow-bridge'));
 sim.action('patch','follow');assert.equal(sim.objects.following,false);sim.reset();assert.deepEqual(point(patch),point(world.animals.find(animal=>animal.id==='patch')));
});

test('new imported building bounds and bridge parapets stop walking, running, jumping and crouching',()=>{
 const building=world.buildings.find(candidate=>candidate.id==='harbor-post'),bridge=world.bridges.find(candidate=>candidate.id==='meadow-bridge');assert.ok(building);assert.ok(bridge);
 for(const mode of ['walk','run','jump','crouch']){
  const sim=createGlobeSimulation(world);sim.setReduced(true);const start=world.buildingPoint(building,0,building.depth/2+1.2);safe(start,'building test approach');Object.assign(sim.body,start);if(mode==='jump')sim.jump();if(mode==='crouch')sim.crouch(true);
  const forward=toward(start,building);for(let frame=0;frame<60*3;frame++){sim.step(1/60,{...idle,forward:1,run:mode==='run'},forward);safe(sim.body,`${mode}: building collision`)}assert.ok(world.distance(start,sim.body)>.4,'the visitor reaches the facade instead of an unrelated obstruction');
  sim.reset();sim.setReduced(true);if(mode==='jump')sim.jump();if(mode==='crouch')sim.crouch(true);const across=toward(world.spawn,bridge.points.at(-1));for(let frame=0;frame<60*3;frame++){sim.step(1/60,{...idle,x:1,run:mode==='run'},across);safe(sim.body,`${mode}: bridge rail`);assert.ok(world.bridgeHeight(sim.body)!==null,'the visitor stays on the actual deck')}assert.ok(world.distance(world.spawn,sim.body)<bridge.halfWidth+.1,'the parapet prevents walking into the sea');
 }
});
