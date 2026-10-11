import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createStreetSimulation} from '../src/experience/street/simulation.ts';
import {createStreetCollision} from '../src/experience/street/collision.ts';
import {streetTargets,streetDistance,roadCenter,laneWidth,streetSpawn,groundY} from '../src/experience/street/level.ts';
import {createStreetCharacter} from '../src/experience/street/character.ts';
import {createArtKit} from '../src/experience/explorer/art-kit.ts';
import {MOTION_NAMES} from '../src/experience/explorer/character-asset.ts';
import {cityResidents} from '../src/experience/globe/city-residents.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
const idle={x:0,forward:0,run:false};
function tick(s,seconds,input=idle){for(let i=0;i<seconds*60;i++)s.step(1/60,input);}
test('street movement is normalized, bounds follow the lane and jump lands',()=>{
 const straight=createStreetSimulation(),diagonal=createStreetSimulation();tick(straight,.5,{...idle,forward:1});tick(diagonal,.5,{...idle,x:1,forward:1});assert.ok(Math.abs(streetDistance(straight.body,streetSpawn)-streetDistance(diagonal.body,streetSpawn))<.01);
 tick(straight,30,{...idle,forward:1});assert.ok(straight.body.z>=-23.5);assert.ok(Math.abs(straight.body.x-roadCenter(straight.body.z))<=laneWidth(straight.body.z)+.001);straight.jump();tick(straight,2);assert.equal(straight.body.y,0);assert.equal(straight.body.vy,0);
});
test('six direct targets preserve professional reading plus exactly one villager and pet',()=>{
 assert.equal(streetTargets.filter(t=>t.kind==='resident').length,1);assert.equal(streetTargets.filter(t=>t.kind==='pet').length,1);const s=createStreetSimulation();for(const target of streetTargets){s.visit(target.id);assert.equal(s.nearest(),target.id);assert.ok(streetDistance(s.body,s.target(target.id))<target.radius);}
});
test('Mira roams, holds for conversation and resumes; pet actions and reset remain independent',()=>{
 const s=createStreetSimulation(),initial={...s.mira};Object.assign(s.body,{x:0,z:12});tick(s,4);assert.ok(streetDistance(s.mira,initial)>.1);s.setConversation('mira');const stopped={...s.mira};tick(s,3);assert.equal(s.mira.x,stopped.x);assert.equal(s.mira.z,stopped.z);assert.equal(s.mira.mode,'chatting');s.setConversation(null);tick(s,6);assert.ok(streetDistance(s.mira,stopped)>.1);
 assert.equal(s.interactPet('patch','pet').affection,1);assert.equal(s.interactPet('patch','play').playing,true);assert.equal(s.interactPet('patch','follow').following,true);s.reset();assert.equal(s.pet.affection,0);assert.equal(s.pet.following,false);
});
test('reduced motion holds ambient actors and zero-time renders do not advance simulation',()=>{
 const s=createStreetSimulation();s.setReduced(true);const mira={...s.mira},pet={...s.pet};tick(s,3);assert.equal(s.mira.x,mira.x);assert.equal(s.mira.z,mira.z);assert.equal(s.pet.x,pet.x);assert.equal(s.pet.z,pet.z);const body={...s.body};s.step(0,{x:1,forward:1,run:true});assert.deepEqual(s.body,body);
});
test('BVH capsule contact and camera rays respect a physical street wall',()=>{
 const geometry=new THREE.BoxGeometry(.3,3,5);geometry.translate(0,1.5,2);const collision=createStreetCollision(geometry),point={x:.12,z:2};collision.constrain(point,{x:1,z:2});assert.ok(point.x>.35,'capsule is separated from the wall');const distance=collision.cameraDistance(new THREE.Vector3(2,1,2),new THREE.Vector3(-2,1,2));assert.ok(distance>1&&distance<2);geometry.dispose();
});
test('original short cast shares PBR geometry while motion, faces and hats remain independent',()=>{
 const kit=createArtKit(new THREE.Scene(),{shading:'soft'}),hero=createStreetCharacter(kit),resident=createStreetCharacter(kit,true);
 assert.equal(hero.source,'original');assert.deepEqual(hero.clips.map(c=>c.name),MOTION_NAMES);const greeting=hero.clips.find(c=>c.name==='wave'),wave=greeting.tracks.find(t=>t.name==='lowerarm_r.quaternion');assert.ok(wave.times.length>=16);assert.equal(wave.times[0],0);assert.ok(Math.abs(wave.times.at(-1)-greeting.duration)<1e-6);assert.ok(new Set(Array.from(wave.values).map(v=>v.toFixed(3))).size>10,'wave is articulated across its cycle');assert.notEqual(hero.head,resident.head);
 hero.avatar.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(hero.avatar),headBounds=new THREE.Box3().setFromObject(hero.head);assert.ok(bounds.max.y>1.8&&bounds.max.y<2.2);assert.ok(bounds.min.y>=-.001);assert.ok(headBounds.getSize(new THREE.Vector3()).y/bounds.getSize(new THREE.Vector3()).y>.3);
 const leg=hero.avatar.getObjectByName('thigh_l'),before=leg.quaternion.clone();for(let i=0;i<25;i++)hero.motion.update(1/60,{speed:2.4,y:0,vy:0,waving:false,reduced:false});assert.ok(before.angleTo(leg.quaternion)>.01);assert.ok(resident.avatar.getObjectByName('thigh_l').quaternion.angleTo(before)<.1);
 hero.hats.set('christmas');assert.equal(hero.head.getObjectByName('seasonal-hat').visible,true);hero.hats.set('everyday');assert.equal(hero.head.getObjectByName('seasonal-hat').visible,false);assert.equal(resident.head.getObjectByName('seasonal-hat').visible,false);
 let pbr=0;hero.avatar.traverse(o=>{if(o.isMesh){assert.ok(o.material.isMeshStandardMaterial);pbr++;}});assert.ok(pbr>10);hero.dispose();resident.dispose();kit.dispose();
});
test('the stream is crossed only on the elevated bridge and every direct arrival remains on dry ground',()=>{
 assert.equal(groundY(4),0);assert.ok(groundY(-7)>.3);assert.equal(groundY(-11),0);const s=createStreetSimulation();tick(s,8,{x:1,forward:1,run:true});assert.ok(Math.abs(s.body.x-roadCenter(s.body.z))<=laneWidth(s.body.z)+.01);
 for(const target of streetTargets){s.visit(target.id);assert.ok(Math.abs(s.body.x-roadCenter(s.body.z))<=laneWidth(s.body.z));}
});
test('visible shoe geometry stays near the floor through idle, walk and run blends without adding character draws',()=>{
 const kit=createArtKit(new THREE.Scene(),{shading:'soft'}),hero=createStreetCharacter(kit),point=new THREE.Vector3(),up=new THREE.Vector3();let meshes=0,triangles=0;
 hero.avatar.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3}});
 assert.ok(meshes<=16);assert.ok(triangles<=30000);
 for(const speed of [0,2.65,5.2,0])for(let frame=0;frame<120;frame++){
  hero.motion.update(1/60,{speed,y:0,vy:0,waving:false,reduced:false});if(frame%6)continue;hero.avatar.updateMatrixWorld(true);
  for(const side of ['l','r']){
   const foot=hero.avatar.getObjectByName('foot_'+side);let lowest=Infinity;
   foot.traverse(object=>{if(object.isMesh){const positions=object.geometry.attributes.position;for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);lowest=Math.min(lowest,point.y)}}});
   assert.ok(lowest>=-.012,`visible sole clips the floor at speed ${speed}: ${lowest}`);assert.ok(lowest<.22);
   up.set(0,1,0).applyQuaternion(foot.getWorldQuaternion(new THREE.Quaternion()));assert.ok(up.y>.98,'sole counter-rotation prevents steep toe tipping');
  }
 }
 const socket=hero.head.getObjectByName('seasonal-hat');for(const hat of ['thanksgiving','christmas','halloween','birthday'])hero.hats.set(hat);const count=kit.geometries.length;for(const hat of ['birthday','christmas','thanksgiving','halloween'])hero.hats.set(hat);assert.equal(kit.geometries.length,count,'seasonal choices reuse cached geometry');assert.equal(socket.children.filter(child=>child.visible).length,1);hero.hats.set('everyday');assert.equal(socket.visible,false);hero.dispose();kit.dispose();
});


test('the cast has six distinct compact hair silhouettes while faces and seasonal hats remain clear',()=>{
 const kit=createArtKit(new THREE.Scene(),{shading:'soft'}),styles=['swept','crop','bob','curls','bun','quiff'],signatures=[];
 for(const hairstyle of styles){
  const actor=createStreetCharacter(kit,false,{hairstyle}),headMesh=actor.head.children.find(child=>child.isMesh),positions=headMesh.geometry.getAttribute('position');
  assert.equal(actor.head.userData.hairstyle,hairstyle);assert.ok([...positions.array].every(Number.isFinite));
  signatures.push(`${positions.count}:${Array.from(positions.array).reduce((sum,value,index)=>sum+value*((index%19)+1),0).toFixed(5)}`);
  actor.avatar.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(actor.avatar);assert.ok(bounds.max.y<2.2&&bounds.min.y>=-.001,hairstyle+' stays short');
  assert.ok(bounds.max.x-bounds.min.x<1.1,hairstyle+' has no oversized dangling hair');
  for(const hat of ['christmas','halloween','birthday','thanksgiving']){actor.hats.set(hat);assert.equal(actor.head.getObjectByName('seasonal-hat').visible,true)}
  actor.hats.set('everyday');assert.equal(actor.head.getObjectByName('seasonal-hat').visible,false);actor.dispose();
 }
 assert.equal(new Set(signatures).size,styles.length,'hair changes actual geometry, not only its colour');
 assert.equal(new Set(cityResidents.map(resident=>resident.hairstyle)).size,cityResidents.length,'outdoor city walkers have individual hair silhouettes');kit.dispose();
});

test('every live city resident takes articulated steps at its actual slow walking speed and scale',()=>{
 for(const hz of [30,60,120]){
  const kit=createArtKit(new THREE.Scene(),{shading:'soft'}),sim=createGlobeSimulation(),actors=cityResidents.map(source=>createStreetCharacter(kit,true,source)),samples=actors.map(()=>({walking:0,last:null,turn:0,lift:0}));
  for(let frame=0;frame<hz*8;frame++){
   sim.step(1/hz,{x:0,forward:0,run:false});
   for(const [index,source] of cityResidents.entries()){
    const actor=actors[index],state=sim.walkers.find(walker=>walker.id===source.id),sample=samples[index];actor.motion.update(1/hz,{speed:state.speed,y:0,vy:0,waving:false,reduced:false});
    if(state.speed<.3)continue;sample.walking++;const calf=actor.avatar.getObjectByName('calf_l'),rotation=calf.quaternion.clone();
    if(sample.last)sample.turn+=sample.last.angleTo(rotation);sample.last=rotation;
    actor.avatar.updateMatrixWorld(true);sample.lift=Math.max(sample.lift,actor.avatar.getObjectByName('foot_l').getWorldPosition(new THREE.Vector3()).y/source.scale);
   }
  }
  for(const [index,source] of cityResidents.entries()){
   const sample=samples[index];assert.ok(sample.walking>hz,`${source.name} really moved at ${hz}Hz`);assert.ok(sample.turn>1,`${source.name} moves knees instead of sliding at ${hz}Hz`);assert.ok(sample.lift>.21,`${source.name} lifts a foot during swing`);actors[index].dispose();
  }
  kit.dispose();
 }
});
