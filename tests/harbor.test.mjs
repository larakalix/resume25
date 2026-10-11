import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {harbor,harborBasis,harborWorldPoint,harborMapPoint,harborLocalPoint,harborHeight,harborFootprint,harborBlocked,harborRails,harborOutline,harborArrival,shoreEntry,shipPosition,shipYaw,shipOutline} from '../src/experience/globe/harbor.ts';
import {normalAt,terrainHeight,RADIUS,WATER} from '../src/experience/globe/terrain.ts';
import {mapAt,wet,heightAt,distance} from '../src/experience/globe/geography.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';

const modes=['walk','run','crouch','jump'];
function dry(point,label){assert.equal(wet(point),false,`${label}: stays on land or the deck`);assert.equal(harborBlocked(point),false,`${label}: stays clear of the rails`)}
function inputTo(point,goal,mode){const dx=(goal.x-point.x)*Math.cos(point.z/RADIUS),dz=goal.z-point.z,length=Math.hypot(dx,dz)||1;return{x:dx/length,forward:-dz/length,run:mode==='run'||mode==='jump'}}
function walkTo(sim,goal,hz,mode){
 const speed=mode==='crouch'?1.05:mode==='walk'?2.65:5.2,limit=Math.ceil((distance(sim.body,goal)/speed+4)*hz);
 sim.crouch(mode==='crouch');sim.halt();
 for(let tick=0;tick<limit&&distance(sim.body,goal)>.1;tick++){
  if(mode==='jump'&&tick%Math.round(hz*1.2)===0)sim.jump();
  sim.step(1/hz,inputTo(sim.body,goal,mode));dry(sim.body,`${mode} at ${hz}Hz`);
 }
 assert.ok(distance(sim.body,goal)<.15,`${mode} at ${hz}Hz reaches its deck destination`);sim.halt();
}

test('the harbor helper matches the actual flat tangent frame and radial foot heights',()=>{
 const frame=frameAt(harbor.x,harbor.z,harbor.level),up=new THREE.Vector3().setFromMatrixColumn(frame,1);
 assert.ok(up.distanceTo(new THREE.Vector3(harborBasis.up.x,harborBasis.up.y,harborBasis.up.z))<1e-12);
 for(const [x,z] of [[-2.5,0],[-1,2.1],[0,0],[6.8,0],[8,-4],[10.4,4.4]]){
  const expected=new THREE.Vector3(x,0,z).applyMatrix4(frame),actual=harborWorldPoint(x,z),point=harborMapPoint(x,z),local=harborLocalPoint(point);
  assert.ok(expected.distanceTo(new THREE.Vector3(actual.x,actual.y,actual.z))<1e-10);
  assert.ok(Math.hypot(local.x-x,local.z-z)<1e-10);assert.ok(Math.abs(local.height-(expected.length()-RADIUS))<1e-10);
  assert.ok(Math.abs(harborHeight(point)-local.height)<1e-10);
  const n=normalAt(point.x,point.z),feet=new THREE.Vector3(n.x,n.y,n.z).multiplyScalar(RADIUS+harborHeight(point));
  assert.ok(feet.distanceTo(expected)<1e-10,'radial player placement lands on the flat deck');
  const lifted=harborWorldPoint(x,z,.6);assert.ok(new THREE.Vector3(lifted.x,lifted.y,lifted.z).sub(expected).distanceTo(up.clone().multiplyScalar(.6))<1e-10);
 }
 assert.equal(harborLocalPoint({x:harbor.x+Math.PI*RADIUS,z:-harbor.z}),null,'the back of the globe is not another harbor');
});

test('the three joined deck regions have an open bank and junction with rails only outside',()=>{
 for(const [x,z] of [[-2.4,2.1],[0,0],[6.7,0],[6.8,0],[6.9,0],[8,4.1],[10.3,0]])assert.equal(harborFootprint(harborMapPoint(x,z)),true);
 for(const [x,z] of [[-3,0],[3,2],[8,4.7],[11,0]])assert.equal(harborFootprint(harborMapPoint(x,z)),false);
 for(const z of [-1,0,1])for(const x of [-2.5,6.7,6.8,6.9])assert.equal(harborBlocked(harborMapPoint(x,z)),false,'there is no invisible entrance or junction wall');
 for(const rail of harborRails)assert.equal(harborBlocked(harborMapPoint((rail.x0+rail.x1)/2,(rail.z0+rail.z1)/2)),true,'each rendered rail is solid');
 const outline=harborOutline();assert.ok(outline.length>=12);assert.deepEqual(outline,harborOutline());
 for(const point of outline){assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.z));assert.equal(harborFootprint(point),true)}
 assert.equal(harborFootprint(harborArrival),true);assert.equal(harborBlocked(harborArrival),false);
});

test('the bank joins dry land and the ship berth stays separate in sufficiently deep water',()=>{
 const ground=terrainHeight(normalAt(shoreEntry.x,shoreEntry.z)),step=harborHeight(shoreEntry)-ground;
 assert.ok(ground>WATER+.07,'the bank entrance is on naturally dry land');assert.ok(step>=0&&step<.3,'the apron meets the bank without a large vertical gap');
 assert.equal(wet(harborMapPoint(11.5,0)),true,'the open sea beyond the pier remains water');
 assert.equal(wet(harborMapPoint(3,2.3)),true,'leaving the pier side is not a new land bridge');
 const frame=frameAt(shipPosition.x,shipPosition.z,WATER).multiply(new THREE.Matrix4().makeRotationY(shipYaw));
 for(let x=-harbor.shipLength/2;x<=harbor.shipLength/2+.001;x+=.25)for(let z=-harbor.shipBeam/2;z<=harbor.shipBeam/2+.001;z+=.19){
  const world=new THREE.Vector3(x,0,z).applyMatrix4(frame),point=mapAt(world.normalize());
  assert.ok(terrainHeight(normalAt(point.x,point.z))<WATER-.55,'the entire vessel footprint has adequate natural water depth');
  assert.equal(harborFootprint(point,.25),false,'the ship does not intersect the pier');assert.ok(point.x<80&&point.x>0,'the berth fits the expanded coast map');
 }
 for(const [i,[x,z]] of [[-1,-1],[1,-1],[1,1],[-1,1]].entries()){
  const expected=mapAt(new THREE.Vector3(x*harbor.shipLength/2,0,z*harbor.shipBeam/2).applyMatrix4(frame).normalize()),actual=shipOutline()[i];
  assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<1e-10,'the ship minimap outline follows its actual rendered frame');
 }
});

test('all movement modes cross the bank and the open T junction in both directions',()=>{
 for(const hz of [30,60,120])for(const mode of modes){
  const sim=createGlobeSimulation(),bank=harborMapPoint(-3,0);Object.assign(sim.body,bank);dry(sim.body,'shore approach');
  walkTo(sim,harborArrival,hz,mode);walkTo(sim,harborMapPoint(8,3),hz,mode);walkTo(sim,harborArrival,hz,mode);walkTo(sim,bank,hz,mode);
  assert.equal(sim.inside,null);assert.ok(Math.abs(heightAt(harborArrival)-harborHeight(harborArrival))<1e-10,'movement uses the same physical deck height');
 }
});

test('every perimeter rail stops walking, running, crouching and jumping at multiple rates',()=>{
 const approaches=[
  {start:[3,-1],goal:[3,-4]},{start:[3,1],goal:[3,4]},
  {start:[8.5,-3.6],goal:[8.5,-6]},{start:[8.5,3.6],goal:[8.5,6]},
  {start:[9.5,0],goal:[13,0]},{start:[7.5,-2.8],goal:[5,-2.8]},{start:[7.5,2.8],goal:[5,2.8]},
 ];
 for(const hz of [30,60,120])for(const mode of modes)for(const approach of approaches){
  const sim=createGlobeSimulation(),start=harborMapPoint(...approach.start),goal=harborMapPoint(...approach.goal);Object.assign(sim.body,start);sim.crouch(mode==='crouch');
  for(let tick=0;tick<hz*3;tick++){if(mode==='jump'&&tick%Math.round(hz*1.2)===0)sim.jump();sim.step(1/hz,inputTo(sim.body,goal,mode));dry(sim.body,'outer harbor rail');assert.equal(harborFootprint(sim.body),true)}
  const p=harborLocalPoint(sim.body),nearest=harborRails.reduce((best,rail)=>Math.min(best,Math.hypot(Math.max(rail.x0-p.x,0,p.x-rail.x1),Math.max(rail.z0-p.z,0,p.z-rail.z1))),Infinity);
  assert.ok(nearest>=harbor.bodyRadius-1e-5&&nearest<harbor.bodyRadius+.16,'the body stops against the rail clearance rather than the water edge');
  sim.jump();sim.step(100,inputTo(sim.body,goal,'jump'));dry(sim.body,'capped long frame');assert.equal(harborFootprint(sim.body),true);
 }
});

test('diagonal pressure can slide along a rail without crossing it',()=>{
 for(const hz of [30,60,120]){
  const sim=createGlobeSimulation();Object.assign(sim.body,harborMapPoint(1,-1.1));const goal=harborMapPoint(5,-3);
  for(let tick=0;tick<hz;tick++){sim.step(1/hz,inputTo(sim.body,goal,'run'));dry(sim.body,'diagonal harbor movement')}
  const p=harborLocalPoint(sim.body);assert.ok(p.x>2.5,'Ivan can continue along the pier while a side rail blocks outward movement');assert.ok(p.z> -harbor.halfWidth+harbor.railWidth+harbor.bodyRadius-1e-5);
 }
});
