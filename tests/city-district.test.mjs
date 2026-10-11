import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {cityDistrict,cityPavingBounds,cityPaths,cityObstacles,cityQuarters,cityRoad,inCity} from '../src/experience/globe/city-district.ts';
import {buildingMapOutline,insideBuildingFootprint} from '../src/experience/globe/building-footprint.ts';
import {buildings,targets,blocked,mapStops} from '../src/experience/globe/layout.ts';
import {wet,heightAt,WATER,spawn,distance,mapAt} from '../src/experience/globe/geography.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {mapBounds} from '../src/experience/globe/navigation.ts';
import {followFraming} from '../src/experience/globe/camera-framing.ts';

const idle={x:0,forward:0,run:false},cityHouses=buildings.filter(building=>building.style==='city');
function clear(point,label){const location=`${label} at ${point.x.toFixed(3)},${point.z.toFixed(3)}`;assert.equal(wet(point),false,`${location}: dry ground`);assert.equal(blocked(point),false,`${location}: no solid obstruction`)}
function walkToZ(sim,z,hz,mode='walk',check=()=>{}){
 const direction=z>sim.body.z?1:-1,dt=1/hz,limit=Math.ceil(Math.abs(z-sim.body.z)/(mode==='crouch'?1.05:mode==='walk'?2.65:5.2)*hz+hz*3);
 sim.crouch(mode==='crouch');sim.halt();
 for(let frame=0;frame<limit&&(direction>0?sim.body.z<z:sim.body.z>z);frame++){
  if(mode==='jump'&&frame%Math.round(hz*1.2)===0)sim.jump();
  sim.step(dt,{...idle,forward:-direction,run:mode==='run'||mode==='jump'});
  clear(sim.body,`${hz}Hz ${mode} avenue`);check();
 }
 assert.ok(direction>0?sim.body.z>=z:sim.body.z<=z,`${hz}Hz ${mode}: reached ${z}, stopped at ${sim.body.z}`);
}

test('the southern city stays dry under its whole useful area and every rendered house footprint',()=>{
 assert.ok(cityHouses.length>1);assert.ok(cityHouses.some(building=>building.floors===2));
 for(let z=cityDistrict.minZ;z<=cityDistrict.maxZ;z+=.5)for(let x=cityDistrict.minX;x<=cityDistrict.maxX;x+=.5){
  const point={x,z};assert.ok(inCity(point));assert.equal(wet(point),false,`${x},${z}`);assert.ok(heightAt(point)>WATER+.25);
 }
 for(const house of cityHouses){
  assert.equal(blocked(house),true,house.id);
  for(const corner of buildingMapOutline(house))assert.equal(wet(corner),false,`${house.id}: dry footprint corner`);
 }
 for(const route of cityPaths)for(let i=1;i<route.length;i++)for(let step=0;step<=40;step++){
  const t=step/40,point={x:route[i-1].x*(1-t)+route[i].x*t,z:route[i-1].z*(1-t)+route[i].z*t};
  clear(point,'connected city path');
 }
});

test('the city avenue is walkable south and back in every movement mode at multiple frame rates',()=>{
 for(const hz of [20,60,120])for(const mode of ['walk','run','crouch','jump']){
  const sim=createGlobeSimulation(),entry=cityPaths[0][0];Object.assign(sim.body,entry);
  walkToZ(sim,53,hz,mode);walkToZ(sim,29,hz,mode);
  assert.ok(Math.abs(sim.body.x-entry.x)<1e-10);assert.equal(sim.inside,null);
 }
});

test('city walls and the outer coast stay solid while running and jumping',()=>{
 for(const hz of [30,120])for(const mode of ['run','jump']){
  const sim=createGlobeSimulation(),house=cityHouses[0],start=new THREE.Vector3(0,0,house.depth/2+1.2).applyMatrix4(frameAt(house.x,house.z)).normalize();
  Object.assign(sim.body,mapAt(start));clear(sim.body,'outside the city facade');
  for(let frame=0;frame<hz*3;frame++){
   if(mode==='jump'&&frame%Math.round(hz*1.2)===0)sim.jump();
   sim.step(1/hz,{...idle,forward:1,run:true});clear(sim.body,'city facade collision');
   assert.equal(insideBuildingFootprint(sim.body,house),false,'the character never crosses the rendered wall');
  }
  const local=new THREE.Vector3().setFromMatrixPosition(frameAt(sim.body.x,sim.body.z)).applyMatrix4(frameAt(house.x,house.z).invert());
  assert.ok(local.z>house.depth/2&&local.z<house.depth/2+.5,'the character stops in front of the facade');
  // The old south-city edge now continues into the polar route. Check a retained open-water coast.
  const coast=createGlobeSimulation();Object.assign(coast.body,{x:42,z:0});
  let waterEdge=42;while(!wet({x:waterEdge,z:0})&&waterEdge<60)waterEdge+=.025;
  assert.ok(waterEdge<60,'the sampled edge really is open water');
  for(let frame=0;frame<hz*8;frame++){
   if(mode==='jump'&&frame%Math.round(hz*1.2)===0)coast.jump();
   coast.step(1/hz,{...idle,x:1,run:true});clear(coast.body,'open-water coast collision');
  }
  assert.ok(coast.body.x<waterEdge&&coast.body.x>waterEdge-.3,'the dry coast is reachable and water blocks further travel');
 }
 for(const obstacle of cityObstacles)assert.equal(blocked(obstacle),true,'city furniture is solid');
});

test('Patch can accompany the walk into the city without crossing water or buildings',()=>{
 const sim=createGlobeSimulation();sim.action('patch','follow');
 const companion=sim.animals.find(animal=>animal.id==='patch');
 walkToZ(sim,cityDistrict.arrival.z,60,'walk',()=>clear(companion,'city companion route'));
 sim.halt();for(let frame=0;frame<360;frame++){sim.step(1/60,idle);clear(companion,'city companion arrival')}
 assert.ok(distance(companion,sim.body)<3,'the companion reaches the city with Ivan');
});

test('the city destination preserves existing interiors, discovery totals and reset behavior',()=>{
 const sim=createGlobeSimulation(),destination=targets.find(target=>target.id==='city-square'),doors=buildings.filter(building=>building.enter);
 assert.ok(destination&&mapStops.includes(destination.id));assert.equal(destination.room,undefined);
 assert.deepEqual(cityHouses.filter(b=>b.enter).map(b=>b.enter).sort(),['arcade','bookshop','cafe','ceramics'],'only the four furnished shops have open doors');for(const room of ['library','workshop','home'])assert.ok(doors.some(door=>door.enter===room),'existing interiors remain available');
 sim.visit(destination.id);assert.equal(sim.inside,null);assert.equal(sim.nearest(),destination.id);clear(sim.body,'direct city arrival');
 for(const door of doors){sim.enter(door.enter);assert.equal(sim.inside,door.enter);sim.leave();const source=targets.find(target=>target.interior===door.enter);assert.ok(distance(sim.body,source.arrival)<.001);clear(sim.body,'existing interior exit')}
 for(const target of targets)sim.visit(target.id);
 const expected=targets.filter(target=>target.kind!=='exit').length;assert.equal(sim.snapshot(false).total,expected);assert.equal(sim.snapshot(false).discovered,expected);
 sim.visit(destination.id);assert.equal(sim.snapshot(false).discovered,expected,'repeat city travel does not duplicate discoveries');
 sim.reset();assert.equal(sim.inside,null);assert.equal(sim.discovered.size,0);assert.equal(sim.snapshot(true).total,expected);assert.deepEqual({x:sim.body.x,z:sim.body.z},spawn);assert.equal(sim.objects.following,false);
});

test('portrait city framing reveals the storefronts while retaining the whole character',()=>{
 const frame=frameAt(cityDistrict.arrival.x,cityDistrict.arrival.z);
 function view(city){const p=followFraming(true,city),camera=new THREE.PerspectiveCamera(p.fov,375/812,.14,420);camera.position.copy(new THREE.Vector3(p.side,p.height,p.back).applyMatrix4(frame));camera.up.setFromMatrixColumn(frame,1);camera.lookAt(new THREE.Vector3(0,1.1,-p.lookAhead).applyMatrix4(frame));camera.updateMatrixWorld();return camera}
 const visible=point=>Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1;
 function storefrontSamples(camera){let count=0;for(const b of cityHouses)for(let x=0;x<5;x++)for(let y=0;y<5;y++)if(visible(new THREE.Vector3((x/4-.5)*b.width,y/4*b.height,b.depth/2).applyMatrix4(frameAt(b.x,b.z)).project(camera)))count++;return count}
 const camera=view(true);assert.ok(storefrontSamples(camera)>20,'the portrait view includes the fitted street façades');
 for(const door of targets.filter(t=>t.interior==='cafe'||t.interior==='bookshop')){
  const entranceFrame=frameAt(door.arrival.x,door.arrival.z),p=followFraming(true,true),entranceCamera=new THREE.PerspectiveCamera(p.fov,375/812,.14,420);entranceCamera.position.copy(new THREE.Vector3(p.side,p.height,p.back).applyMatrix4(entranceFrame));entranceCamera.up.setFromMatrixColumn(entranceFrame,1);entranceCamera.lookAt(new THREE.Vector3(0,1.1,-p.lookAhead).applyMatrix4(entranceFrame));entranceCamera.updateMatrixWorld();
  assert.ok(visible(new THREE.Vector3().setFromMatrixPosition(frameAt(door.x,door.z)).project(entranceCamera)),`${door.id} is visible when approached`);
 }
 for(const height of [0,2.8])assert.ok(visible(new THREE.Vector3(0,height,0).applyMatrix4(frame).project(camera)),'the whole character remains in view');
});


test('three linked city quarters retain their destinations and use imported models for every city facade',()=>{
 assert.ok(cityHouses.length>=18);assert.equal(new Set(cityHouses.map(house=>house.id)).size,cityHouses.length);
 for(const house of cityHouses)assert.ok(house.cityModel,`${house.name} uses an actual source mesh`);
 for(const [id,x,z] of [['city-cafe',-8,32],['city-books',8,32],['city-market',-10,41],['city-studio',10,41],['city-apartments',-13,50],['city-garden',13,50]]){
  const house=cityHouses.find(house=>house.id===id);assert.equal(house.x,x);assert.equal(house.z,z);assert.ok(house.cityModel);
 }
 assert.ok(new Set(cityHouses.map(house=>house.roof)).size>=4);assert.ok(cityHouses.some(house=>house.floors===2));
 for(const quarter of cityQuarters){const target=targets.find(target=>target.id===quarter.id),sim=createGlobeSimulation();assert.ok(target&&mapStops.includes(target.id));sim.visit(target.id);assert.equal(sim.nearest(),quarter.id);clear(sim.body,quarter.name);assert.ok(cityRoad(sim.body));}
 for(const house of cityHouses)for(const corner of buildingMapOutline(house)){
  assert.ok(corner.x>=mapBounds.x&&corner.x<=mapBounds.x+mapBounds.width,house.id);assert.ok(corner.z>=mapBounds.z&&corner.z<=mapBounds.z+mapBounds.height,house.id);
  assert.ok(corner.x>=cityPavingBounds.minX-1&&corner.x<=cityPavingBounds.maxX+1,house.id);
 }
 for(const obstacle of cityObstacles)for(const corner of buildingMapOutline(obstacle))assert.ok(!cityHouses.some(house=>insideBuildingFootprint(corner,house,.01)),'street furniture remains outside every building wall');
});

test('expanded avenues and bent polar alleys stay clear at physical five-centimetre intervals',()=>{
 for(const route of cityPaths)for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot((b.x-a.x)*Math.cos(a.z/40),b.z-a.z)/.05);
  for(let index=0;index<=steps;index++){const t=index/steps,point={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};clear(point,'expanded city corridor');assert.ok(cityRoad(point));}
 }
 for(const hz of [30,120])for(const side of [-1,1]){
  const sim=createGlobeSimulation();Object.assign(sim.body,{x:0,z:36});let frames=0;
  while(Math.abs(sim.body.x)<41.5&&frames++<hz*12){sim.step(1/hz,{...idle,x:side,run:true});clear(sim.body,'cross-street to outer quarter');}
  assert.ok(Math.abs(sim.body.x)>=41.5,'the visitor reaches the outer quarter');sim.halt();
  while(sim.body.z<53&&frames++<hz*25){sim.step(1/hz,{...idle,forward:-1,run:true});clear(sim.body,'outer quarter alley');}
  assert.ok(sim.body.z>=53,'the outer alley reaches the southern promenade');
 }
});
