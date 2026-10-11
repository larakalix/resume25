import assert from 'node:assert/strict';
import {test} from 'node:test';
import {japanDistrict,japanBuildings,japanStops,japanPaths,japanPavingBounds,japanGate,japanGatePosts,japanGardenTrees,japanObstacles,japanMapOffset,japanPaved,japanLane,inJapan,japanGroundWeight} from '../src/experience/globe/japan-district.ts';
import {buildings,targets,mapStops,blocked,treeSites} from '../src/experience/globe/layout.ts';
import {heightAt,wet,WATER,RADIUS,normalAt,distance} from '../src/experience/globe/geography.ts';
import {buildingMapOutline,insideBuildingFootprint,insideRoundFootprint} from '../src/experience/globe/building-footprint.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {isFootprintSand} from '../src/experience/globe/footprints.ts';
import {mapBounds} from '../src/experience/globe/navigation.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import * as THREE from 'three';

const idle={x:0,forward:0,run:false};
function clear(p,label){assert.equal(wet(p),false,`${label}: wet ${p.x},${p.z}`);assert.equal(blocked(p),false,`${label}: blocked ${p.x},${p.z}`)}
function walk(sim,goal,hz,mode){
 const dt=1/hz,limit=hz*100;let reached=false;
 for(let frame=0;frame<limit;frame++){
  const p=sim.body,scale=Math.cos(p.z/RADIUS),dx=(goal.x-p.x)*scale,dz=goal.z-p.z,length=Math.hypot(dx,dz);
  if(length<.12){reached=true;break}
  if(mode==='jump'&&frame%Math.round(hz*1.2)===0)sim.jump();
  sim.step(dt,{x:dx/length,forward:-dz/length,run:mode==='run'||mode==='jump'});clear(p,`${hz}Hz ${mode}`);
 }
 sim.halt();assert.ok(reached,`${mode} at ${hz}Hz reached ${goal.x},${goal.z}; stopped ${sim.body.x},${sim.body.z}`);
}

test('the new north-west quarter has dry physical building footprints, meaningful facades and unchanged existing destinations',()=>{
 assert.ok(japanBuildings.length>=10);assert.ok(japanBuildings.some(b=>/^(pagoda|castle_tower)-/u.test(b.cityModel??'')),'tiered buildings use their imported source geometry');assert.ok(japanBuildings.some(b=>b.id==='japan-temple'));
 assert.equal(buildings.filter(b=>b.style==='city').length,18);assert.ok(japanBuildings.every(b=>!b.enter),'the Japanese facades remain outdoor scenery');
 for(let z=japanDistrict.minZ;z<=japanDistrict.maxZ;z+=.75)for(let x=japanDistrict.minX;x<=japanDistrict.maxX;x+=.75){assert.ok(inJapan({x,z}));assert.ok(Math.abs(heightAt({x,z})-.6)<1e-8);assert.equal(wet({x,z}),false)}
 for(const b of japanBuildings){assert.equal(blocked(b),true,b.id);for(const p of buildingMapOutline(b)){assert.equal(wet(p),false,b.id);assert.ok(p.x>=mapBounds.x&&p.x<=mapBounds.x+mapBounds.width);assert.ok(p.z>=mapBounds.z&&p.z<=mapBounds.z+mapBounds.height)}}
 for(const id of ['workshop-door','library-door','harbor','city-square','city-west','city-east','mira','sol','duck-pond']){const t=targets.find(t=>t.id===id);assert.ok(t,id);clear(t.arrival,id)}
 assert.equal(japanGroundWeight({x:0,z:0}),0);assert.equal(japanGroundWeight(japanDistrict.arrival),1);assert.equal(japanPaved(japanDistrict.arrival),true);
});

test('all approach and neighbourhood lanes are connected, dry and clear at physical five-centimetre samples',()=>{
 for(const [routeIndex,route] of japanPaths.entries())for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],steps=Math.ceil(distance(a,b)/.05);
  for(let j=0;j<=steps;j++){const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};clear(p,`route${routeIndex}`);if(routeIndex>0)assert.ok(japanLane(p))}
 }
 for(const a of japanPaths.slice(1))assert.ok(japanPaths.some(b=>b!==a&&a.some(p=>b.some(q=>Math.abs(p.x-q.x)<1e-8&&Math.abs(p.z-q.z)<1e-8))),'each lane connects at a shared corner');
 for(const tree of treeSites)assert.equal(inJapan(tree,2),false,'old random forest stays out of the quarter');
});

test('walking, running, crouching and jumping can enter the quarter and reach the courtyard at bounded frame rates',()=>{
 for(const hz of [30,60,120])for(const mode of ['walk','run','crouch','jump']){
  const sim=createGlobeSimulation();Object.assign(sim.body,japanPaths[0][0]);sim.crouch(mode==='crouch');
  for(const p of japanPaths[0].slice(1))walk(sim,p,hz,mode);
  for(const p of japanPaths[1].slice(1))walk(sim,p,hz,mode);
  assert.equal(sim.inside,null);assert.ok(sim.body.z< -38);
 }
});

test('shared gate posts, garden trunks and stone lanterns are solid while the gate centre stays open',()=>{
 assert.ok(japanGate.height>=4.8);clear(japanGate,'open gate centre');
 const frame=frameAt(japanGate.x,japanGate.z),local=new THREE.Vector3();
 for(const post of japanGatePosts){assert.equal(blocked(post),true);local.set(post.localX,0,post.localZ).applyMatrix4(frame).normalize();const expected=japanMapOffset(japanGate,post.localX,post.localZ),actual=normalAt(expected.x,expected.z);assert.ok(local.distanceTo(new THREE.Vector3(actual.x,actual.y,actual.z))<1e-8)}
 for(const prop of japanObstacles){assert.equal(blocked(prop),true);assert.ok(!japanBuildings.some(b=>insideBuildingFootprint(prop,b,.35)),'prop is outside the wall footprint')}
 for(const tree of japanGardenTrees){assert.equal(blocked(tree),true);assert.ok(insideRoundFootprint(tree,tree,.32));assert.ok(!japanBuildings.some(b=>insideBuildingFootprint(tree,b,.35)))}
});

test('Places arrivals, discovery totals, minimap bounds and sandy-footprint exclusions follow district data',()=>{
 const sim=createGlobeSimulation();
 for(const stop of japanStops){assert.ok(mapStops.includes(stop.id));sim.visit(stop.id);assert.equal(sim.inside,null);assert.equal(sim.nearest(),stop.id);clear(sim.body,stop.id);assert.equal(isFootprintSand(stop.arrival),false)}
 for(const target of targets)sim.visit(target.id);const total=targets.filter(t=>t.kind!=='exit').length;assert.equal(sim.snapshot(false).total,total);assert.equal(sim.snapshot(false).discovered,total);
 for(let z=japanPavingBounds.minZ+.2;z<japanPavingBounds.maxZ;z+=1)for(let x=japanPavingBounds.minX+.2;x<japanPavingBounds.maxX;x+=1)if(japanPaved({x,z}))assert.equal(isFootprintSand({x,z}),false);
 sim.reset();assert.equal(sim.inside,null);assert.equal(sim.discovered.size,0);assert.equal(sim.snapshot(true).total,total);assert.ok(heightAt(japanDistrict.arrival)>WATER+.25);
});

test('a compact shop avenue keeps connected paving and house aprons while outer gardens remain unpaved',()=>{
 const shops=japanBuildings.filter(building=>!building.id.startsWith('japan-house-')&&building.id!=='japan-temple');
 for(const shop of shops){assert.ok(Math.abs(shop.x+33)<=6);for(const corner of buildingMapOutline(shop))assert.equal(japanPaved(corner),true,shop.id)}
 for(const house of japanBuildings)for(const corner of buildingMapOutline(house))assert.equal(japanPaved(corner),true,`${house.id}: paved base`);
 for(const [index,route] of japanPaths.entries())if(index>0)for(let segment=1;segment<route.length;segment++)for(let step=0;step<=80;step++){
  const a=route[segment-1],b=route[segment],p={x:a.x+(b.x-a.x)*step/80,z:a.z+(b.z-a.z)*step/80};assert.equal(japanPaved(p,.001),true,'paving reaches each lane, including its boundary');
 }
 assert.equal(japanPaved({x:-45,z:-20}),false,'the space between the outer homes and core returns to garden');
 const edge={x:-49,z:-30};assert.equal(japanPaved(edge),false);assert.equal(japanPaved(edge,.4),true,'vegetation exclusions include a bare tile-edge buffer');
 for(const tree of japanGardenTrees)assert.equal(japanPaved(tree),false,'garden islands remain open');
});

function companionArrives(sim,hz,limit=85){
 const patch=sim.animals.find(animal=>animal.id==='patch');let reached=false;
 for(let frame=0;frame<hz*limit;frame++){sim.step(1/hz,idle);clear(patch,'companion route');if(distance(patch,sim.body)<2.5){reached=true;break}}
 assert.ok(reached,`Patch reaches the visitor at ${hz}Hz; gap ${distance(patch,sim.body).toFixed(2)}`);
 return patch;
}

test('Patch follows direct courtyard travel and leaves for the old city through the bridge at multiple frame rates',()=>{
 for(const hz of [30,60,120]){
  const sim=createGlobeSimulation();sim.action('patch','follow');sim.visit('japan-courtyard');companionArrives(sim,hz);
  sim.visit('city-square');companionArrives(sim,hz);assert.equal(sim.objects.following,true);
 }
});

test('the avenue detour recovers the previously stuck shop corner, follows a walking owner, and resets cleanly',()=>{
 const sim=createGlobeSimulation();sim.action('patch','follow');sim.visit('japan-courtyard');const patch=sim.animals.find(animal=>animal.id==='patch');
 Object.assign(patch,{x:-23.920841396984624,z:-27.33428716730981,speed:0});clear(patch,'former corner trap');companionArrives(sim,60,45);
 sim.visit('japan-quarter');companionArrives(sim,60,45);
 for(let frame=0;frame<900&&sim.body.z> -36.2;frame++){sim.step(1/60,{...idle,forward:1});clear(sim.body,'walking visitor');clear(patch,'walking companion')}
 assert.ok(sim.body.z< -36);sim.halt();companionArrives(sim,60,30);
 sim.action('patch','follow');assert.equal(sim.objects.following,false);sim.visit('city-square');for(let frame=0;frame<30;frame++)sim.step(1/60,idle);sim.action('patch','follow');companionArrives(sim,60);
 sim.reset();assert.equal(sim.objects.following,false);sim.action('patch','follow');sim.visit('city-square');companionArrives(sim,60,30);
});
