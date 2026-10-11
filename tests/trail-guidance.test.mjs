import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createPassport} from '../src/experience/globe/passport.ts';
import {createTrailGuidance,roomTransition,roomGuidanceRoute,splitGuidanceRoute} from '../src/experience/globe/trail-guidance.ts';
import {secretTargets,secretDefinitions} from '../src/experience/globe/secrets.ts';
import {buildSecretArt} from '../src/experience/globe/secret-art.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {targets,blocked} from '../src/experience/globe/layout.ts';
import {wet,distance,spawn} from '../src/experience/globe/geography.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
import {longitudeLimit,worldCircumference,longitudeDelta,wrapLongitude} from '../src/experience/globe/world-expansion.ts';
import {createGuideFirefly} from '../src/experience/globe/guide-firefly.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {dialogueFor} from '../src/experience/globe/conversation.ts';

const registry=[...targets,...secretTargets.filter(secret=>!targets.some(target=>target.id===secret.id))],safe=point=>!wet(point)&&!blocked(point);
function sample(route,room=null){
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],length=room?Math.hypot(b.x-a.x,b.z-a.z):distance(a,b),steps=Math.max(1,Math.ceil(length/.1));
  for(let j=0;j<=steps;j++){const t=j/steps,p={x:room?a.x+(b.x-a.x)*t:wrapLongitude(a.x+longitudeDelta(a.x,b.x)*t),z:a.z+(b.z-a.z)*t};assert.ok(room?roomWalkable(room,p):safe(p),`${room??'world'} route crossed an obstacle at ${JSON.stringify(p)}`)}
 }
}

test('room routing points at real outside doors and explicit floor landings',()=>{
 assert.equal(roomTransition(registry,null,'home').id,'home-door');assert.equal(roomTransition(registry,null,'workshop').id,'workshop-door');
 assert.equal(roomTransition(registry,'home-balcony','library').id,'balcony-down');assert.equal(roomTransition(registry,'home-studio',null).id,'studio-down');
 assert.equal(roomTransition(registry,'home','home-balcony').id,'home-up');assert.equal(roomTransition(registry,'tide-cave',null).id,'exit-tide-cave');assert.equal(roomTransition(registry,'home','home'),null);
});

test('authored secret arrivals are clear and original props own finite low-poly geometry',()=>{
 for(const target of secretTargets)assert.ok(target.room?roomWalkable(target.room,target.arrival):safe(target.arrival),target.id);
 for(const room of [null,'arcade','tide-cave']){
  const art=createGlobeArt(new THREE.Scene());try{
   const groups=buildSecretArt(art,room);assert.equal(groups.length,secretDefinitions.filter(secret=>('room' in secret?secret.room:null)===room).length);
   let triangles=0;for(const group of groups)group.traverse(part=>{if(part.isMesh){const positions=part.geometry.getAttribute('position');assert.ok([...positions.array].every(Number.isFinite));triangles+=(part.geometry.index?.count??positions.count)/3}});assert.ok(triangles>0&&triangles<5000);
   const resources=[...new Set([...art.kit.geometries,...art.kit.extras])];let disposed=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>disposed++));art.dispose();assert.equal(disposed,resources.length);
  }catch(error){art.dispose();throw error}
 }
});

test('room guidance samples furniture clearance rather than cutting through shelves and counters',()=>{
 for(const [room,id] of [['home','ivan'],['library','rue'],['workshop','notebook'],['arcade','secret-arcade'],['tide-cave','secret-tideglass']]){
  const end=registry.find(target=>target.id===id).arrival,from={x:0,z:2.7},route=roomGuidanceRoute(room,from,end);assert.ok(route.length,room);sample([from,...route],room);
 }
 assert.deepEqual(roomGuidanceRoute('arcade',{x:0,z:-2.8},{x:0,z:1}),[],'a furniture-interior start is not a valid connector');
});

test('tracked guidance reaches the home door and then directs inside without moving the visitor',()=>{
 const visit=createPassport(registry,null),guide=createTrailGuidance(registry,safe),position={...spawn,inside:null};visit.track('meet-ivan');
 const before={...position},first=guide.update(visit.snapshot(),position);assert.deepEqual(position,before);assert.equal(first.targetId,'home-door');assert.ok(!first.unreachable);assert.ok(first.firefly);sample(first.points);
 const door=registry.find(target=>target.id==='home-door'),atDoor={...door.arrival,inside:null},waiting=guide.update(visit.snapshot(),atDoor);assert.equal(waiting.waitingAtDoor,true);assert.match(waiting.hint,/Press E/);
 const indoor=guide.update(visit.snapshot(),{x:0,z:2.7,inside:'home'});assert.equal(indoor.targetId,'ivan');assert.deepEqual(indoor.segments,[]);sample(indoor.points,'home');
 visit.record({type:'conversation',id:'ivan'});assert.equal(guide.update(visit.snapshot(),{x:0,z:2.7,inside:'home'}).targetId,'exit-home');
 visit.record({type:'conversation',id:'rue'});visit.record({type:'activity',id:'workshop-complete'});assert.equal(guide.update(visit.snapshot(),position),null);
});

test('guidance respects blocked routes and splits atlas paths at the wrapped seam',()=>{
 const visit=createPassport(registry,null);visit.track('small-kindness');const guide=createTrailGuidance(registry,()=>false),result=guide.update(visit.snapshot(),{...spawn,inside:null});assert.equal(result.unreachable,true);assert.equal(result.firefly,null);
 const split=splitGuidanceRoute([{x:longitudeLimit-.5,z:22},{x:-longitudeLimit+.5,z:24}]);assert.equal(split.length,2);assert.ok(split.flat().every(point=>Number.isFinite(point.x)&&Number.isFinite(point.z)));
 for(const line of split)for(let i=1;i<line.length;i++)assert.ok(Math.abs(line[i].x-line[i-1].x)<worldCircumference/2);
 assert.equal(split[0].at(-1).x,longitudeLimit);assert.equal(split[1][0].x,-longitudeLimit);assert.equal(split[0].at(-1).z,split[1][0].z);
});

test('each kindness checkpoint follows traversable ground or the real pond deck',()=>{
 const visit=createPassport(registry,null),guide=createTrailGuidance(registry,safe);visit.track('small-kindness');let position={...spawn,inside:null};
 for(const [id,activity] of [['duck-pond','feed-ducks'],['mira','return-wave'],['campfire','light-campfire']]){
  const result=guide.update(visit.snapshot(),position);assert.equal(result.targetId,id);assert.equal(result.unreachable,false);sample(result.points);
  position={...registry.find(target=>target.id===id).arrival,inside:null};visit.record({type:'activity',id:activity});
 }
 assert.equal(guide.update(visit.snapshot(),position),null);
});

test('all three surprises can be acquired through the real nearest-interaction system',()=>{
 for(const target of secretTargets){
  assert.ok(targets.some(source=>source.id===target.id),'the runtime target registry includes the surprise');
  const simulation=createGlobeSimulation();simulation.setReduced(true);
  if(target.room)simulation.enter(target.room,target.arrival);
  else{
   simulation.visit('south-garden');
   for(let frame=0;frame<200&&simulation.nearest()!==target.id;frame++)simulation.step(1/60,{x:0,forward:1,run:false});
  }
  assert.equal(simulation.nearest(),target.id,`${target.id} must beat nearby host/place prompts naturally`);
  const dialogue=dialogueFor(target,'start',{name:'Ivan',headline:'Developer',summary:'A supplied summary.',email:'hello@example.test'},[],[]);
  assert.ok(dialogue.text.length>30);assert.ok(!dialogue.choices.some(reply=>reply.action==='toggle'),'a surprise cannot fall through to the campfire interaction');
 }
});

test('the wave checkpoint instructs the correct action instead of opening a conversation',()=>{
 const visit=createPassport(registry,null);visit.track('small-kindness');visit.record({type:'activity',id:'feed-ducks'});
 const guide=createTrailGuidance(registry,safe),mira=registry.find(target=>target.id==='mira'),result=guide.update(visit.snapshot(),{...mira.arrival,inside:null});
 assert.equal(result.targetId,'mira');assert.match(result.label,/wave/i);assert.match(result.hint,/Press F/);assert.ok(!/Press E/.test(result.hint));
});

test('the single-draw firefly moves between room and world owners without lights or input effects',()=>{
 const outdoors=new THREE.Scene(),room=new THREE.Scene(),guide=createGuideFirefly(outdoors,{home:{scene:room}}),base={targetId:'ivan',label:'Hello',room:null,points:[],segments:[],firefly:{...spawn},waitingAtDoor:false,arrived:false,unreachable:false,hint:'Hello'};
 let geometries=0,materials=0;guide.points.geometry.addEventListener('dispose',()=>geometries++);guide.points.material.addEventListener('dispose',()=>materials++);
 guide.update(base,10,false,812);assert.equal(guide.root.visible,true);assert.equal(guide.root.parent,outdoors);assert.equal(guide.points.geometry.getAttribute('position').count,3);assert.ok(guide.root.matrix.elements.every(Number.isFinite));assert.equal(guide.points.material.uniforms.guideTime.value,10);
 guide.update({...base,room:'home',firefly:{x:1,z:2}},11,true,812);assert.equal(guide.root.parent,room);assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(guide.root.matrix).toArray(),[1,.95,2]);assert.equal(guide.points.material.uniforms.guideTime.value,0);
 guide.update({...base,unreachable:true},12,false);assert.equal(guide.root.visible,false);guide.update(null,13,false);assert.equal(guide.root.visible,false);
 guide.dispose();guide.dispose();assert.equal(guide.root.parent,null);assert.equal(geometries,1);assert.equal(materials,1);
});
