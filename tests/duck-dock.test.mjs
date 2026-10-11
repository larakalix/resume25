import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {duckDock,dockMapPoint,dockLocalPoint,dockHeight,dockFootprint,duckDockBlocked,dockRails,dockOutline,duckFeedingPoint} from '../src/experience/globe/duck-dock.ts';
import {normalAt,mapAt,terrainHeight,RADIUS,WATER} from '../src/experience/globe/terrain.ts';
import {heightAt,wet} from '../src/experience/globe/geography.ts';
import {createGlobeArt,frameAt} from '../src/experience/globe/art-kit.ts';
import {buildDuckDock} from '../src/experience/globe/duck-dock-art.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
const d=duckDock;

test('the dock has one real flat plane, a dry bank apron and a water-only feeding point beyond the far rail',()=>{
 const up=normalAt(d.x,d.z);
 for(const x of [d.apronStart,-1.1,-.7,0,1.3,d.x1])for(const z of [-.84,0,.84]){
  const p=dockMapPoint(x,z),local=dockLocalPoint(p),height=dockHeight(p),n=normalAt(p.x,p.z);
  assert.ok(dockFootprint(p));assert.notEqual(height,null);assert.ok(Math.abs(local.x-x)<1e-10&&Math.abs(local.z-z)<1e-10);assert.ok(Math.abs((RADIUS+height)*(n.x*up.x+n.y*up.y+n.z*up.z)-(RADIUS+d.level))<1e-10);
  assert.ok(height-WATER>.6);assert.equal(heightAt(p),height);assert.equal(wet(p),false);
 }
 const entry=dockMapPoint(d.apronStart,0),threshold=dockHeight(entry)-terrainHeight(normalAt(entry.x,entry.z));assert.ok(threshold>0&&threshold<.12,'entry meets dry land with a small step');
 assert.equal(dockFootprint(dockMapPoint(d.apronStart-.01,0)),false);assert.equal(dockFootprint(dockMapPoint(d.x1+.01,0)),false);
 assert.equal(dockHeight(dockMapPoint(1,d.halfWidth+.01)),null);assert.equal(dockFootprint(dockMapPoint(-1.2,.99)),true);assert.equal(dockFootprint(dockMapPoint(1,.99)),false);assert.equal(dockFootprint(dockMapPoint(1,.99),.15),true);
 assert.equal(dockLocalPoint({x:d.x+Math.PI*RADIUS,z:-d.z}),null);assert.equal(dockOutline().length,8);
 const food=dockLocalPoint(duckFeedingPoint);assert.ok(Math.abs(food.x-(d.x1+.8))<1e-10);assert.equal(dockFootprint(duckFeedingPoint,.5),false);assert.ok(terrainHeight(normalAt(duckFeedingPoint.x,duckFeedingPoint.z))<WATER-.3);
});

test('rounded rail collision agrees with all three visible borders and leaves the whole bank entrance open',()=>{
 for(const side of [-1,1]){
  const limit=d.halfWidth-d.railWidth-d.bodyRadius;
  assert.equal(duckDockBlocked(dockMapPoint(1,side*(limit-.01))),false);assert.equal(duckDockBlocked(dockMapPoint(1,side*(limit+.01))),true);
 }
 const limit=d.x1-d.railWidth-d.bodyRadius;assert.equal(duckDockBlocked(dockMapPoint(limit-.01,0)),false);assert.equal(duckDockBlocked(dockMapPoint(limit+.01,0)),true);
 for(const x of [d.apronStart-.2,d.apronStart,d.x0,d.railStart])assert.equal(duckDockBlocked(dockMapPoint(x,0)),false);
 const rail=dockRails[0];assert.equal(duckDockBlocked(dockMapPoint(rail.x0-.2,rail.z0-.2)),true);assert.equal(duckDockBlocked(dockMapPoint(rail.x0-.24,rail.z0-.24)),false,'a rounded endpoint does not become an oversized square obstacle');
});

test('walking, running, jumping and crouching cannot cross dock rails at 30, 60 or 120 Hz',()=>{
 for(const hz of [30,60,120])for(const mode of ['walk','run','jump','crouch'])for(const border of [-1,0,1]){
  const sim=createGlobeSimulation();Object.assign(sim.body,dockMapPoint(.45,0));sim.setReduced(true);if(mode==='jump')sim.jump();if(mode==='crouch')sim.crouch(true);
  for(let frame=0;frame<hz*3;frame++){
   sim.step(1/hz,{x:border===0?1:0,forward:-border,run:mode==='run'||mode==='jump'});const p=dockLocalPoint(sim.body);
   assert.equal(duckDockBlocked(sim.body),false,`${hz}Hz ${mode} ${border}`);assert.equal(wet(sim.body),false);assert.ok(p.x<=d.x1-d.railWidth-d.bodyRadius+.001);assert.ok(Math.abs(p.z)<=d.halfWidth-d.railWidth-d.bodyRadius+.001);
  }
  const p=dockLocalPoint(sim.body);assert.ok(border===0?p.x>2:Math.abs(p.z)>.25,'the character actually reaches the border');
 }
});

test('the bank entrance can be walked onto and back off without water or collision gaps',()=>{
 const sim=createGlobeSimulation();Object.assign(sim.body,dockMapPoint(d.apronStart-.5,0));sim.setReduced(true);
 for(let i=0;i<150;i++){sim.step(1/60,{x:1,forward:0,run:false});assert.equal(wet(sim.body),false);assert.equal(duckDockBlocked(sim.body),false)}assert.ok(dockLocalPoint(sim.body).x>1);
 for(let i=0;i<130;i++){sim.step(1/60,{x:-1,forward:0,run:false});assert.equal(wet(sim.body),false);assert.equal(duckDockBlocked(sim.body),false)}assert.ok(dockLocalPoint(sim.body).x<d.apronStart);
});

test('rendered plank tops match the walk plane, support piles extend below water and all dock geometry remains batch-owned',()=>{
 const a=createGlobeArt(new THREE.Scene()),group=buildDuckDock(a),inverse=frameAt(d.x,d.z,d.level).invert(),planks=[],piles=[],beams=[];a.scene.updateMatrixWorld(true);
 group.traverse(child=>{if(child.name==='dock-plank')planks.push(child);if(child.name==='dock-pile')piles.push(child);if(child.name==='dock-beam')beams.push(child)});assert.ok(planks.length>=14);assert.equal(piles.length,4);assert.equal(beams.length,2);
 for(const plank of planks)for(const x of [-.5,.5])for(const z of [-.5,.5]){
  const world=new THREE.Vector3(x,.5,z).applyMatrix4(plank.matrixWorld),p=mapAt(world.clone().normalize());assert.ok(Math.abs(world.length()-RADIUS-dockHeight(p))<1e-9,'foot support is the rendered deck top');assert.ok(Math.abs(world.clone().applyMatrix4(inverse).y)<1e-10);
 }
 for(const pile of piles){const bottom=new THREE.Vector3(0,-.5,0).applyMatrix4(pile.matrixWorld),top=new THREE.Vector3(0,.5,0).applyMatrix4(pile.matrixWorld);assert.ok(bottom.length()-RADIUS<WATER-.5);assert.ok(top.clone().applyMatrix4(inverse).y>d.railHeight)}
 for(const beam of beams){beam.geometry.computeBoundingBox();const top=new THREE.Vector3(0,beam.geometry.boundingBox.max.y,0).applyMatrix4(beam.matrixWorld).applyMatrix4(inverse);assert.ok(top.y>=-d.thickness-.001&&top.y<0,'underdeck beams overlap the plank bottoms')}
 const owned=a.kit.geometries.filter(geometry=>geometry!==a.kit.box),batch=a.finish();assert.ok(batch.meshes.length);assert.equal(a.kit.staticMeshes.length,0);let disposed=0;owned.forEach(geometry=>geometry.addEventListener('dispose',()=>disposed++));a.dispose();assert.equal(disposed,owned.length);
});
