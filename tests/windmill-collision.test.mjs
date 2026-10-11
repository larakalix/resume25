import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {windmill} from '../src/experience/globe/windmill.ts';
import {insideRoundFootprint} from '../src/experience/globe/building-footprint.ts';
import {blocked,targets,mapStops} from '../src/experience/globe/layout.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {mapAt,wet,distance,RADIUS} from '../src/experience/globe/geography.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';

const idle={x:0,forward:0,run:false},frame=frameAt(windmill.x,windmill.z),inverse=frame.clone().invert();
const mapLocal=(x,z)=>mapAt(new THREE.Vector3(x,0,z).applyMatrix4(frame).normalize());
const localPoint=point=>new THREE.Vector3().setFromMatrixPosition(frameAt(point.x,point.z)).applyMatrix4(inverse);
const towerDistance=point=>{const local=localPoint(point);return Math.hypot(local.x,local.z)};
const walls=[{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
function outside(point,label){assert.equal(insideRoundFootprint(point,windmill),false,`${label}: outside the visible tower`);assert.equal(wet(point),false,`${label}: dry ground`)}

test('the rendered windmill cylinder has a solid round footprint in its actual tangent frame',()=>{
 assert.equal(blocked(windmill),true,'regression: the rendered center was previously unblocked');
 for(let x=-2.2;x<=2.2;x+=.11)for(let z=-2.2;z<=2.2;z+=.11){
  const point=mapLocal(x,z),local=localPoint(point),radius=Math.hypot(local.x,local.z);
  assert.equal(insideRoundFootprint(point,windmill),radius<=windmill.radius);
  assert.equal(insideRoundFootprint(point,windmill,.32),radius<=windmill.radius+.32);
  if(radius<windmill.radius+.31)assert.equal(blocked(point),true,'the tower wall and body clearance are solid');
 }
 const diagonal=mapLocal(windmill.radius*.97,windmill.radius*.97);
 assert.equal(blocked(diagonal),false,'the circular base leaves clear rounded corners instead of a square barrier');
 for(const side of walls){
  assert.equal(blocked(mapLocal(side.x*(windmill.radius-.1),side.z*(windmill.radius-.1))),true);
  assert.equal(blocked(mapLocal(side.x*(windmill.radius+.5),side.z*(windmill.radius+.5))),false);
 }
});

test('walk, run, crouch and jump cannot cross any windmill wall at 30, 60 or 120 Hz',()=>{
 for(const hz of [30,60,120])for(const mode of ['walk','run','crouch','jump'])for(const side of walls){
  const sim=createGlobeSimulation(),start=mapLocal(side.x*(windmill.radius+1.7),side.z*(windmill.radius+1.7));
  Object.assign(sim.body,start);sim.crouch(mode==='crouch');assert.equal(blocked(start),false,'approach starts in clear ground');
  const input={x:-side.x,forward:side.z,run:mode==='run'||mode==='jump'};
  for(let tick=0;tick<hz*4;tick++){
   if(mode==='jump'&&tick%Math.round(hz*1.2)===0)sim.jump();
   sim.step(1/hz,input);outside(sim.body,`${hz}Hz ${mode}`);
   assert.ok(towerDistance(sim.body)>=windmill.radius+.31,'the body stays clear of the physical tower wall');
  }
  assert.ok(towerDistance(sim.body)<windmill.radius+.55,'the approach reaches the wall instead of stopping elsewhere');
  sim.jump();sim.step(100,input);outside(sim.body,'capped long frame');
 }
});

test('diagonal movement slides around the circular tower rather than cutting through it',()=>{
 for(const hz of [30,60,120])for(const side of walls){
  const sim=createGlobeSimulation(),tangent={x:side.z,z:-side.x},dx=tangent.x-side.x*.35,dz=tangent.z-side.z*.35;
  Object.assign(sim.body,mapLocal(side.x*(windmill.radius+.4),side.z*(windmill.radius+.4)));let closest=Infinity;
  assert.equal(blocked(sim.body),false,'diagonal approach begins clear');
  for(let tick=0;tick<hz;tick++){sim.step(1/hz,{x:dx,forward:-dz,run:true});outside(sim.body,'diagonal sliding');closest=Math.min(closest,towerDistance(sim.body))}
  const end=localPoint(sim.body);assert.ok(end.x*tangent.x+end.z*tangent.z>3,'the character continues along and past the tower');
  assert.ok(closest>=windmill.radius+.31&&closest<windmill.radius+.4,'the diagonal approach meets the clearance shell');
 }
});

test('Patch stays outside the tower while following Ivan around a clear route',()=>{
 for(const hz of [30,60,120]){
  const sim=createGlobeSimulation(),pet=sim.animals.find(animal=>animal.id==='patch');
  Object.assign(sim.body,mapLocal(-3.6,0));Object.assign(pet,mapLocal(-3.6,1.9));sim.action('patch','follow');
  function check(){outside(sim.body,'owner route');outside(pet,'companion route')}
  for(const goal of [mapLocal(-3.6,-3),mapLocal(3.6,-3),mapLocal(3.6,0)]){
   sim.halt();let ticks=0;
   while(distance(sim.body,goal)>.12&&ticks<hz*10){
    const dx=(goal.x-sim.body.x)*Math.cos(sim.body.z/RADIUS),dz=goal.z-sim.body.z,length=Math.hypot(dx,dz);
    sim.step(1/hz,{x:dx/length,forward:-dz/length,run:false});check();ticks++;
   }
   assert.ok(distance(sim.body,goal)<.15,'Ivan can take the route around the tower');
   sim.halt();for(let tick=0;tick<hz*2;tick++){sim.step(1/hz,idle);check()}
  }
  assert.ok(distance(pet,sim.body)<2.2,'the companion follows the clear route around the windmill');
 }
});

test('the existing windmill arrival and sail toggle remain accessible',()=>{
 const sim=createGlobeSimulation(),target=targets.find(target=>target.id==='windmill');
 assert.ok(mapStops.includes(target.id));sim.visit(target.id);
 assert.equal(sim.nearest(),target.id);assert.equal(sim.inside,null);assert.equal(blocked(sim.body),false);assert.equal(wet(sim.body),false);
 assert.ok(distance(sim.body,target)<target.radius);assert.ok(towerDistance(sim.body)>windmill.radius+.32);
 const initial=sim.objects.windmill;sim.action(target.id,'toggle');assert.equal(sim.objects.windmill,!initial);sim.action(target.id,'toggle');assert.equal(sim.objects.windmill,initial);
 sim.reset();assert.equal(sim.objects.windmill,true);
});
