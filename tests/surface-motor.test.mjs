import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Quaternion,Vector3} from 'three';
import {createSurfaceMotor,movementBasis,planarFrameInput,tangentAxes} from '../src/experience/globe/surface-motor.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {RADIUS,normalAt} from '../src/experience/globe/terrain.ts';
import {wet,spawn} from '../src/experience/globe/geography.ts';
import {blocked} from '../src/experience/globe/layout.ts';
import {riverCrossings,bridgeBlocked} from '../src/experience/globe/bridge.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
const idle={x:0,forward:0,run:false};
const body=(x=0,z=20)=>({x,z,y:0,vy:0,yaw:Math.PI,speed:0,crouched:false,vx:0,vz:0,landing:0,steps:0,stepProgress:0});
const normal=p=>new Vector3().copy(normalAt(p.x,p.z));
const angle=(a,b)=>Math.atan2(new Vector3().crossVectors(a,b).length(),a.dot(b));
const frameAt=p=>{const axes=tangentAxes(p);return{forward:axes.south.negate(),right:axes.east}};
function transportedTick(motor,p,seconds,hz,input,frame,safe=()=>true){
 let traveled=0;
 for(let i=0;i<Math.round(seconds*hz);i++){
  const before=normal(p);motor.step(p,input,input.run?5.2:2.65,1/hz,frame,safe);const after=normal(p),q=new Quaternion().setFromUnitVectors(before,after);
  traveled+=angle(before,after)*RADIUS;frame.forward.applyQuaternion(q);frame.right.applyQuaternion(q);
 }
 return traveled;
}

test('radial acceleration, diagonal normalization, distance and braking agree at 30/60/120Hz',()=>{
 const runs=[];
 for(const hz of [30,60,120]){
  const motor=createSurfaceMotor(),p=body(),frame=frameAt(p),start=normal(p),walk=transportedTick(motor,p,2,hz,{...idle,forward:1},frame);
  const stop=transportedTick(motor,p,.5,hz,idle,frame);runs.push({walk,stop,n:normal(p)});assert.ok(walk>5.1&&walk<5.3);assert.ok(stop>.08&&stop<.11);assert.ok(Math.hypot(p.vx,p.vz)<.008);assert.ok(angle(start,normal(p))*RADIUS>5.2);
  const d=body(),dm=createSurfaceMotor(),diagonal=transportedTick(dm,d,2,hz,{...idle,x:1,forward:1},frameAt(d));assert.ok(Math.abs(diagonal-walk)<1e-7);
 }
 for(const run of runs){assert.ok(Math.abs(run.walk-runs[0].walk)<1e-7);assert.ok(angle(run.n,runs[0].n)*RADIUS<.002)}
});

test('date-line and both poles are continuous, with transported world heading and no latitude cap',()=>{
 for(const hemisphere of [-1,1]){
  const p=body(0,hemisphere*(Math.PI*RADIUS/2-.15)),motor=createSurfaceMotor(),axes=tangentAxes(p),frame={forward:axes.south.multiplyScalar(hemisphere),right:axes.east.multiplyScalar(-hemisphere)},start=normal(p);let lastHeading=frame.forward.clone(),crossed=false;
  p.yaw=hemisphere>0?0:Math.PI;
  for(let i=0;i<120;i++){
   const before=normal(p);motor.step(p,{...idle,forward:1},2.65,1/60,frame,()=>true);const after=normal(p),q=new Quaternion().setFromUnitVectors(before,after);frame.forward.applyQuaternion(q);frame.right.applyQuaternion(q);
   const current=tangentAxes(p),heading=current.east.multiplyScalar(Math.sin(p.yaw)).addScaledVector(current.south,Math.cos(p.yaw));assert.ok(heading.dot(lastHeading)>.999,'world heading does not flip at the pole');lastHeading=heading;
   if(Math.abs(p.x)>Math.PI*RADIUS*.9)crossed=true;assert.ok(angle(before,after)*RADIUS<.045);
  }
  assert.ok(crossed);assert.ok(angle(start,normal(p))*RADIUS>5.1);assert.ok(Math.abs(p.z)<Math.PI*RADIUS/2-4.8);
 }
 const p=body(Math.PI*RADIUS-.08,0),motor=createSurfaceMotor(),axes=tangentAxes(p),frame={forward:axes.east,right:axes.south},start=normal(p);p.yaw=Math.PI/2;
 transportedTick(motor,p,1,60,{...idle,forward:1},frame);assert.ok(p.x<0);assert.ok(angle(start,normal(p))*RADIUS>2.4);
});

test('collision substeps stop at thin walls, slide safely, and clear stored pressure against the obstacle',()=>{
 const p=body(0,20),motor=createSurfaceMotor(),frame=frameAt(p),visited=[];
 const safe=point=>{visited.push({...point});return point.x<=.65};
 transportedTick(motor,p,2,30,{...idle,x:1,forward:1,run:true},frame,safe);
 assert.ok(p.x<=.65);assert.ok(p.z<14,'the free component slides along the wall');assert.ok(p.speed>2);assert.ok(visited.some(point=>point.x>.65));
 for(let i=0;i<20;i++)motor.step(p,idle,2.65,1/60,frame,safe);assert.ok(p.x<=.65);assert.ok(Math.hypot(p.vx,p.vz)<.008);
 const stopped=body(),wall=createSurfaceMotor(),before={...stopped};for(let i=0;i<60;i++)wall.step(stopped,{...idle,forward:1},5.2,1/60,frameAt(stopped),()=>false);assert.equal(stopped.x,before.x);assert.equal(stopped.z,before.z);assert.equal(stopped.speed,0);assert.equal(stopped.vx,0);assert.equal(stopped.vz,0);
});

test('teleports and explicit yaw changes resynchronize; singular and invalid frame inputs stay finite',()=>{
 const motor=createSurfaceMotor(),p=body(),frame=frameAt(p);motor.step(p,{...idle,x:1},2.65,1/60,frame,()=>true);Object.assign(p,body(-110,-55));
 const before=normal(p);motor.step(p,idle,2.65,1/60,frameAt(p),()=>true);assert.ok(angle(before,normal(p))<1e-8);assert.equal(p.yaw,Math.PI);
 p.yaw=-.7;motor.step(p,idle,2.65,1/60,frameAt(p),()=>true);assert.ok(Math.abs(p.yaw+.7)<1e-12);
 const n=normal(p),basis=movementBasis(n,{forward:n,right:{x:NaN,y:0,z:0}});assert.ok(Math.abs(new Vector3().copy(basis.forward).dot(n))<1e-10);assert.ok(Math.abs(new Vector3().copy(basis.right).dot(basis.forward))<1e-10);
 motor.step(p,{x:Infinity,forward:NaN,run:true},5.2,1/60,{forward:n,right:n},()=>true);assert.ok(Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v)));
});

test('optional camera frame preserves terrain, bridge, room collisions, jumping and accepted footstep distance',()=>{
 const sim=createGlobeSimulation();Object.assign(sim.body,{x:spawn.x,z:1});
 for(let i=0;i<240;i++){sim.step(1/60,{...idle,forward:1},frameAt(sim.body));assert.equal(wet(sim.body),false);assert.equal(blocked(sim.body),false)}assert.ok(sim.body.z<-8.3);assert.ok(sim.body.steps>10);
 Object.assign(sim.body,{...body(8,3)});for(let i=0;i<360;i++){sim.step(1/60,{...idle,forward:1},frameAt(sim.body));assert.equal(wet(sim.body),false)}assert.ok(sim.body.z>-4);
 sim.enter('library');const frame={forward:new Vector3(1,0,0),right:new Vector3(0,0,1)},start={...sim.player()};for(let i=0;i<15;i++)sim.step(1/60,{...idle,forward:1},frame);assert.ok(sim.player().x>start.x+.4);assert.ok(Math.abs(sim.player().z-start.z)<1e-8);for(let i=0;i<600;i++)sim.step(1/60,{...idle,forward:1,run:true},frame);assert.equal(roomWalkable('library',sim.player()),true);
 sim.crouch(true);sim.jump();assert.equal(sim.player().vy,0);sim.crouch(false);sim.jump();assert.ok(sim.player().vy>0);for(let i=0;i<120;i++)sim.step(1/60,idle,frame);assert.equal(sim.player().y,0);
 assert.deepEqual(planarFrameInput({...idle,forward:1},frame),{x:1,forward:0,run:false});assert.equal(wet(sim.body),false);assert.equal(blocked(sim.body),false);
});


test('camera-relative walking, running, jumping and crouching respect every river parapet at30/60/120Hz',()=>{
 for(const crossing of riverCrossings)for(const hz of [30,60,120])for(const side of [-1,1])for(const mode of ['walk','run','jump','crouch']){
  const sim=createGlobeSimulation();Object.assign(sim.body,body(crossing.x,(crossing.startZ+crossing.endZ)/2));sim.setReduced(true);if(mode==='jump')sim.jump();if(mode==='crouch')sim.crouch(true);
  for(let i=0;i<hz*1.2;i++){sim.step(1/hz,{...idle,x:side,run:mode==='run'},frameAt(sim.body));assert.equal(bridgeBlocked(sim.body),false,`${crossing.id} ${hz}Hz ${mode}`);assert.equal(wet(sim.body),false);assert.ok(Math.abs(sim.body.x-crossing.x)<=crossing.halfWidth-crossing.wallWidth-crossing.bodyRadius+.001)}
 }
});
