import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {hillSites,hillLift,caveSites,caveTargets,coastalLookout} from '../src/experience/globe/wild-land.ts';
import {coastalCrossing as c,coastalDeck,coastalFootprint,coastalHeight,coastalBlocked,coastalRoutes} from '../src/experience/globe/coastal-crossing.ts';
import {buildWildLand} from '../src/experience/globe/wild-land-art.ts';
import {createCaveInterior} from '../src/experience/globe/cave-interior.ts';
import {createGlobeArt} from '../src/experience/globe/art-kit.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';
import {blocked,targets,mapStops} from '../src/experience/globe/layout.ts';
import {normalAt,RADIUS,heightAt,terrainHeight,wet,distance} from '../src/experience/globe/geography.ts';
import {roomWalkable} from '../src/experience/globe/workshop-resident.ts';
import {isFootprintSand} from '../src/experience/globe/footprints.ts';

const idle={x:0,forward:0,run:false};
function canvas(run){const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};try{return run()}finally{globalThis.document=before}}
function clear(p){assert.equal(wet(p),false,`dry ${p.x},${p.z}`);assert.equal(blocked(p),false,`clear ${p.x},${p.z}`)}
function walk(sim,goal,hz,mode){
 for(let frame=0;frame<hz*90;frame++){
  const dx=(goal.x-sim.body.x)*Math.cos(sim.body.z/RADIUS),dz=goal.z-sim.body.z,length=Math.hypot(dx,dz);if(length<.10){sim.halt();return}
  if(mode==='jump'&&frame%hz===0)sim.jump();sim.step(1/hz,{x:dx/length,forward:-dz/length,run:mode==='run'||mode==='jump'});clear(sim.body);
 }
 assert.fail(`${mode} ${hz}Hz stopped at ${sim.body.x},${sim.body.z}`);
}

test('compact rolling hills have smooth finite edges and do not raise settled city streets',()=>{
 for(const hill of hillSites){assert.equal(hillLift(hill),hill.height);assert.ok(Number.isFinite(heightAt(hill)));const edge={x:hill.x,z:hill.z+hill.radius};assert.ok(hillLift(edge)<1e-12);assert.ok(hillLift({...edge,z:edge.z-.001})<1e-8)}
 for(const p of [{x:0,z:39.5},{x:-33,z:41},{x:50,z:41},{x:-33,z:-25}])assert.equal(hillLift(p),0,'the new hills do not change established town ground');
});

test('Horizon Causeway spans actual water, aligns its walking height and keeps both ends open',()=>{
 assert.ok(terrainHeight(normalAt((c.startX+c.endX)/2,c.z))<-.5,'the new span crosses the bay rather than a painted land strip');
 for(let x=c.endX;x<=c.startX;x+=.15){clear({x,z:c.z});assert.equal(coastalHeight({x,z:c.z}),heightAt({x,z:c.z}));assert.equal(isFootprintSand({x,z:c.z}),false)}
 for(const x of [c.startX+.08,c.endX-.08])clear({x,z:c.z});
 assert.ok(Math.abs(coastalDeck(c.startX)-terrainHeight(normalAt(c.startX,c.z)))<.08);assert.ok(Math.abs(coastalDeck(c.endX)-terrainHeight(normalAt(c.endX,c.z)))<.08);
 for(const route of coastalRoutes)for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],steps=Math.ceil(distance(a,b)/.05);for(let j=0;j<=steps;j++)clear({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps})}
});

test('all movement modes cross the causeway, while walking and airborne pressure cannot pass its parapets',()=>{
 for(const hz of [30,60,120])for(const mode of ['walk','run','crouch','jump']){
  const sim=createGlobeSimulation();Object.assign(sim.body,{x:c.startX+.3,z:c.z});sim.crouch(mode==='crouch');walk(sim,{x:c.endX-.3,z:c.z},hz,mode);
  for(const side of [-1,1]){Object.assign(sim.body,{x:(c.startX+c.endX)/2,z:c.z,y:0,vy:0,vx:0,vz:0});for(let frame=0;frame<hz*3;frame++){if(mode==='jump'&&frame%hz===0)sim.jump();sim.step(1/hz,{...idle,forward:-side,run:mode==='run'||mode==='jump'});clear(sim.body)}assert.ok(Math.abs(sim.body.z-c.z)<c.halfWidth-c.wallWidth,'the solid side holds every movement mode')}
 }
 assert.equal(coastalFootprint({x:c.startX,z:c.z}),true);assert.equal(coastalBlocked({x:c.startX,z:c.z}),false);
});

test('both caves have clear discoverable entrances, bounded walkable galleries and safe exterior exits',()=>{
 const sim=createGlobeSimulation();clear(coastalLookout.arrival);assert.ok(mapStops.includes(coastalLookout.id));
 for(const cave of caveSites){const door=caveTargets.find(target=>target.interior===cave.room);assert.ok(targets.includes(door));assert.ok(mapStops.includes(door.id));clear(door.arrival);assert.equal(blocked(cave),true);sim.visit(door.id);assert.equal(sim.nearest(),door.id);sim.enter(cave.room);assert.equal(sim.inside,cave.room);assert.equal(roomWalkable(cave.room,sim.roomBody),true);assert.equal(roomWalkable(cave.room,{x:3.2,z:0}),false);sim.leave();assert.ok(distance(sim.body,door.arrival)<.001);clear(sim.body)}
});

test('causeway geometry has an upward deck at its physical walking height and cave resources release once',()=>canvas(()=>{
 const scene=new THREE.Scene(),art=createGlobeArt(scene);buildWildLand(art);scene.updateMatrixWorld(true);
 const middle=(c.startX+c.endX)/2,n=normalAt(middle,c.z),normal=new THREE.Vector3(n.x,n.y,n.z),ray=new THREE.Raycaster(normal.clone().multiplyScalar(RADIUS+coastalDeck(middle)+3),normal.clone().negate(),0,6),parts=[];scene.traverse(part=>{if(part.name===c.id)parts.push(part)});
 const hit=ray.intersectObjects(parts,false)[0];assert.ok(hit&&Math.abs(hit.distance-3)<.02,'deck ray agrees with player height and outward face winding');assert.ok(hit.face.normal.dot(normal)>.9);
 for(const cave of caveSites)assert.ok(art.occlusionGroups.some(group=>group.id===cave.id));
 const owned=[...new Set([...art.kit.geometries,...art.kit.extras])];let released=0;owned.forEach(resource=>resource.addEventListener('dispose',()=>released++));art.dispose();assert.equal(released,owned.length);
 for(const cave of caveSites){const room=createCaveInterior(cave.room);assert.equal(room.host,undefined);assert.equal(room.ivan,undefined);const resources=[...new Set([...room.art.kit.geometries,...room.art.kit.extras])];let count=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>count++));room.update();room.dispose();assert.equal(count,resources.length)}
}));
