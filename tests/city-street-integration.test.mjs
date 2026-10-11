import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {cityResidents} from '../src/experience/globe/city-residents.ts';
import {cityRoomHosts} from '../src/experience/globe/city-room-layout.ts';
import {buildings,targets,mapStops,blocked} from '../src/experience/globe/layout.ts';
import {roomLabels} from '../src/experience/globe/rooms.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
import {distance,spawn,wet} from '../src/experience/globe/geography.ts';
import {dialogueFor} from '../src/experience/globe/conversation.ts';
import {formatResumeDate} from '../src/utils/resume-date.ts';
import {homeLandingTargets,isHomeRoom} from '../src/experience/globe/home-layout.ts';
import {caveTargets} from '../src/experience/globe/wild-land.ts';
import {cityModelDoors} from '../src/experience/globe/city-model-specs.ts';

const idle={x:0,forward:0,run:false},source=JSON.parse(await readFile(new URL('../src/content/resume.json',import.meta.url),'utf8'));
const point=actor=>({x:actor.x,z:actor.z});
function tick(sim,seconds){for(let i=0;i<seconds*60;i++)sim.step(1/60,idle)}
function clear(point,label){assert.equal(wet(point),false,`${label}: arrival is dry`);assert.equal(blocked(point),false,`${label}: arrival is outside solid geometry`)}

test('all published interiors have safe doors, live room arrivals and independent exterior exits',()=>{
 const sim=createGlobeSimulation(),doors=targets.filter(t=>t.kind==='door'&&!t.room),transitions=targets.filter(t=>t.kind==='door'&&t.room),indoorBuildings=buildings.filter(b=>b.enter);
 assert.equal(new Set(doors.map(door=>door.interior)).size,doors.length,'every physical outside door has its own interior');
 assert.deepEqual([...new Set([...doors,...transitions].map(door=>door.interior))].sort(),Object.keys(roomLabels).sort(),'all published rooms are reachable by outside doors or explicit floor transitions');
 assert.deepEqual(transitions.map(door=>door.id).sort(),homeLandingTargets.map(door=>door.id).sort());
 assert.deepEqual(doors.filter(door=>!caveTargets.some(cave=>cave.id===door.id)).map(door=>door.interior).sort(),indoorBuildings.map(building=>building.enter).sort(),'source-model doors and actual caves remain separate entry types');
 assert.deepEqual(doors.filter(door=>caveTargets.some(cave=>cave.id===door.id)).map(door=>door.id).sort(),caveTargets.map(door=>door.id).sort());
 for(const building of indoorBuildings)assert.ok(cityModelDoors[building.cityModel],`${building.name}: an actual source door panel is measured`);
 for(const room of ['home','workshop','library',...Object.keys(cityRoomHosts)])assert.ok(doors.some(t=>t.interior===room),`${room}: its own exterior entry is preserved`);
 for(const door of doors){
  assert.ok(mapStops.includes(door.id));clear(door.arrival,door.id);sim.visit(door.id);assert.equal(sim.nearest(),door.id);sim.enter(door.interior);assert.equal(sim.inside,door.interior);assert.equal(sim.nearest(),`exit-${door.interior}`);assert.ok(roomWalkable(door.interior,sim.player()));
  for(const target of targets.filter(t=>t.room===door.interior)){
   sim.visit(target.id);const live=sim.target(target.id);assert.equal(sim.inside,door.interior);assert.equal(sim.nearest(),target.id);assert.ok(roomWalkable(door.interior,sim.player()));assert.ok(Math.hypot(sim.player().x-live.x,sim.player().z-live.z)<live.radius);assert.deepEqual(point(sim.body),door.arrival);
  }
  sim.leave();assert.equal(sim.inside,null);assert.deepEqual(point(sim.body),door.arrival);clear(sim.body,door.id);
 }
});

test('walking to every home staircase transports between floors and preserves the canonical outdoor home anchor',()=>{
 const exterior=targets.find(target=>target.kind==='door'&&!target.room&&target.interior==='home'),route=['home-up','studio-up','balcony-down','studio-down'];assert.ok(exterior);
 assert.deepEqual([...route].sort(),homeLandingTargets.map(target=>target.id).sort(),'the round trip exercises every staircase direction');
 for(const hz of [30,60,120]){
  const sim=createGlobeSimulation();sim.visit(exterior.id);sim.enter('home');
  for(const id of route){
   const stairs=targets.find(target=>target.id===id);assert.ok(stairs);assert.equal(sim.inside,stairs.room);
   for(let frame=0;frame<hz*8&&Math.hypot(sim.roomBody.x-stairs.arrival.x,sim.roomBody.z-stairs.arrival.z)>.08;frame++){
    const dx=stairs.arrival.x-sim.roomBody.x,dz=stairs.arrival.z-sim.roomBody.z,length=Math.hypot(dx,dz);
    sim.step(1/hz,{x:dx/length,forward:-dz/length,run:false});assert.ok(roomWalkable(stairs.room,sim.roomBody),`${id}: the approach respects furniture and stairs`);assert.deepEqual(point(sim.body),exterior.arrival);
   }
   sim.halt();assert.equal(sim.nearest(),id,`${hz}Hz: the physical approach selects the intended staircase`);assert.ok(Math.hypot(sim.roomBody.x-stairs.arrival.x,sim.roomBody.z-stairs.arrival.z)<=.08);
   sim.enter(stairs.interior,stairs.entry);assert.equal(sim.inside,stairs.interior);assert.ok(roomWalkable(stairs.interior,sim.roomBody));assert.deepEqual(point(sim.body),exterior.arrival);assert.ok(sim.discovered.has(exterior.id));
  }
  assert.equal(sim.inside,'home');sim.leave();assert.equal(sim.inside,null);assert.deepEqual(point(sim.body),exterior.arrival);clear(sim.body,'home staircase round trip');
  for(const room of Object.keys(roomLabels).filter(isHomeRoom)){
   sim.enter(room);assert.ok(roomWalkable(room,sim.roomBody));assert.deepEqual(point(sim.body),exterior.arrival);
   for(const target of targets.filter(target=>target.room===room)){sim.visit(target.id);assert.equal(sim.inside,room);assert.ok(roomWalkable(room,sim.roomBody));assert.equal(sim.nearest(),target.id);assert.deepEqual(point(sim.body),exterior.arrival)}
   sim.leave();assert.equal(sim.inside,null);assert.deepEqual(point(sim.body),exterior.arrival);clear(sim.body,`${room}: canonical home exit`);
  }
 }
});

test('city residents expose moving targets, stop for conversations and resume after the visitor leaves',()=>{
 for(const source of cityResidents){
  const sim=createGlobeSimulation(),actor=sim.walkers.find(person=>person.id===source.id),initial=point(actor);tick(sim,40);
  assert.ok(distance(actor,initial)>.1,`${source.name} has walked away from the starting position`);
  const live=sim.target(source.id);assert.deepEqual(point(live),point(actor));sim.visit(source.id);clear(sim.body,source.id);assert.equal(sim.nearest(),source.id);assert.ok(distance(sim.player(),actor)<live.radius);
  sim.step(1/60,idle);assert.equal(actor.stopped,true);const stopped=point(actor);sim.setEngaged(source.id);Object.assign(sim.body,spawn);tick(sim,5);assert.deepEqual(point(actor),stopped);assert.equal(actor.mode,'chatting');
  sim.setEngaged(null);tick(sim,35);assert.ok(distance(actor,stopped)>.1,`${source.name} resumes walking`);assert.equal(actor.stopped,false);
 }
});

test('entering a shop suspends the street residents without moving or discovering unrelated people',()=>{
 const sim=createGlobeSimulation();tick(sim,5);const before=cityResidents.map(person=>point(sim.walkers.find(actor=>actor.id===person.id)));
 sim.enter('cafe');const discovered=sim.discovered.size;tick(sim,8);assert.deepEqual(cityResidents.map(person=>point(sim.walkers.find(actor=>actor.id===person.id))),before);assert.equal(sim.discovered.size,discovered);assert.ok(sim.walkers.filter(person=>cityResidents.some(source=>source.id===person.id)).every(person=>person.speed===0));
});

test('street and shop dialogue uses valid travel destinations and unchanged source-backed professional answers',()=>{
 const hosts=[...cityResidents.map(person=>person.id),...Object.values(cityRoomHosts).map(host=>host.id)].map(id=>targets.find(target=>target.id===id));
 const profile={...source.profile,name:'Supplied name',headline:'Supplied role',summary:'A supplied profile summary.',email:'supplied@example.org'},current={id:'current-test',company:'Supplied company',role:'Supplied position',startDate:'2026-01',endDate:null},roles=[current,...source.experience],groups=[...source.skillGroups,{id:'supplied-tools',label:'Supplied tools',items:['Tool one','Tool two']}],before=JSON.stringify({profile,roles,groups});
 for(const host of hosts){
  assert.ok(host);const start=dialogueFor(host,'start',profile,roles,groups);assert.equal(start.speaker,host.name);assert.equal(start.fictional,true);assert.ok(start.text.length>30);
  if(!host.room)for(const room of ['cafe','bookshop'])assert.ok(start.choices.some(choice=>choice.action===`travel:${targets.find(target=>target.interior===room).id}`),'street residents offer both open shops');
  for(const choice of start.choices)if(choice.action?.startsWith('travel:')){const destination=targets.find(target=>target.id===choice.action.slice(7));assert.ok(destination);assert.equal(destination.kind,'door');assert.ok(['cafe','bookshop'].includes(destination.interior));}
  assert.equal(dialogueFor(host,'about',profile,roles,groups).detail,profile.summary);
  for(const [index,role] of roles.entries()){
   const answer=dialogueFor(host,`role:${index}`,profile,roles,groups);assert.equal(answer.text,`${role.role} at ${role.company}.`);assert.equal(answer.detail,`${formatResumeDate(role.startDate)} — ${role.endDate?formatResumeDate(role.endDate):'Present'}`);
  }
  for(const group of groups)assert.equal(dialogueFor(host,`group:${group.id}`,profile,roles,groups).text,`${group.label}: ${group.items.join(', ')}.`);
  const contact=dialogueFor(host,'contact',profile,roles,groups);assert.equal(contact.detail,profile.email);assert.ok(contact.choices.some(choice=>choice.href===`mailto:${profile.email}`));
 }
 const cityGuide=targets.find(target=>target.id==='city-square'),guide=dialogueFor(cityGuide,'start',profile,roles,groups);
 for(const room of ['cafe','bookshop'])assert.ok(guide.choices.some(choice=>choice.action===`travel:${targets.find(target=>target.interior===room).id}`));
 assert.equal(JSON.stringify({profile,roles,groups}),before);
});

test('reset restores the full street population, all-room discovery totals and local object state',()=>{
 const sim=createGlobeSimulation(),initial=cityResidents.map(source=>point(sim.walkers.find(actor=>actor.id===source.id)));tick(sim,12);
 for(const target of targets)sim.visit(target.id);assert.equal(sim.snapshot(false).discovered,sim.snapshot(false).total);assert.equal(sim.snapshot(false).total,targets.filter(target=>target.kind!=='exit').length);
 sim.action('patch','follow');sim.action('notebook','shape');sim.enter('bookshop');sim.reset();assert.equal(sim.inside,null);assert.equal(sim.discovered.size,0);assert.equal(sim.objects.following,false);assert.equal(sim.workshop.stage,0);assert.deepEqual(point(sim.body),spawn);assert.deepEqual(cityResidents.map(source=>point(sim.walkers.find(actor=>actor.id===source.id))),initial);assert.ok(sim.walkers.filter(actor=>cityResidents.some(source=>source.id===actor.id)).every(actor=>actor.encounters===0&&actor.speed===0));
});
