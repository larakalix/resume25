import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorldSimulation} from '../src/experience/explorer/simulation.ts';
import {createPopulation} from '../src/experience/explorer/population.ts';
import {surfaceDistance} from '../src/experience/explorer/planet.ts';
import {isWater,onBridge} from '../src/experience/explorer/terrain.ts';
import {obstacles} from '../src/experience/explorer/village-layout.ts';
import {createPetArt} from '../src/experience/explorer/pet-art.ts';
import {createArtKit} from '../src/experience/explorer/art-kit.ts';
import {pets} from '../src/experience/explorer/world-data.ts';
import * as THREE from 'three';
const far={x:75,z:20},idle={x:0,forward:0,run:false};
function run(p,seconds,player=far){for(let i=0;i<seconds*60;i++)p.step(1/60,player);}
test('every villager and pet roams, avoids buildings/water, and continues beyond its first route',()=>{
 const p=createPopulation(),actors=[...p.people,...p.animals],initial=structuredClone(actors),travel=actors.map(()=>0);
 for(let i=0;i<7200;i++){
  const before=actors.map(a=>({...a}));p.step(1/60,far);
  actors.forEach((a,j)=>{travel[j]+=surfaceDistance(a,before[j]);assert.ok(!isWater(a,.25)||onBridge(a));for(const obstacle of obstacles)assert.ok(surfaceDistance(a,obstacle)>.25+obstacle.radius-.01,a.id);});
 }
 actors.forEach((a,j)=>{assert.ok(travel[j]>30,`${a.id} keeps exploring`);assert.ok(surfaceDistance(a,initial[j])>3);});
});
test('approach stops a resident, conversation holds it, and departure resumes walking with hysteresis',()=>{
 const p=createPopulation();run(p,5);const actor=p.people[0],point={x:actor.x+.5,z:actor.z+1};
 p.step(1/60,point);assert.equal(actor.mode,'chatting');assert.equal(actor.speed,0);const stopped={...actor};
 run(p,2,point);assert.deepEqual({x:actor.x,z:actor.z},{x:stopped.x,z:stopped.z});
 p.setConversation(actor.id);run(p,4,far);assert.equal(actor.mode,'chatting');assert.deepEqual({x:actor.x,z:actor.z},{x:stopped.x,z:stopped.z});
 p.setConversation(null);run(p,12,far);assert.ok(surfaceDistance(actor,stopped)>1);
});
test('live visits find moving characters, safe arrivals and the requested nearby interaction',()=>{
 const s=createWorldSimulation();for(let i=0;i<1800;i++)s.step(1/60,idle);
 for(const actor of [...s.population.people,...s.population.animals]){s.visit(actor.id);assert.equal(s.nearest(),actor.id);assert.ok(surfaceDistance(s.body,actor)<3);assert.ok(!isWater(s.body,.3)||onBridge(s.body));}
});
test('pet actions react, following is reversible, reduced motion holds ambient actors and reset restores all state',()=>{
 const p=createPopulation(),pet=p.animals[0];assert.equal(p.interactPet('patch','pet').affection,1);assert.equal(p.interactPet('patch','play').playing,true);
 assert.equal(p.interactPet('patch','follow').following,true);run(p,3,{x:0,z:20});assert.ok(surfaceDistance(pet,{x:0,z:20})<8);
 assert.equal(p.interactPet('patch','follow').following,false);p.setReduced(true);const before=structuredClone([...p.people,...p.animals]);run(p,5);
 [...p.people,...p.animals].forEach((a,i)=>assert.deepEqual({x:a.x,z:a.z},{x:before[i].x,z:before[i].z}));
 p.reset();assert.equal(p.animals[0].affection,0);assert.equal(p.animals[0].following,false);
});
test('pet motion articulates a shared local model and reduced motion holds paws and tail',()=>{
 const kit=createArtKit(new THREE.Scene()),p=createPopulation(),pet=createPetArt(kit,pets[0]);
 p.animals[0].speed=1.5;pet.update(.1,p.animals[0],false,1);pet.avatar.updateMatrixWorld(true);const before=pet.avatar.toJSON();
 pet.update(.1,p.animals[0],false,1.1);pet.avatar.updateMatrixWorld(true);assert.notDeepEqual(pet.avatar.toJSON().object,before.object);
 pet.update(.1,p.animals[0],true,2);pet.avatar.updateMatrixWorld(true);const fixed=pet.avatar.toJSON().object;pet.update(.1,p.animals[0],true,3);pet.avatar.updateMatrixWorld(true);assert.deepEqual(pet.avatar.toJSON().object,fixed);kit.dispose();
});

test('a following pet routes across the bridge instead of walking into water',()=>{
 const p=createPopulation(),pet=p.animals[0];Object.assign(pet,{x:0,z:5});p.interactPet('patch','follow');
 const player={x:13,z:5};run(p,25,player);assert.ok(surfaceDistance(pet,player)<4.7);assert.ok(!isWater(pet,.25)||onBridge(pet));
});
