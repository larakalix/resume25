import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {normalAt,mapAt,terrainHeight,RADIUS,WATER,heightAt,wet,distance,spawn} from '../src/experience/globe/geography.ts';
import {targets,buildings,blocked,treeSites} from '../src/experience/globe/layout.ts';
import {frameAt,createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {dialogueFor} from '../src/experience/globe/conversation.ts';
import {formatResumeDate} from '../src/utils/resume-date.ts';
import {caveTargets} from '../src/experience/globe/wild-land.ts';
import {homeLandingTargets,isHomeRoom} from '../src/experience/globe/home-layout.ts';
import {roomLabels} from '../src/experience/globe/rooms.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
const idle={x:0,forward:0,run:false};
function tick(s,seconds,input=idle){for(let i=0;i<Math.ceil(seconds*60);i++)s.step(1/60,input);}
test('new spherical terrain shares a radial tangent frame and physically submerged river/pond',()=>{
 for(const p of [{x:0,z:0},{x:35,z:29},{x:-40,z:-38}]){const n=normalAt(p.x,p.z),back=mapAt(n);assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-10);assert.ok(Math.abs(back.x-p.x)+Math.abs(back.z-p.z)<1e-8);const matrix=frameAt(p.x,p.z),up=new THREE.Vector3().setFromMatrixColumn(matrix,1),point=new THREE.Vector3().setFromMatrixPosition(matrix);assert.ok(Math.abs(matrix.determinant()-1)<1e-8);assert.ok(Math.abs(point.length()-RADIUS-heightAt(p))<1e-8);assert.ok(up.dot(point.clone().normalize())>.99999)}
 assert.ok(terrainHeight(normalAt(21,5))<WATER);assert.ok(wet({x:21,z:5}));assert.ok(wet({x:8,z:-2}));assert.ok(!wet(spawn));
});
test('all authored and live arrivals reach the intended target on dry clear ground',()=>{
 const s=createGlobeSimulation();tick(s,8);for(const t of targets){s.visit(t.id);assert.equal(s.nearest(),t.id,t.id);assert.equal(s.inside,t.room??null);if(!t.room){assert.equal(wet(s.body),false,t.id);assert.equal(blocked(s.body),false,t.id)}}
 const outdoorDoors=targets.filter(target=>target.kind==='door'&&!target.room),caveIds=new Set(caveTargets.map(target=>target.id));
 assert.deepEqual(buildings.filter(building=>building.enter).map(building=>building.enter).sort(),outdoorDoors.filter(target=>!caveIds.has(target.id)).map(target=>target.interior).sort(),'every enterable building has exactly one exterior entrance');
 assert.deepEqual(outdoorDoors.filter(target=>caveIds.has(target.id)).map(target=>target.interior).sort(),['crystal-cave','tide-cave'],'both cave discoveries have their own exterior doors');
 assert.equal(new Set(outdoorDoors.map(target=>target.interior)).size,outdoorDoors.length,'floor landings must not duplicate outdoor entrances');
 assert.deepEqual(targets.filter(target=>target.kind==='door'&&target.room).map(target=>target.id).sort(),homeLandingTargets.map(target=>target.id).sort(),'home stairs are interior room links');
 assert.deepEqual(new Set(targets.filter(target=>target.kind==='door').map(target=>target.interior)),new Set(Object.keys(roomLabels)),'every published room has an entry');
 assert.ok(buildings.some(building=>building.enter==='home'));assert.ok(buildings.some(building=>!building.enter));
});
test('direct stopping points keep their follow-camera sightline clear of full canopy volumes',()=>{
 for(const target of targets.filter(t=>!t.room)){
  const frame=frameAt(target.arrival.x,target.arrival.z),look=new THREE.Vector3(0,1.1,-1.3).applyMatrix4(frame),camera=new THREE.Vector3(.8,5.4,7).applyMatrix4(frame),line=new THREE.Line3(look,camera);
  for(const tree of treeSites.filter(t=>!t.pine))for(let j=0;j<3;j++){
   const center=new THREE.Vector3((j-1)*.65*tree.size,3*tree.size+(j%2)*.65*tree.size,j===1?.15:0).applyMatrix4(frameAt(tree.x,tree.z)),nearest=line.closestPointToPoint(center,true,new THREE.Vector3());
   assert.ok(center.distanceTo(nearest)>(j===1?1.65:1.35)*tree.size,`${target.id}: canopy obscures the player`);
  }
 }
});
test('walk diagonals normalize; running is faster and crouching changes speed and prevents jumping',()=>{
 const walk=createGlobeSimulation(),diagonal=createGlobeSimulation(),run=createGlobeSimulation(),crouch=createGlobeSimulation();
 for(const s of [walk,diagonal,run,crouch])Object.assign(s.body,{x:5,z:23});crouch.crouch(true);
 tick(walk,.4,{...idle,forward:1});tick(diagonal,.4,{...idle,forward:1,x:1});tick(run,.4,{...idle,forward:1,run:true});tick(crouch,.4,{...idle,forward:1,run:true});
 assert.ok(Math.abs(distance(walk.body,{x:5,z:23})-distance(diagonal.body,{x:5,z:23}))<.02);assert.ok(run.body.speed>walk.body.speed*1.8);assert.ok(crouch.body.speed<walk.body.speed*.5);crouch.jump();assert.equal(crouch.body.vy,0);crouch.crouch(false);crouch.jump();assert.ok(crouch.body.vy>0);tick(crouch,.2);const velocity=crouch.body.vy;crouch.jump();assert.equal(crouch.body.vy,velocity);tick(crouch,2);assert.equal(crouch.body.y,0);assert.equal(crouch.body.vy,0);
});
test('water blocks walking while the elevated bridge is a continuous dry crossing',()=>{
 const s=createGlobeSimulation();Object.assign(s.body,{x:0,z:1});tick(s,4,{...idle,forward:1});assert.ok(s.body.z< -8.3,'crossed to the other bank');
 for(let z=-8.25;z<.2;z+=.1){assert.equal(wet({x:0,z}),false);assert.ok(heightAt({x:0,z})>WATER+.2)}
 Object.assign(s.body,{x:8,z:3});for(let i=0;i<360;i++){s.step(1/60,{...idle,forward:1});assert.equal(wet(s.body),false)}assert.ok(s.body.z> -4,'cannot walk through the river');
});
test('all interiors have bounded walking, furniture separation and independent doors',()=>{
 const s=createGlobeSimulation();for(const room of Object.keys(roomLabels)){
  s.enter(room);assert.equal(s.inside,room);assert.ok(roomWalkable(room,s.player()),`${room}: entry is on a clear floor`);
  const upperHome=isHomeRoom(room)&&room!=='home';assert.equal(s.nearest(),upperHome?null:`exit-${room}`,'upper home floors use stairs; exterior rooms have an outside exit');
  tick(s,8,{...idle,x:1,run:true});assert.ok(s.player().x<3.46);assert.ok(roomWalkable(room,s.player()));tick(s,10,{...idle,forward:1,run:true});assert.ok(s.player().z> -3.46);assert.ok(roomWalkable(room,s.player()));
  s.leave();assert.equal(s.inside,null);const door=targets.find(target=>!target.room&&target.interior===(upperHome?'home':room));assert.ok(door,`${room}: an outside anchor exists`);assert.ok(distance(s.body,door.arrival)<.001);assert.equal(wet(s.body),false);assert.equal(blocked(s.body),false);
 }
 s.visit('lamp');assert.equal(s.inside,'workshop');assert.equal(s.nearest(),'lamp');s.visit('miso');assert.equal(s.inside,'library');assert.equal(s.nearest(),'miso');s.visit('mira');assert.equal(s.inside,null);
});
test('villagers stop nearby or during conversation and resume roaming after departure',()=>{
 const s=createGlobeSimulation(),mira=s.walkers[0],before={...mira};Object.assign(s.body,{x:5,z:23});tick(s,6);assert.ok(distance(mira,before)>.1);s.visit('mira');const near={...mira};tick(s,3);assert.equal(mira.stopped,true);assert.equal(mira.x,near.x);assert.equal(mira.z,near.z);Object.assign(s.body,{x:5,z:23});s.setEngaged('mira');tick(s,3);assert.equal(mira.x,near.x);s.setEngaged(null);tick(s,8);assert.ok(distance(mira,near)>.1);
});
test('reduced motion holds ambient actors while deliberate movement remains available; input is finite bounded',()=>{
 const s=createGlobeSimulation();s.setReduced(true);const cast=JSON.stringify([s.walkers,s.animals].map(list=>list.map(a=>({x:a.x,z:a.z}))));tick(s,5);assert.equal(JSON.stringify([s.walkers,s.animals].map(list=>list.map(a=>({x:a.x,z:a.z})))),cast);const old={...s.body};s.step(0,{x:1,forward:1,run:true});assert.deepEqual(s.body,old);s.step(NaN,{x:Infinity,forward:NaN,run:true});assert.deepEqual(s.body,old);tick(s,.2,{...idle,x:1});assert.ok(distance(s.body,old)>.2);const p={...s.body};s.step(100,{...idle,x:1});assert.ok(distance(s.body,p)<.3);
});
test('animal and environment actions change real simulation state and reset does not retain progress',()=>{
 const s=createGlobeSimulation();s.visit('patch');s.action('patch','pet');assert.equal(s.objects.affection,1);s.action('patch','play');assert.ok(s.objects.playTime>0);tick(s,3);assert.equal(s.objects.playTime,0);s.action('patch','follow');assert.equal(s.objects.following,true);Object.assign(s.body,{x:0,z:-12});for(let i=0;i<2400;i++){s.step(1/60,idle);assert.equal(wet(s.animals[0]),false)}assert.ok(s.animals[0].z< -8,'companion follows across the bridge');
 for(const id of ['windmill','bell','campfire','lamp','duck-pond','fox'])s.action(id,'toggle');assert.equal(s.objects.windmill,false);assert.equal(s.objects.bell,1);assert.equal(s.objects.campfire,true);assert.equal(s.objects.lamp,false);assert.equal(s.objects.duckFood,1);s.reset();assert.equal(s.objects.following,false);assert.equal(s.objects.affection,0);assert.equal(s.objects.bell,0);assert.equal(s.discovered.size,0);assert.equal(s.objects.campfire,false);assert.deepEqual({x:s.body.x,z:s.body.z},spawn);
});
test('discovery counts cannot exceed their total when travelling through exits',()=>{
 const s=createGlobeSimulation();for(const t of targets)s.visit(t.id);const snapshot=s.snapshot(false);assert.equal(snapshot.discovered,snapshot.total);s.visit('mira');assert.equal(s.snapshot(false).discovered,snapshot.total);
});
test('conversations project every published role and toolkit group, including content changes and current dates',async()=>{
 const source=JSON.parse(await readFile('src/content/resume.json','utf8')),host=targets.find(t=>t.id==='rue');
 for(const roles of [source.experience,source.experience.slice(1),[{id:'new',company:'Added company',role:'Added position',startDate:'2026-01',endDate:null},...source.experience]]){
  for(const [index,role] of roles.entries()){const d=dialogueFor(host,`role:${index}`,source.profile,roles,source.skillGroups);assert.ok(d.text.includes(role.company));assert.ok(d.text.includes(role.role));assert.ok(d.detail.includes(formatResumeDate(role.startDate)));assert.ok(d.detail.includes(role.endDate?formatResumeDate(role.endDate):'Present'));assert.equal(d.choices.some(c=>c.node===`role:${index+1}`),index<roles.length-1)}
 }
 for(const group of source.skillGroups){const d=dialogueFor(host,`group:${group.id}`,source.profile,[],source.skillGroups);for(const item of group.items)assert.ok(d.text.includes(item))}
 assert.equal(dialogueFor(host,'about',source.profile,[],[]).detail,source.profile.summary);assert.equal(dialogueFor(host,'contact',source.profile,[],[]).detail,source.profile.email);assert.ok(dialogueFor(host,'start',source.profile,[],[]).fictional);assert.ok(dialogueFor(targets.find(t=>t.id==='patch'),'start',source.profile,[],[]).choices.some(c=>c.action==='follow'));
});
test('landscape resources retain the same spherical coordinate frame and renderer-independent ownership',()=>{
 const scene=new THREE.Scene(),a=createGlobeArt(scene),root=a.root(20,15),normal=normalAt(20,15);root.updateMatrixWorld(true);assert.ok(new THREE.Vector3().setFromMatrixPosition(root.matrixWorld).normalize().distanceTo(new THREE.Vector3(normal.x,normal.y,normal.z))<1e-8);const part=a.block('cream',[0,1,0],[2,2,2],root);assert.ok(part.material.isMeshStandardMaterial);const batched=a.finish();assert.equal(batched.meshes.length,1);assert.ok(batched.meshes[0].geometry.attributes.position.count>0);a.dispose();
});
