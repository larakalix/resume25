import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDuckFlock} from '../src/experience/globe/duck-flock.ts';
import {pond,feedingPoint} from '../src/experience/globe/pond.ts';
import {normalAt,terrainHeight,WATER,RADIUS} from '../src/experience/globe/terrain.ts';
import {dockFootprint} from '../src/experience/globe/duck-dock.ts';

const distance=(a,b)=>Math.hypot((a.x-b.x)*Math.cos((a.z+b.z)/(2*RADIUS)),a.z-b.z);
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const snapshot=flock=>flock.ducks.map(duck=>({...duck}));
function healthy(flock){
 assert.equal(flock.ducks.length,3);
 for(let i=0;i<3;i++){
  const duck=flock.ducks[i];assert.ok(Object.values(duck).every(Number.isFinite));
  assert.ok(terrainHeight(normalAt(duck.x,duck.z))<WATER-.18,'ducks stay in actual deep water');
  assert.ok(distance(duck,pond)<pond.radius-.29,'ducks leave clearance beside the bank');
  assert.equal(dockFootprint(duck,.31),false,'ducks swim around the dock instead of through its platform or rails');
  assert.ok(duck.speed>=0&&duck.speed<.58);assert.ok(duck.peck>=0&&duck.peck<=1);assert.ok(Math.abs(duck.bob)<=.023);
  for(let j=i+1;j<3;j++)assert.ok(distance(duck,flock.ducks[j])>=.55,'body silhouettes stay separated');
 }
}
function tick(flock,seconds,reduced=false,hz=60){for(let i=0;i<Math.round(seconds*hz);i++){flock.step(1/hz,reduced);healthy(flock)}}
function until(flock,mode,reduced=false,hz=60,limit=35){
 for(let i=0;i<hz*limit;i++){if(flock.mode===mode)return i/hz;flock.step(1/hz,reduced);healthy(flock)}
 assert.fail(`flock did not reach ${mode}; still ${flock.mode}`);
}

test('leisurely routes pause, turn smoothly and face actual swimming velocity',()=>{
 const flock=createDuckFlock(),travel=[0,0,0],pauses=[0,0,0],moving=[0,0,0];let previous=snapshot(flock);
 for(let frame=0;frame<60*120;frame++){
  flock.step(1/60,false);healthy(flock);assert.equal(flock.mode,'roaming');
  for(let i=0;i<3;i++){
   const duck=flock.ducks[i],before=previous[i],span=distance(duck,before);travel[i]+=span;
   assert.ok(angle(duck.yaw,before.yaw)<=1.46/60,'headings never spin independently of the route');
   if(span>.0001){const heading=Math.atan2((duck.x-before.x)*Math.cos((duck.z+before.z)/(2*RADIUS)),duck.z-before.z);assert.ok(angle(duck.yaw,heading)<.015);moving[i]++}else pauses[i]++;
   assert.equal(duck.peck,0);
  }
  previous=snapshot(flock);
 }
 for(let i=0;i<3;i++){assert.ok(travel[i]>20);assert.ok(pauses[i]>60&&moving[i]>600,'every swimmer has both rests and deliberate travel')}
});

test('feeding approaches the dock, dips beaks for six seconds and disperses back to roaming',()=>{
 const flock=createDuckFlock();tick(flock,20);const before=snapshot(flock);flock.feed();
 assert.equal(flock.mode,'approaching');assert.deepEqual(snapshot(flock),before,'requesting food never teleports swimmers');
 assert.ok(until(flock,'feeding')>1,'ducks swim to the food');
 const meal=snapshot(flock);for(const duck of meal)assert.ok(distance(duck,feedingPoint)<1.5,'the group gathers just beyond the dock');
 let peak=0,feedingDuration=0;
 while(flock.mode==='feeding'){
  flock.step(1/60,false);healthy(flock);feedingDuration+=1/60;
  for(let i=0;i<3;i++){peak=Math.max(peak,flock.ducks[i].peck);assert.ok(distance(flock.ducks[i],meal[i])<1e-10,'feeding ducks hold their spaced places')}
 }
 assert.ok(feedingDuration>=5.99&&feedingDuration<6.1);assert.ok(peak>.95);assert.equal(flock.mode,'returning');
 until(flock,'roaming');for(let i=0;i<3;i++)assert.ok(distance(flock.ducks[i],meal[i])>1,'each duck leaves the feeding spot');
 tick(flock,5);assert.ok(flock.ducks.some(duck=>duck.speed>.1),'normal routes resume');
});

test('repeat feeding refreshes one response without queues or position jumps',()=>{
 const flock=createDuckFlock();flock.feed();tick(flock,1);const approaching=snapshot(flock);
 for(let i=0;i<1000;i++)flock.feed();assert.deepEqual(snapshot(flock),approaching);
 until(flock,'feeding');tick(flock,5);const feeding=snapshot(flock);
 for(let i=0;i<1000;i++)flock.feed();assert.deepEqual(snapshot(flock),feeding);tick(flock,5);assert.equal(flock.mode,'feeding');
 until(flock,'returning');tick(flock,.5);const returning=snapshot(flock);flock.feed();assert.deepEqual(snapshot(flock),returning);assert.equal(flock.mode,'approaching');
 until(flock,'feeding');until(flock,'returning');until(flock,'roaming');tick(flock,10);assert.equal(flock.mode,'roaming','repeated presses do not enqueue more feeding rounds');
});

test('Calm holds ambient swimming and bobbing but completes a deliberate feeding response',()=>{
 const flock=createDuckFlock();tick(flock,5);flock.step(1/60,true);const resting=snapshot(flock);tick(flock,10,true);
 assert.deepEqual(snapshot(flock),resting);for(const duck of resting){assert.equal(duck.bob,0);assert.equal(duck.speed,0)}
 flock.feed();until(flock,'feeding',true);assert.ok(flock.ducks.some((duck,i)=>distance(duck,resting[i])>.5));
 for(let i=0;i<60;i++){flock.step(1/60,true);healthy(flock);for(const duck of flock.ducks){assert.equal(duck.peck,.45,'deliberate food uses a static feeding pose in Calm');assert.equal(duck.bob,0)}}
 until(flock,'returning',true);until(flock,'roaming',true);
 const returned=snapshot(flock);tick(flock,10,true);assert.deepEqual(snapshot(flock),returned);
});

test('zero or invalid render deltas do nothing and long deltas stay capped',()=>{
 const flock=createDuckFlock();tick(flock,3);flock.feed();const before={mode:flock.mode,ducks:snapshot(flock)};
 for(const delta of [0,-1,NaN,Infinity,-Infinity]){flock.step(delta,true);assert.deepEqual({mode:flock.mode,ducks:snapshot(flock)},before)}
 const a=createDuckFlock(),b=createDuckFlock();a.feed();b.feed();a.step(100,false);b.step(.05,false);assert.deepEqual(snapshot(a),snapshot(b));assert.equal(a.mode,b.mode);
});

test('reset restores stable public state objects and clears feeding progress',()=>{
 const flock=createDuckFlock(),ducks=flock.ducks,identities=[...ducks],initial=snapshot(flock);
 flock.feed();tick(flock,9);flock.reset();assert.equal(flock.mode,'roaming');assert.equal(flock.ducks,ducks);assert.deepEqual(snapshot(flock),initial);
 identities.forEach((duck,i)=>assert.equal(flock.ducks[i],duck));tick(flock,10);assert.equal(flock.mode,'roaming');
});

test('routes and feeding phases agree at 30, 60 and 120 Hz',()=>{
 const outcomes=[];
 for(const hz of [30,60,120]){
  const flock=createDuckFlock(),phases=[];
  for(let frame=0;frame<hz*45;frame++){
   if(frame===hz*12)flock.feed();const before=flock.mode;flock.step(1/hz,false);healthy(flock);
   if(flock.mode!==before)phases.push({mode:flock.mode,time:(frame+1)/hz});
  }
  outcomes.push({ducks:snapshot(flock),mode:flock.mode,phases});
 }
 const reference=outcomes[2];
 for(const result of outcomes){
  assert.equal(result.mode,reference.mode);assert.deepEqual(result.phases.map(phase=>phase.mode),reference.phases.map(phase=>phase.mode));
  result.phases.forEach((phase,i)=>assert.ok(Math.abs(phase.time-reference.phases[i].time)<.04));
  result.ducks.forEach((duck,i)=>{assert.ok(distance(duck,reference.ducks[i])<.025);assert.ok(angle(duck.yaw,reference.ducks[i].yaw)<.04)});
 }
});

test('a swimmer heading toward the bank slows and turns without crossing onto land',()=>{
 const flock=createDuckFlock(),duck=flock.ducks[0],scale=Math.cos(pond.z/RADIUS);
 Object.assign(duck,{x:pond.x+3.05/scale,z:pond.z,yaw:Math.PI/2,speed:.5});let previous={...duck};
 for(let frame=0;frame<60*12;frame++){
  flock.step(1/60,false);healthy(flock);assert.ok(distance(duck,previous)<.58/60,'bank avoidance never relocates a duck');previous={...duck};
 }
 assert.ok(distance(duck,pond)<2.6,'the swimmer rejoins the clear middle of the pond');
});

test('feeding from varied route positions gathers everyone promptly and completes without a deadlock',()=>{
 for(const delay of [0,7,20,60,100,130]){
  const flock=createDuckFlock();tick(flock,delay);flock.feed();
  const approach=until(flock,'feeding');assert.ok(approach<9,'food is reached before the response becomes tedious');
  const feeding=until(flock,'returning'),returning=until(flock,'roaming');
  assert.ok(feeding>=5.99&&feeding<6.1);assert.ok(approach+feeding+returning<25,'a complete feeding response is bounded');
 }
});
