import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {worldPlaces,worldPaths,worldCircumference,longitudeLimit,latitudeLimit,wrapLongitude,longitudeDelta} from '../src/experience/globe/world-expansion.ts';
import {normalAt,mapAt,heightAt,wet,pathDistance,distance,RADIUS,paths} from '../src/experience/globe/geography.ts';
import {blocked,targets,treeSites} from '../src/experience/globe/layout.ts';
import {mapBounds} from '../src/experience/globe/navigation.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {globeOverview,alignGlobeOverview} from '../src/experience/globe/globe-overview.ts';
import {insideBuildingFootprint,insideRoundFootprint} from '../src/experience/globe/building-footprint.ts';
import {riverCrossings,bridgeBlocked} from '../src/experience/globe/bridge.ts';

const idle={x:0,forward:0,run:false};
const pointAt=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});

test('bounded far-side woodland is distributed across both latitude regions',()=>{
 const trees=treeSites.filter(tree=>normalAt(tree.x,tree.z).y<0);
 assert.ok(trees.length>0);
 for(const side of [-1,1])assert.ok(trees.filter(tree=>tree.z*side>0).length>=trees.length*.25,'neither half of the globe is left bare by candidate order');
});

test('dragging the overview reveals the actual far hemisphere and keeps a finite camera frame',()=>{
 const position=new THREE.Vector3(),up=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(50,1.5,.14,420);
 for(const turn of [0,Math.PI/2,Math.PI,Math.PI*2]){
  globeOverview(turn,0,150,position,up);assert.ok(Math.abs(position.length()-150)<1e-10);
  if(turn===0)assert.ok(position.y>0);if(turn===Math.PI)assert.ok(position.y<0,'back hemisphere is reachable');
  camera.position.copy(position);camera.up.copy(up);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  assert.ok(camera.matrixWorld.elements.every(Number.isFinite));assert.ok(Math.abs(camera.matrixWorld.determinant()-1)<1e-8);
 }
 for(const point of [...worldPlaces,{x:longitudeLimit,z:0},{x:95,z:latitudeLimit},{x:-95,z:-latitudeLimit}]){
  const orbit={x:0,y:0},n=normalAt(point.x,point.z),normal=new THREE.Vector3(n.x,n.y,n.z);
  alignGlobeOverview(point,orbit);globeOverview(orbit.x,orbit.y,150,position,up);
  assert.ok(position.clone().normalize().dot(normal)>.6,'world-view transition remains on the explorer’s hemisphere');
  assert.ok(up.dot(normal)>0,'blended camera up cannot cancel at an antipode');
 }
});

test('longitude wrapping preserves spherical position and uses the short turn across the map edge',()=>{
 for(const x of [-longitudeLimit-.1,-longitudeLimit,0,longitudeLimit,longitudeLimit+.1])for(const turns of [-3,0,4]){
  const value=x+turns*worldCircumference,wrapped=wrapLongitude(value),a=normalAt(value,24),b=normalAt(wrapped,24);
  assert.ok(wrapped>=-longitudeLimit&&wrapped<longitudeLimit);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-12);
 }
 assert.ok(Math.abs(longitudeDelta(longitudeLimit-.2,-longitudeLimit+.3)-.5)<1e-10);
 assert.ok(Math.abs(longitudeDelta(-longitudeLimit+.3,longitudeLimit-.2)+.5)<1e-10);
 assert.ok(Math.abs(worldCircumference-2*Math.PI*RADIUS)<1e-12);
});

test('far-side walking never collides with an antipodal copy of a town building or tower',()=>{
 for(const source of [{x:0,z:0},{x:35,z:24},{x:-30,z:-35},{x:longitudeLimit-.2,z:18}]){
  const antipode={x:wrapLongitude(source.x+longitudeLimit),z:-source.z};
  const rectangle={...source,width:6,depth:5},round={...source,radius:2};
  assert.equal(insideBuildingFootprint(source,rectangle,.32),true);
  assert.equal(insideRoundFootprint(source,round,.32),true);
  assert.equal(insideBuildingFootprint(antipode,rectangle,.32),false);
  assert.equal(insideRoundFootprint(antipode,round,.32),false);
 }
});

test('new discoveries occupy both hemispheres and reach dry, clear, live arrivals',()=>{
 const s=createGlobeSimulation();s.setReduced(true);
 assert.ok(worldPlaces.some(place=>normalAt(place.x,place.z).y<-.4),'far-side places exist');
 assert.ok(worldPlaces.some(place=>place.z<0)&&worldPlaces.some(place=>place.z>0),'both latitude regions are used');
 for(const place of worldPlaces){
  assert.ok(targets.some(target=>target.id===place.id),place.id);
  s.visit(place.id);assert.equal(s.nearest(),place.id);assert.equal(s.inside,null);
  assert.equal(wet(s.body),false,`${place.id} must have dry terrain`);
  assert.equal(blocked(s.body),false,`${place.id} arrival must stay clear`);
  assert.ok(s.body.x>mapBounds.x&&s.body.x<mapBounds.x+mapBounds.width);
  assert.ok(s.body.z>mapBounds.z&&s.body.z<mapBounds.z+mapBounds.height);
 }
});

test('every added trail is continuous dry ground or a real bridge, with an open walking centre',()=>{
 for(const line of worldPaths)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);
  for(let sample=0;sample<=steps;sample++){
   const p=pointAt(a,b,sample/steps);
   assert.equal(wet(p),false,`wet trail ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
   assert.equal(blocked(p),false,`blocked trail ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
   assert.ok(Number.isFinite(heightAt(p)));
  }
 }
});

test('each river crossing opens onto dry, clear approaches on both banks',()=>{
 assert.ok(riverCrossings.some(crossing=>crossing.x<0)&&riverCrossings.some(crossing=>crossing.x>0));
 for(const crossing of riverCrossings)for(let z=crossing.startZ-2;z<=crossing.endZ+2;z+=.1){
  const p={x:crossing.x,z};
  assert.equal(wet(p),false,`${crossing.id} approach ${z.toFixed(1)} is wet`);
  assert.equal(blocked(p),false,`${crossing.id} approach ${z.toFixed(1)} is blocked`);
  assert.equal(bridgeBlocked(p),false);
 }
 for(const crossing of riverCrossings.filter(crossing=>crossing.id!=='central-bridge')){
  const route=paths.find(line=>line.some(point=>point.x===crossing.x&&point.z===crossing.startZ));
  assert.ok(route,`${crossing.id} joins an authored path`);
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i],samples=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);
   for(let sample=0;sample<=samples;sample++){
    const point=pointAt(a,b,sample/samples);
    assert.equal(wet(point),false,`${crossing.id} connecting trail is wet at ${point.x},${point.z}`);
    assert.equal(blocked(point),false,`${crossing.id} connecting trail is blocked at ${point.x},${point.z}`);
   }
  }
 }
});

test('southern trail joins the city around the far side without painting a false Greenwich shortcut',()=>{
 const east=worldPaths[0],west=worldPaths[1];
 assert.ok(distance(east.at(-1),west.at(-1))<1e-6,'the two longitude-edge trail ends meet on the sphere');
 for(const side of [-1,1])assert.ok(pathDistance({x:side*(longitudeLimit-.25),z:24})<.3,'trail crosses both sides of the map seam');
 // This inland point is separated from all authored local roads; a seam segment
 // spanning the map numerically would accidentally color this whole latitude.
 assert.ok(pathDistance({x:60,z:0})>4,'no route is drawn straight through the map centre');
 const s=createGlobeSimulation();s.setReduced(true);Object.assign(s.body,{...east[0],vx:0,vz:0});
 const route=[...east.slice(1),...west.toReversed().slice(1)];
 for(const goal of route){
  let frames=0;
  while(distance(s.body,goal)>.15&&frames++<1800){
   const dx=longitudeDelta(s.body.x,goal.x)*Math.cos(s.body.z/RADIUS),dz=goal.z-s.body.z,length=Math.hypot(dx,dz);
   s.step(1/60,{x:dx/length,forward:-dz/length,run:true});
   assert.equal(wet(s.body),false);assert.equal(blocked(s.body),false);
  }
  assert.ok(distance(s.body,goal)<.2,`could not walk to ${goal.x},${goal.z}; stopped at ${s.body.x},${s.body.z}`);
 }
});

test('seam traversal retains finite movement and eastward facing at several frame rates',()=>{
 for(const hz of [30,60,120]){
  const s=createGlobeSimulation();s.setReduced(true);Object.assign(s.body,{x:longitudeLimit-.25,z:24,yaw:Math.PI/2,vx:0,vz:0});
  let travelled=0,previous={...s.body};
  for(let frame=0;frame<hz;frame++){
   s.step(1/hz,{...idle,x:1,run:true});travelled+=distance(previous,s.body);previous={...s.body};
   assert.ok(s.body.x>=-longitudeLimit&&s.body.x<longitudeLimit);
   assert.ok(Object.values(s.body).every(value=>typeof value!=='number'||Number.isFinite(value)));
   assert.ok(Math.abs(Math.atan2(Math.sin(s.body.yaw-Math.PI/2),Math.cos(s.body.yaw-Math.PI/2)))<.1,'no backward spin at the seam');
   assert.equal(wet(s.body),false);
  }
  assert.ok(s.body.x<0,'crossed from east map edge to west');
  assert.ok(travelled>4.7&&travelled<5.4,`${hz} Hz preserves physical running speed: ${travelled}`);
 }
});

test('a following pet takes the short route across the map seam',()=>{
 const s=createGlobeSimulation(),patch=s.animals.find(animal=>animal.id==='patch');
 Object.assign(s.body,{x:-longitudeLimit+2,z:24,vx:0,vz:0});
 Object.assign(patch,{x:longitudeLimit-2,z:24,yaw:Math.PI/2,speed:0});
 s.action('patch','follow');
 for(let frame=0;frame<600;frame++){s.step(1/60,idle);assert.equal(wet(patch),false);assert.equal(blocked(patch),false)}
 assert.ok(patch.x<0,'Patch crosses the seam toward the visitor');
 assert.ok(distance(patch,s.body)<2,'Patch does not walk the long way around the world');
});

test('polar movement stays in canonical latitude and keeps valid radial frames',()=>{
 for(const side of [-1,1]){
  const s=createGlobeSimulation();s.setReduced(true);Object.assign(s.body,{x:95,z:side*(latitudeLimit-.2),vx:0,vz:0});
  for(let frame=0;frame<120;frame++){
   s.step(1/60,{...idle,forward:-side,run:true});
   assert.ok(Math.abs(s.body.z)<=latitudeLimit+1e-8);
   assert.equal(wet(s.body),false);
   const frame=frameAt(s.body.x,s.body.z),n=normalAt(s.body.x,s.body.z),back=mapAt(n);
   assert.ok(frame.elements.every(Number.isFinite));assert.ok(Math.abs(frame.determinant()-1)<1e-8);
   assert.ok(Math.abs(back.z-s.body.z)<1e-8);
  }
 }
});

test('the live companion follows the connected world trails instead of stalling at town walls',()=>{
 const sim=createGlobeSimulation(),patch=sim.animals.find(animal=>animal.id==='patch');
 sim.action('patch','follow');sim.visit('sunlit-orchard');
 for(let frame=0;frame<3600&&distance(patch,sim.body)>2;frame++){
  const previous={...patch};sim.step(1/60,idle);
  assert.equal(wet(patch),false);assert.equal(blocked(patch),false);
  assert.ok(distance(previous,patch)<.065,'only normal walking steps are allowed');
 }
 assert.ok(distance(patch,sim.body)<2,'Patch catches up on the far side');
 sim.reset();assert.equal(sim.objects.following,false);
});
