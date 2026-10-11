import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Vector3} from 'three';
import {createCameraDirector} from '../src/experience/globe/camera-director.ts';
import {movementBasis,tangentAxes} from '../src/experience/globe/surface-motor.ts';
import {normalAt,RADIUS} from '../src/experience/globe/terrain.ts';
const origin=new Vector3(),north=new Vector3(0,0,-1);
const n=point=>new Vector3().copy(normalAt(point.x,point.z));
const state=(point,overview=false,extra={})=>({point,position:n(point).multiplyScalar(RADIUS+.7),overview,aspect:1.5,...extra});
const tick=(d,s,seconds=3,hz=60)=>{let p;for(let i=0;i<Math.round(seconds*hz);i++)p=d.update(1/hz,s);return p};
const backOf=(pose,s)=>pose.position.clone().sub(s.position).projectOnPlane(n(s.point)).normalize();
const clonePose=p=>({position:p.position.clone(),quaternion:p.quaternion.clone(),up:p.up.clone()});

test('visible-camera movement points W toward screen up and D toward screen right in both hemispheres, city and poles',()=>{
 for(const point of [{x:0,z:20},{x:-98,z:44},{x:125.6,z:-10},{x:62,z:62.82},{x:-35,z:-62.82}])for(const small of [false,true]){
  const d=createCameraDirector(),s=state(point,false,{small,aspect:small?375/812:1.5,calm:true}),p=d.update(0,s),inverse=p.quaternion.clone().invert(),up=n(point);
  for(const direction of [p.movement.forward,p.movement.right])assert.ok(Math.abs(direction.dot(up))<1e-10);
  const w=new Vector3().copy(p.movement.forward).applyQuaternion(inverse),r=new Vector3().copy(p.movement.right).applyQuaternion(inverse);assert.ok(w.y>.3,JSON.stringify(point));assert.ok(r.x>.99,JSON.stringify(point));assert.ok(Math.abs(w.x)<.12);assert.ok(Math.abs(r.y)<.12);
  const rotated=movementBasis(up,{forward:new Vector3(0,0,-1).applyQuaternion(p.quaternion),right:new Vector3(1,0,0).applyQuaternion(p.quaternion)});assert.ok(new Vector3().copy(rotated.right).dot(p.movement.right)>.999);
 }
});

test('overview freely reaches both polar regions while fixed north stays upright without accumulated roll',()=>{
 const d=createCameraDirector(),s=state({x:0,z:0},true);d.update(0,s);d.orbit(1.4,1.3);let p=tick(d,s);
 assert.ok(p.position.clone().normalize().z>.96);assert.ok(p.settled);
 for(const [x,y] of [[.7,.9],[1.1,-.7],[-.4,-2.3],[.7,.8],[-.7,-.8]]){
  d.orbit(x,y);p=tick(d,s);const view=p.position.clone().normalize().negate(),right=new Vector3(1,0,0).applyQuaternion(p.quaternion),expected=north.clone().projectOnPlane(view).normalize();assert.ok(Math.abs(right.dot(north))<1e-8);assert.ok(p.up.dot(expected)>.999999);assert.ok(p.position.length()>RADIUS*2);assert.ok(p.quaternion.length()>.999999);
 }
 assert.ok(p.position.clone().normalize().z<-.9);
});

test('returning to overview focuses the current location and preserves a deliberately chosen follow orbit',()=>{
 const point={x:85,z:42},d=createCameraDirector(),s=state(point),initial=d.update(0,s);assert.ok(initial.position.length()>RADIUS);d.orbit(.8,.13);const before=backOf(tick(d,s),s);
 const overview=state(point,true),above=tick(d,overview,5);assert.ok(above.position.clone().normalize().dot(n(point))>.9999);
 const after=backOf(tick(d,s,5),s);assert.ok(before.dot(after)>.9999,'overview must not reset follow yaw');
 const remote={x:-115,z:-40};tick(d,state(remote),1);const remoteOverview=tick(d,state(remote,true),5);assert.ok(remoteOverview.position.clone().normalize().dot(n(remote))>.9999,'overview follows the player rather than an old spawn');
});

test('behind-character recenter supports map yaw and world heading, and Calm leaves no orbit or zoom inertia',()=>{
 const point={x:100,z:45},s=state(point,false,{calm:true}),d=createCameraDirector();d.update(0,s);d.orbit(1.2,.3);d.zoom(.3);d.update(0,s);
 d.recenter(.7);let p=d.update(0,s),axes=tangentAxes(point),heading=axes.east.multiplyScalar(Math.sin(.7)).addScaledVector(axes.south,Math.cos(.7));assert.ok(backOf(p,s).dot(heading)<-.99);
 heading=axes.normal.clone().cross(new Vector3(0,0,1)).normalize();d.recenter(heading);p=d.update(0,s);assert.ok(backOf(p,s).dot(heading)<-.99);
 d.orbit(.4,-.1);d.zoom(.2);const immediate=clonePose(d.update(0,s));for(let i=0;i<60;i++)p=d.update(1/60,s);assert.ok(immediate.position.distanceTo(p.position)<1e-8);assert.ok(immediate.quaternion.angleTo(p.quaternion)<1e-7);
});

test('30/60/120Hz camera response converges to the same heading and settles using rotation as well as position',()=>{
 const results=[];
 for(const hz of [30,60,120]){
  const d=createCameraDirector(),s=state({x:0,z:20},true);d.update(0,s);assert.equal(d.update(0,s).settled,true);d.orbit(1.1,.7);assert.equal(d.update(0,s).settled,false);const early=clonePose(tick(d,s,.5,hz));const final=clonePose(tick(d,s,4,hz));assert.ok(d.update(0,s).settled);results.push({early,final});
 }
 for(const r of results){assert.ok(r.early.position.distanceTo(results[0].early.position)<.6);assert.ok(r.early.quaternion.angleTo(results[0].early.quaternion)<.01);assert.ok(r.final.position.distanceTo(results[0].final.position)<1e-5);assert.ok(r.final.quaternion.angleTo(results[0].final.quaternion)<1e-7)}
});

test('opposite-hemisphere exploration transitions remain outside the sphere; singular input is bounded',()=>{
 const d=createCameraDirector(),point={x:0,z:20};d.update(0,state(point,true));d.orbit(Math.PI,0);tick(d,state(point,true));
 for(const overview of [false,true,false])for(let i=0;i<360;i++){
  const p=d.update(1/120,state(point,overview,{aspect:.3}));assert.ok(p.position.length()>=RADIUS+2-1e-8);for(const v of [p.position,p.target,p.up])assert.ok(v.toArray().every(Number.isFinite));assert.ok(Math.abs(p.quaternion.length()-1)<1e-8);assert.ok(p.position.distanceTo(origin)>RADIUS);
 }
 d.orbit(Infinity,NaN);d.zoom(Infinity);const p=d.update(NaN,state(point));assert.ok(p.position.toArray().every(Number.isFinite));
});

test('camera snapshots are detached serializable values and restore both visible pose and unfinished camera motion',()=>{
 for(const phase of ['overview','follow','transition']){
  const point={x:100,z:47},s=state(point,phase!=='follow'),d=createCameraDirector();d.update(0,s);d.orbit(.7,.15);d.zoom(.25);tick(d,s,.1);
  if(phase==='transition'){s.overview=false;tick(d,s,.15)}
  const saved=d.snapshot(),frozen=structuredClone(saved);assert.deepEqual(JSON.parse(JSON.stringify(saved)),saved);
  // A photograph can use a wholly different point, mode, pose orbit and zoom.
  d.align({x:-110,z:-45});d.update(0,state({x:-110,z:-45},false));d.recenter(1.1);d.orbit(-.8,-.2);d.zoom(-.3);tick(d,state({x:-110,z:-45},true),.3);
  assert.deepEqual(saved,frozen,'later camera updates cannot mutate the saved DTO');d.restore(saved);assert.deepEqual(d.snapshot(),saved,'restoration is exact before another simulation tick');
  const reference=createCameraDirector();reference.restore(frozen);
  for(let i=0;i<120;i++){const a=d.update(1/60,s),b=reference.update(1/60,s);assert.ok(a.position.distanceTo(b.position)<1e-10);assert.ok(1-Math.abs(a.quaternion.dot(b.quaternion))<1e-12);assert.deepEqual(d.snapshot(),reference.snapshot(),'pending pitch, zoom, transition and follow-heading state must also restore')}
  // Neither direction of the API retains mutable references to its argument.
  const detached=d.snapshot(),expected=d.snapshot();detached.surface.back[0]+=20;detached.surface.point.x+=20;detached.pose.position[0]+=20;assert.deepEqual(d.snapshot(),expected);
  d.restore(expected);expected.surface.previousNormal[1]+=20;expected.overview.quaternion[0]+=20;assert.notDeepEqual(d.snapshot(),expected);
 }
});

test('halt and stop freeze the actual pending view without resetting its orientation, and deliberate actions release the hold',()=>{
 for(const overview of [false,true]){
  const point={x:-102,z:45},s=state(point,overview),d=createCameraDirector();d.update(0,s);d.orbit(1,.35);d.zoom(.3);tick(d,s,.1);const before=clonePose(d.update(0,s));assert.equal(d.stop,d.halt);d.halt();let saved=d.snapshot();assert.equal(saved.flags.held,true);assert.equal(saved.pose.settled,true);assert.equal(saved.follow.pitch,saved.follow.wantedPitch);assert.equal(saved.follow.distance,saved.follow.wantedDistance);assert.equal(saved.overview.longitude,saved.overview.wantedLongitude);assert.equal(saved.overview.latitude,saved.overview.wantedLatitude);
  for(let i=0;i<120;i++){const p=d.update(1/60,s);assert.deepEqual(p.position,before.position);assert.deepEqual(p.quaternion,before.quaternion);assert.deepEqual(p.up,before.up);assert.ok(p.settled)}
  d.orbit(0,0);d.zoom(0);assert.equal(d.snapshot().flags.held,true,'zero input does not resume an interrupted camera');d.orbit(.2,-.08);tick(d,s,1);assert.equal(d.snapshot().flags.held,false);assert.ok(d.snapshot().pose.position.some((v,i)=>Math.abs(v-saved.pose.position[i])>.1));
  d.stop();saved=d.snapshot();const restored=createCameraDirector();restored.restore(saved);assert.equal(restored.snapshot().flags.held,true);assert.deepEqual(restored.update(1/60,s).position.toArray(),saved.pose.position);
  restored.zoom(-.1);restored.update(1/60,s);assert.equal(restored.snapshot().flags.held,false);
 }
});

test('a held transition resumes for an actual player or view-mode change and a rejected snapshot cannot partially mutate state',()=>{
 const point={x:0,z:20},d=createCameraDirector(),s=state(point,true);d.update(0,s);tick(d,state(point,false),.1);d.halt();const saved=d.snapshot();assert.ok(saved.follow.blend>0&&saved.follow.blend<1);tick(d,state(point,false),1);assert.deepEqual(d.snapshot().pose,saved.pose);
 const shifted={x:.1,z:20};d.update(1/60,state(shifted,false));assert.equal(d.snapshot().flags.held,false);d.halt();d.update(1/60,state(shifted,true));assert.equal(d.snapshot().flags.held,false);
 d.halt();d.update(1/60,state(shifted,true,{aspect:.6}));assert.equal(d.snapshot().flags.held,false,'a responsive projection change must recompute safe globe framing');
 const before=d.snapshot(),bad=structuredClone(before);bad.pose.position[0]=NaN;assert.throws(()=>d.restore(bad),/Invalid camera snapshot/);assert.deepEqual(d.snapshot(),before);
 const cold=createCameraDirector(),initial=cold.snapshot();cold.align({x:50,z:50});cold.update(0,state({x:50,z:50}));cold.restore(initial);assert.deepEqual(cold.snapshot(),initial);assert.ok(cold.update(1/60,state(point)).position.toArray().every(Number.isFinite));
});

test('blurring a globe overview preserves neutral follow framing and the next zoom-in actually moves inward',()=>{
 for(const small of [false,true]){
  const point={x:0,z:-4},d=createCameraDirector(),s=state(point,true,{small,aspect:small?375/812:1.5});d.update(0,s);d.orbit(.45,.1);tick(d,s,2);const radiusBefore=d.update(0,s).position.length(),before=d.snapshot();d.halt();const stopped=d.snapshot();
  assert.ok(Math.abs(stopped.follow.pitch-before.follow.pitch)<1e-12,'canvas blur cannot turn globe elevation into follow-camera pitch');assert.deepEqual(stopped.surface.back,before.surface.back);assert.ok(Math.abs(stopped.follow.distance-before.follow.distance)<1e-8);
  d.zoom(-.12);const next=d.update(1/60,s);assert.ok(next.position.length()<radiusBefore,'a zoom-in after menu/canvas blur must not move outward');
  const start=createCameraDirector();start.update(0,s);const neutral=start.snapshot();start.halt();const explored=tick(start,{...s,overview:false},5),after=start.snapshot();assert.ok(Math.abs(after.follow.pitch-neutral.follow.pitch)<1e-12);assert.ok(Math.abs(after.follow.distance-1)<1e-8);assert.ok(explored.position.clone().sub(s.position).dot(n(point))<14,'first Explore retains the neutral follow height');
 }
 const point={x:12,z:30},d=createCameraDirector(),s=state(point,true);d.update(0,s);tick(d,state(point,false),.1);const before=d.snapshot();d.halt();const after=d.snapshot();assert.equal(after.follow.pitch,before.follow.pitch);assert.equal(after.follow.distance,before.follow.distance);assert.deepEqual(after.surface.back,before.surface.back,'a mixed transition pose is not a follow-camera frame');
});

test('UI input halt during Explore stops input inertia but finishes the automatic follow transition without walking',()=>{
 for(const small of [false,true]){
  const point={x:0,z:-4},d=createCameraDirector(),overview=state(point,true,{small,aspect:small?375/812:1.5});d.update(0,overview);const follow={...overview,overview:false};d.update(1/60,follow);d.halt(true);
  assert.equal(d.snapshot().flags.held,false);assert.equal(d.snapshot().pose.settled,false,'a transition must remain eligible for camera animation rather than idle/performance sampling');
  const pose=tick(d,follow,5),done=d.snapshot();assert.ok(done.follow.blend>.999);assert.ok(pose.settled);assert.ok(pose.position.distanceTo(follow.position)<22,'Explore must reach its real follow camera without player movement');
  assert.ok(Math.abs(done.follow.pitch-Math.atan2(7.4,12.5))<1e-10);assert.ok(Math.abs(done.follow.distance-1)<1e-10);
  d.update(1/60,overview);d.halt(true);const world=tick(d,overview,5);assert.ok(d.snapshot().follow.blend<.001);assert.ok(world.position.length()>100);assert.ok(world.settled);
 }
});

test('explicit photo halt still freezes a transition, while settled overview UI halt keeps zoom-in direction correct',()=>{
 const point={x:0,z:20},d=createCameraDirector(),overview=state(point,true);d.update(0,overview);const follow={...overview,overview:false};d.update(1/60,follow);d.halt();const frozen=d.snapshot();tick(d,follow,2);assert.deepEqual(d.snapshot().pose,frozen.pose);assert.equal(d.snapshot().flags.held,true);
 const world=createCameraDirector();world.update(0,overview);world.halt(true);assert.equal(world.snapshot().flags.held,true);const before=world.update(0,overview).position.length();world.zoom(-.12);assert.ok(world.update(1/60,overview).position.length()<before);
});
