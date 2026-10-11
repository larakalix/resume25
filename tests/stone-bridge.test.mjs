import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {bridge,riverCrossings,bridgeCutouts,bridgeProfile,bridgeBlocked,bridgeHeight,crossingFootprint} from '../src/experience/globe/bridge.ts';
import {terrainHeight,normalAt,RADIUS,mapAt,wet,heightAt} from '../src/experience/globe/geography.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {buildStoneBridge,bridgePrism} from '../src/experience/globe/stone-bridge.ts';
const idle={x:0,forward:0,run:false};

test('stone deck joins both banks with a low threshold while the two parapets leave the entrances open',()=>{
 for(const x of [-1.6,0,1.6])for(const z of [bridge.startZ,bridge.endZ]){
  assert.ok(Math.abs(bridgeHeight({x,z})-terrainHeight(normalAt(x,z))-bridge.threshold)<1e-9);
  assert.ok(Math.abs(bridgeProfile(z+(z<0?.001:-.001),x)-bridgeProfile(z,x))<.003);
  assert.equal(bridgeBlocked({x:0,z}),false);
 }
 for(const z of [-8,-6,-4,-2,0])for(const side of [-1,1]){
  assert.equal(bridgeBlocked({x:side*2.2,z}),true);
  assert.equal(bridgeBlocked({x:side*1.5,z}),false);
 }
 assert.equal(bridgeBlocked({x:2.2,z:bridge.endZ+.6}),false);
 assert.equal(bridgeBlocked({x:2.2,z:bridge.startZ-.6}),false);
 for(let z=bridge.startZ;z<=bridge.endZ;z+=.05)for(const x of [-2.5,0,2.5])assert.ok(bridgeProfile(z,x)>=terrainHeight(normalAt(x,z)),'stone never dips below either bank');
});
test('walking, running and jumping cannot cross either stone border at 30, 60 or 120 Hz',()=>{
 const limit=bridge.halfWidth-bridge.wallWidth-bridge.bodyRadius;
 for(const hz of [30,60,120])for(const side of [-1,1])for(const z of [-8.1,-6,-4,-2,.1])for(const mode of ['walk','run','jump','crouch']){
  const s=createGlobeSimulation();Object.assign(s.body,{x:0,z});s.setReduced(true);
  if(mode==='jump')s.jump();if(mode==='crouch')s.crouch(true);
  for(let frame=0;frame<hz*3;frame++){
   s.step(1/hz,{...idle,x:side,run:mode!=='walk'});
   assert.ok(Math.abs(s.body.x)<=limit+.001,`${mode} ${hz}Hz ${side} ${z}`);
   assert.equal(bridgeBlocked(s.body),false);
  }
  assert.ok(Math.abs(s.body.x)>1.35);
 }
});
test('diagonal edge pressure slides along the crossing and both approaches remain traversable',()=>{
 for(const forward of [-1,1])for(const side of [-1,1]){
  const s=createGlobeSimulation(),start=forward===1?1:-9.1;Object.assign(s.body,{x:0,z:start});s.setReduced(true);
  for(let frame=0;frame<360;frame++){
   s.step(1/60,{x:side*.25,forward,run:true});
   assert.equal(bridgeBlocked(s.body),false);
   if(s.body.z>=bridge.startZ&&s.body.z<=bridge.endZ)assert.ok(Math.abs(s.body.x)<=1.661);
  }
  assert.ok(forward===1?s.body.z<bridge.startZ-.3:s.body.z>bridge.endZ+.3);
 }
});
test('white masonry has finite closed geometry, matches the foot surface and belongs to the scene owner',()=>{
 const geometry=bridgePrism(-1.8,1.8,bridge.startZ,bridge.endZ,z=>bridgeProfile(z)-.2,bridgeProfile,40),p=geometry.attributes.position;
 assert.ok([...p.array,...geometry.attributes.normal.array].every(Number.isFinite));
 for(let i=0;i<p.count;i++){
  const v=new THREE.Vector3().fromBufferAttribute(p,i),point=mapAt(v.clone().normalize()),height=v.length()-RADIUS;
  const deck=bridgeProfile(point.z,point.x);assert.ok(Math.min(Math.abs(height-deck),Math.abs(height-deck+.2))<2e-5);
 }
 geometry.dispose();const a=createGlobeArt(new THREE.Scene());buildStoneBridge(a);
 assert.ok(a.kit.staticMeshes.length>100);let triangles=0;
 for(const mesh of a.kit.staticMeshes){triangles+=mesh.geometry.attributes.position.count/3;assert.ok(mesh.material.color.r>.5);assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite))}
 assert.ok(triangles<10000);let released=0;const owned=a.kit.extras.slice(-4);owned.forEach(material=>material.addEventListener('dispose',()=>released++));a.dispose();assert.equal(released,4);
});
test('all four river crossings share dry deck footprints, open landings and solid parapets',()=>{
 assert.equal(riverCrossings.length,4);assert.equal(new Set(riverCrossings.map(crossing=>crossing.id)).size,4);
 for(const crossing of riverCrossings){
  const cutout=bridgeCutouts.find(cutout=>cutout.id===crossing.id);
  assert.deepEqual(cutout,{id:crossing.id,minX:crossing.x-crossing.halfWidth,minZ:crossing.startZ,maxX:crossing.x+crossing.halfWidth,maxZ:crossing.endZ});
  for(const z of [crossing.startZ,crossing.endZ]){
   const point={x:crossing.x,z};
   assert.equal(crossingFootprint(point,crossing),true);assert.equal(bridgeBlocked(point),false);assert.equal(wet(point),false);
   assert.ok(Math.abs(heightAt(point)-terrainHeight(normalAt(point.x,point.z))-crossing.threshold)<1e-8);
  }
  for(let z=crossing.startZ;z<=crossing.endZ;z+=.07){
   const point={x:crossing.x,z};assert.equal(wet(point),false);
   assert.ok(Math.abs(bridgeHeight(point)-bridgeProfile(z,point.x,crossing))<1e-8);
   for(const side of [-1,1])assert.equal(bridgeBlocked({x:crossing.x+side*(crossing.halfWidth-crossing.wallWidth/2),z}),true);
  }
  const geometry=bridgePrism(crossing.x-1,crossing.x+1,crossing.startZ,crossing.endZ,z=>bridgeProfile(z,crossing.x,crossing)-.2,z=>bridgeProfile(z,crossing.x,crossing),20,crossing);
  assert.ok(geometry.attributes.position.array.every(Number.isFinite));
  for(let i=0;i<geometry.attributes.position.count;i++){
   const world=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i),point=mapAt(world.clone().normalize()),h=world.length()-RADIUS,deck=bridgeProfile(point.z,point.x,crossing);
   assert.ok(Math.min(Math.abs(h-deck),Math.abs(h-deck+.2))<2e-5,`${crossing.id} geometry shares its walk surface`);
  }
  geometry.dispose();
 }
});
test('each additional crossing keeps walkers, runners, jumpers and crouching players inside its borders',()=>{
 for(const crossing of riverCrossings.slice(1))for(const hz of [30,60,120])for(const side of [-1,1])for(const mode of ['walk','run','jump','crouch']){
  const s=createGlobeSimulation(),z=(crossing.startZ+crossing.endZ)/2;Object.assign(s.body,{x:crossing.x,z});s.setReduced(true);
  if(mode==='jump')s.jump();if(mode==='crouch')s.crouch(true);
  const limit=crossing.halfWidth-crossing.wallWidth-crossing.bodyRadius;
  for(let frame=0;frame<hz*2;frame++){
   s.step(1/hz,{...idle,x:side,run:mode==='run'});
   assert.ok(Math.abs(s.body.x-crossing.x)<=limit+.001,`${crossing.id} ${mode} ${hz}Hz`);assert.equal(bridgeBlocked(s.body),false);assert.equal(wet(s.body),false);
  }
 }
});
