import assert from 'node:assert/strict';
import {test} from 'node:test';
import {advanceVelocity,gaitStride} from '../src/experience/globe/locomotion.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {freshWorkshop,advanceWorkshop} from '../src/experience/globe/workshop.ts';
import {createQualityController,qualityProfile} from '../src/experience/globe/quality.ts';
import {createWorldSound,noiseSamples} from '../src/experience/globe/sound.ts';
import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {createCameraClearance} from '../src/experience/globe/camera-clearance.ts';
const idle={x:0,forward:0,run:false};
test('follow camera protects the lower body when a foreground roof misses the centre ray',()=>{
 const roof=new THREE.BoxGeometry(8,.3,1);roof.translate(0,3.5,6);const tree=new MeshBVH(roof),target=new THREE.Vector3(0,1.1,-1.3),follow=new THREE.Vector3(.8,5.4,9.2),feet=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),direction=follow.clone().sub(target).normalize();
 assert.equal(tree.raycastFirst(new THREE.Ray(target,direction),THREE.DoubleSide,.15,target.distanceTo(follow)),null);
 const original=follow.clone();createCameraClearance(tree)(target,follow,feet,up);assert.ok(follow.distanceTo(target)>=original.distanceTo(target)*.65,'clearance must not turn into an extreme close-up');assert.notDeepEqual(follow,original);
 for(const y of [.3,1.1,1.95]){const origin=new THREE.Vector3(0,y,0),line=follow.clone().sub(origin);assert.equal(tree.raycastFirst(new THREE.Ray(origin,line.clone().normalize()),THREE.DoubleSide,.15,line.length()),null)}roof.dispose();
});
test('acceleration and braking integrate consistently at 30, 60 and 120Hz with bounded release travel',()=>{
 const results=[];for(const hz of [30,60,120]){const v={vx:0,vz:0};let x=0;for(let i=0;i<hz;i++)x+=advanceVelocity(v,{...idle,x:1},2.65,1/hz).dx;const release=x;for(let i=0;i<hz;i++)x+=advanceVelocity(v,idle,2.65,1/hz).dx;results.push(x);assert.ok(x-release>0&&x-release<.1);assert.equal(v.vx,0)}
 assert.ok(Math.max(...results)-Math.min(...results)<.001);const v={vx:0,vz:0};advanceVelocity(v,{...idle,x:1},5.2,1/60);assert.ok(v.vx>0&&v.vx<5.2);v.vx=5.2;let runRelease=0;for(let i=0;i<60;i++)runRelease+=advanceVelocity(v,idle,5.2,1/60).dx;assert.ok(runRelease>.1&&runRelease<.2);assert.equal(gaitStride(0),1.25);assert.equal(gaitStride(5.2),1.9);
});
test('safe halt and conversations stop momentum immediately; footsteps follow ground travel and landing reacts once',()=>{
 const s=createGlobeSimulation();Object.assign(s.body,{x:5,z:23});for(let i=0;i<60;i++)s.step(1/60,{...idle,forward:1});assert.ok(s.body.steps>0);s.halt();const z=s.body.z;s.step(1/60,idle);assert.equal(s.body.z,z);assert.equal(s.body.speed,0);s.jump();const before=s.body.steps;for(let i=0;i<15;i++)s.step(1/60,{...idle,x:1});assert.equal(s.body.steps,before);let reactions=0;for(let i=0;i<120;i++){const last=s.body.landing;s.step(1/60,idle);if(s.body.landing>last)reactions++}assert.equal(reactions,1);s.setEngaged('mira');assert.equal(s.body.vx,0);assert.equal(s.body.vz,0);
});
test('a resident greets an approach once, holds, and greets again after departure',()=>{
 const s=createGlobeSimulation();s.visit('mira');s.step(.02,idle);const mira=s.walkers[0];assert.ok(mira.greeting>0);for(let i=0;i<180;i++)s.step(1/60,idle);assert.equal(mira.greeting,0);Object.assign(s.body,{x:5,z:23});s.step(.02,idle);s.visit('mira');s.step(.02,idle);assert.ok(mira.greeting>0);
});
test('workshop progression has no timer or professional-content gate and the final planner really toggles',()=>{
 const state=freshWorkshop();advanceWorkshop(state,'preview');advanceWorkshop(state,'task-0');assert.deepEqual(state,freshWorkshop());for(const action of ['shape','connect','preview'])advanceWorkshop(state,action);assert.equal(state.stage,3);for(let i=0;i<3;i++)advanceWorkshop(state,`task-${i}`);assert.ok(state.checked.every(Boolean));advanceWorkshop(state,'task-1');assert.equal(state.checked[1],false);const before=JSON.stringify(state);advanceWorkshop(state,'task-30');assert.equal(JSON.stringify(state),before);advanceWorkshop(state,'replay');assert.deepEqual(state,freshWorkshop());
 const s=createGlobeSimulation(),other=createGlobeSimulation();s.action('notebook','shape');assert.equal(s.snapshot(false).workshop.stage,1);assert.equal(other.workshop.stage,0);s.snapshot(false).workshop.checked[0]=true;assert.equal(s.workshop.checked[0],false);s.reset();assert.deepEqual(s.workshop,freshWorkshop());
});
test('automatic graphics degrade under sustained slow delivery, recover carefully and respect manual choice',()=>{
 const q=createQualityController();for(let i=0;i<130;i++)q.observe(40,true);assert.equal(q.snapshot().level,'low');for(let i=0;i<1400;i++)q.observe(16,true);assert.equal(q.snapshot().level,'balanced');q.choose('detailed');for(let i=0;i<1000;i++)q.observe(50,true);assert.equal(q.snapshot().level,'detailed');q.choose('auto');for(let i=0;i<500;i++)q.observe(50,false);assert.equal(q.snapshot().level,'detailed');
 for(const small of [true,false]){const low=qualityProfile('low',small),high=qualityProfile('detailed',small);assert.ok(low.grass<high.grass);assert.ok(low.shadow<high.shadow);assert.ok(low.dpr<high.dpr)}
});
test('performance sampling measures delivered intervals and reports CPU submission separately; interruption discards mixed samples',()=>{
 const q=createQualityController(),metrics={renderMs:1.25,drawCalls:100,triangles:300000,grass:18000,dpr:1,width:390,height:844,zone:'meadow'};q.start(0);for(let i=1;i<=600;i++)q.record(i*1000/60,1000/60,metrics);const report=q.snapshot().report;assert.equal(report.fps,60);assert.equal(report.p95FrameMs,16.7);assert.equal(report.meanRenderCpuMs,1.25);assert.equal(report.frames,600);assert.equal(report.level,'balanced');q.start(20000);q.record(20016,16,metrics);q.interrupt();q.record(30000,16,metrics);assert.equal(q.snapshot().measurement,'interrupted');assert.equal(q.snapshot().report,null);q.start(40000);q.choose('detailed');assert.equal(q.snapshot().measurement,'interrupted');
});
test('original ambience PCM is finite, repeatable, bounded and quiet at loop boundaries',()=>{
 const a=noiseSamples(2048);assert.deepEqual(a,noiseSamples(2048));assert.equal(Math.abs(a[0]),0);assert.equal(Math.abs(a.at(-1)),0);assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));assert.ok(a.some(v=>Math.abs(v)>.5));
});
test('audio is never created before opt-in; mute, pause and disposal own the whole graph',async()=>{
 const previous=globalThis.AudioContext;let created=0,stops=0,last;
 const parameter=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({connect(next){return next},disconnect(){},gain:parameter(),frequency:parameter(),positionX:parameter(),positionY:parameter(),positionZ:parameter(),start(){},stop(){stops++;this.onended?.()}});
 globalThis.AudioContext=class{state='suspended';sampleRate=22050;currentTime=0;destination=node();listener=Object.fromEntries(['position','forward','up'].flatMap(name=>['X','Y','Z'].map(axis=>[name+axis,parameter()])));constructor(){created++;last=this}createGain(){return node()}createBiquadFilter(){return node()}createPanner(){return node()}createBufferSource(){return node()}createOscillator(){return node()}createBuffer(_channels,length){return{length,copyToChannel(){}}}async resume(){this.state='running';this.onstatechange?.()}async suspend(){this.state='suspended';this.onstatechange?.()}async close(){this.state='closed'}};
 try{const s=createWorldSound(()=>{});assert.equal(created,0);assert.equal(s.status,'off');s.play('bell',{x:0,y:0,z:0});assert.equal(created,0);assert.equal(await s.enable(true),true);assert.equal(created,1);assert.equal(s.status,'on');s.play('success',{x:0,y:0,z:0});assert.ok(s.nodeCount>0);s.setActive(false);assert.equal(s.status,'paused');s.setActive(true);assert.equal(s.status,'on');await s.enable(false);assert.equal(s.status,'off');s.dispose();assert.equal(last.state,'closed');assert.equal(s.nodeCount,0);assert.ok(stops>=3);assert.equal(await s.enable(true),false);assert.equal(created,1)}finally{if(previous===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previous}
});
