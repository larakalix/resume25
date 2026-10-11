import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorldFollow} from '../src/experience/globe/world-follow.ts';
import {blocked} from '../src/experience/globe/layout.ts';
import {distance,wet,paths,RADIUS} from '../src/experience/globe/geography.ts';
import {worldPlaces,longitudeDelta,wrapLongitude} from '../src/experience/globe/world-expansion.ts';

const safe=point=>!wet(point)&&!blocked(point);
function follow(route,actor,owner,maximum=7200,force=false,onStep=()=>{}){
 for(let i=0;i<maximum&&distance(actor,owner)>2.4;i++){
  const goal=route.goal(actor,owner,true,force);assert.ok(goal,`route exists at ${actor.x},${actor.z} toward ${owner.x},${owner.z}`);
  const scale=Math.max(.22,Math.cos(actor.z/RADIUS)),dx=longitudeDelta(actor.x,goal.x)*scale,dz=goal.z-actor.z,length=Math.hypot(dx,dz),step=Math.min(length,3.7/60);
  const next={x:wrapLongitude(actor.x+dx/length*step/scale),z:actor.z+dz/length*step};
  assert.ok(distance(actor,next)<.064,'companion takes a physical step, never a teleport');assert.ok(safe(next),'every step respects buildings, river and bridge borders');Object.assign(actor,next);onStep(actor);
 }
 assert.ok(distance(actor,owner)<2.4,`companion arrives within conversation distance, got ${distance(actor,owner)}m`);
}

test('local following bypasses the global graph and disabling follow clears the route',()=>{
 let checks=0;const route=createWorldFollow(()=>{checks++;return true});
 assert.equal(route.goal({x:0,z:18},{x:24,z:18},true),null);assert.equal(checks,0);
 assert.equal(route.goal({x:90,z:22},{x:91,z:22},true),null);assert.equal(checks,0);
 assert.ok(route.goal({x:90,z:22},{x:96,z:22},true));assert.equal(route.goal({x:90,z:22},{x:96,z:22},false),null);route.reset();
});

test('global following routes around town walls, through the far bridge and across the longitude seam',()=>{
 const route=createWorldFollow(safe),actor={x:-1.5,z:16};
 follow(route,actor,worldPlaces.find(place=>place.id==='sunlit-orchard').arrival);
 follow(route,actor,worldPlaces.find(place=>place.id==='north-lookout').arrival);
 follow(route,actor,worldPlaces.find(place=>place.id==='star-garden').arrival);
 route.reset();
});

test('the seam uses the short physical route and stable goals do not rebuild visibility every frame',()=>{
 let checks=0;const route=createWorldFollow(point=>{checks++;return safe(point)}),actor={x:123,z:24},owner={x:-119,z:24};
 const goal=route.goal(actor,owner,true);assert.ok(goal);assert.ok(longitudeDelta(actor.x,goal.x)>0);const firstChecks=checks;
 for(let i=0;i<500;i++)assert.deepEqual(route.goal(actor,owner,true),goal);
 assert.equal(checks,firstChecks,'unchanged owner reuses cached route');follow(route,actor,owner);route.reset();
});

test('authored adjacency accepted by the cold graph is collision-free at fifteen-centimetre samples',()=>{
 const between=(a,b,t)=>({x:wrapLongitude(a.x+longitudeDelta(a.x,b.x)*t),z:a.z+(b.z-a.z)*t});
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(distance(a,b)/1.3));let previous=null;
  for(let step=0;step<=steps;step++){
   const point=between(a,b,step/steps);
   if(previous&&safe(point)&&safe(between(previous,point,.5))){
    const samples=Math.max(1,Math.ceil(distance(previous,point)/.15));
    for(let sample=1;sample<=samples;sample++)assert.ok(safe(between(previous,point,sample/samples)),'the cold graph trusts only proven authored path adjacency');
   }
   previous=safe(point)?point:null;
  }
 }
});

test('forced local routing uses the new west and east crossings instead of detouring to the original bridge',()=>{
 const route=createWorldFollow(safe);
 for(const crossing of [{x:-30,south:4,north:-9},{x:28,south:2,north:-12}]){
  const actor={x:crossing.x,z:crossing.south},owner={x:crossing.x,z:crossing.north};let crossingSteps=0;
  follow(route,actor,owner,2400,true,point=>{if(point.z< -2&&point.z> -5){assert.ok(Math.abs(longitudeDelta(crossing.x,point.x))<.1,'companion stays on this crossing centerline');crossingSteps++;}});
  assert.ok(crossingSteps>10);route.reset();
 }
});
