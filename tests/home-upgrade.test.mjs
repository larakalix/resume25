import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildHomeRoomShell} from '../src/experience/globe/home-art.ts';
import {buildIvanHomeExterior} from '../src/experience/globe/home-exterior.ts';
import {homeLandingTargets,homeRoomBlocked,isHomeRoom} from '../src/experience/globe/home-layout.ts';
import {buildings,targets,blocked} from '../src/experience/globe/layout.ts';
import {parseCityModels} from '../src/experience/globe/city-models.ts';
import {createInterior} from '../src/experience/globe/interiors.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
import {wet} from '../src/experience/globe/geography.ts';

function canvas(run){const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=before}}
const rooms=['home','home-studio','home-balcony'];

test('Ivan’s imported home has three real source window levels, an upper balcony and shallow front steps',async()=>{
 const bytes=await readFile(new URL('../public/models/city-street/simple-houses.glb',import.meta.url)),library=await parseCityModels(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const house=buildings.find(building=>building.enter==='home'),art=createGlobeArt(new THREE.Scene());
 try{
  assert.equal(house.cityModel,'Cube010');assert.equal(house.floors,3);
  const geometry=library.get(house.cityModel),position=geometry.getAttribute('position'),color=geometry.getAttribute('color'),pane=new THREE.Color(0x29495b),ys=[];
  for(let i=0;i<position.count;i++)if(position.getZ(i)>.4&&Math.abs(color.getX(i)-pane.r)<1e-5&&Math.abs(color.getY(i)-pane.g)<1e-5&&Math.abs(color.getZ(i)-pane.b)<1e-5)ys.push(position.getY(i));
  const bands=[];for(const y of ys.sort((a,b)=>a-b)){if(!bands.length||y-bands.at(-1).at(-1)>.15)bands.push([]);bands.at(-1).push(y)}assert.equal(bands.length,3,'three window storeys come from the imported source, not height stretching');
  const root=art.root(house.x,house.z),details=buildIvanHomeExterior(art,house,root);assert.equal(details.steps.length,3);
  assert.ok(details.balcony.position.y>bands[1][0]*house.width-.3&&details.balcony.position.y<bands[1].at(-1)*house.width);
  for(const step of details.steps){step.geometry.computeBoundingBox();assert.ok(step.position.y+step.geometry.boundingBox.max.y<.13,'entrance steps do not create a tall collision threshold')}
  art.scene.traverse(part=>{if(part.isMesh)assert.ok([...part.geometry.getAttribute('position').array].every(Number.isFinite))});
 }finally{art.dispose();library.dispose()}
});

test('home landings connect all three floors without covering the central arrival or exit aisle',()=>{
 assert.deepEqual(new Set(homeLandingTargets.flatMap(target=>[target.room,target.interior])),new Set(rooms));
 for(const target of homeLandingTargets){
  assert.ok(isHomeRoom(target.room)&&isHomeRoom(target.interior));assert.equal(target.kind,'door');assert.notEqual(target.room,target.interior);
  assert.equal(homeRoomBlocked(target.room,target),false,`${target.id}: reachable interaction point`);assert.equal(homeRoomBlocked(target.room,target.arrival),false,`${target.id}: reachable origin landing`);assert.equal(homeRoomBlocked(target.interior,target.entry),false,`${target.id}: safe destination landing`);
  assert.ok(Math.hypot(target.entry.x-target.x,target.entry.z-target.z)>target.radius,'arriving on another floor does not immediately select the next staircase');
 }
 for(const room of rooms)for(const point of [{x:0,z:1},{x:0,z:2.7},{x:0,z:3.4}])assert.equal(homeRoomBlocked(room,point),false,`${room}: clear central aisle`);
 for(const room of rooms)assert.equal(homeRoomBlocked(room,{x:-3.02,z:-.5}),true,`${room}: staircase has body clearance`);
 assert.equal(homeRoomBlocked('home-studio',{x:2.95,z:2.5}),true,'descending staircase cannot be walked through');
});

test('gaming floor has a full workstation and the top floor has a protected open balcony',()=>canvas(()=>{
 for(const room of rooms){
  const art=createGlobeArt(new THREE.Scene());
  try{
   buildHomeRoomShell(art,room);art.scene.updateMatrixWorld(true);
   if(room==='home-studio'){
    const monitors=[];art.scene.traverse(part=>{if(part.name==='home-gaming-monitor')monitors.push(part)});assert.equal(monitors.length,2);
    for(const name of ['home-gaming-desk','home-gaming-keyboard','home-gaming-pc','home-gaming-chair','home-game-controller'])assert.ok(art.scene.getObjectByName(name),name);
    for(const name of ['home-gaming-desk','home-gaming-pc','home-gaming-chair']){
     const bounds=new THREE.Box3().setFromObject(art.scene.getObjectByName(name));
     for(const u of [.1,.5,.9])for(const v of [.1,.5,.9])assert.equal(homeRoomBlocked(room,{x:THREE.MathUtils.lerp(bounds.min.x,bounds.max.x,u),z:THREE.MathUtils.lerp(bounds.min.z,bounds.max.z,v)}),true,`${name}: occupied floor is solid`);
    }
   }
   if(room==='home-balcony'){assert.ok(art.scene.getObjectByName('home-rooftop-balcony-rails'));assert.ok(art.scene.getObjectByName('home-sky-lounge-sofa'))}
   art.scene.traverse(part=>{if(part.isMesh)assert.ok([...part.geometry.getAttribute('position').array].every(Number.isFinite))});
   const resources=[...new Set([...art.kit.geometries,...art.kit.extras])];let releases=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>releases++));art.dispose();assert.equal(releases,resources.length);
  }catch(error){art.dispose();throw error}
 }
}));

test('upper home floors do not duplicate Ivan or create another resident population',()=>canvas(()=>{
 for(const room of rooms){const interior=createInterior(room);try{assert.equal(Boolean(interior.ivan),room==='home');assert.equal(interior.host,undefined);assert.equal(interior.cat,undefined)}finally{interior.dispose()}}
}));

test('stairs use safe reachable floor landings, preserve the outdoor home anchor and keep their solid sides',()=>{
 const exterior=targets.find(target=>!target.room&&target.interior==='home'),sim=createGlobeSimulation();
 for(const id of ['home-up','studio-up','balcony-down','studio-down']){
  const stair=targets.find(target=>target.id===id);assert.ok(stair);sim.visit(id);assert.equal(sim.inside,stair.room);assert.equal(sim.nearest(),id);assert.ok(roomWalkable(stair.room,sim.roomBody));
  sim.enter(stair.interior,stair.entry);assert.equal(sim.inside,stair.interior);assert.ok(roomWalkable(stair.interior,sim.roomBody));assert.deepEqual({x:sim.body.x,z:sim.body.z},exterior.arrival);
 }
 assert.equal(sim.inside,'home');
 for(const room of rooms)for(const hz of [30,60,120]){
  sim.enter(room,{x:-1.8,z:.25});
  for(let frame=0;frame<hz*2;frame++){sim.step(1/hz,{x:-1,forward:0,run:true});assert.ok(roomWalkable(room,sim.roomBody))}
  assert.ok(sim.roomBody.x>=-2.12-1e-8,`${room}: ${hz}Hz stairs keep their solid side`);
  sim.leave();assert.equal(sim.inside,null);assert.equal(blocked(sim.body),false);assert.equal(wet(sim.body),false);assert.deepEqual({x:sim.body.x,z:sim.body.z},exterior.arrival);
 }
});
