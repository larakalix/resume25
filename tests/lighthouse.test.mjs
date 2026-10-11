import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {lighthouse,lighthouseTarget,lighthousePaths} from '../src/experience/globe/lighthouse.ts';
import {insideRoundFootprint} from '../src/experience/globe/building-footprint.ts';
import {blocked,targets,mapStops,buildings} from '../src/experience/globe/layout.ts';
import {frameAt} from '../src/experience/globe/art-kit.ts';
import {mapAt,wet,distance,RADIUS} from '../src/experience/globe/geography.ts';
import {longitudeDelta} from '../src/experience/globe/world-expansion.ts';
import {createGlobeSimulation} from '../src/experience/globe/simulation.ts';

const frame=frameAt(lighthouse.x,lighthouse.z),inverse=frame.clone().invert();
const mapLocal=(x,z)=>mapAt(new THREE.Vector3(x,0,z).applyMatrix4(frame).normalize());
const physicalRadius=p=>{const q=new THREE.Vector3().setFromMatrixPosition(frameAt(p.x,p.z)).applyMatrix4(inverse);return Math.hypot(q.x,q.z)};
function clear(p,label){assert.equal(wet(p),false,`${label}: dry ground`);assert.equal(blocked(p),false,`${label}: clear body footprint`)}

test('the lighthouse has one shared round footprint without replacing any city building',()=>{
 assert.ok(lighthouse.radius>0&&lighthouse.height>lighthouse.radius*3);assert.equal(lighthouse.apronRadius,lighthouse.radius,'the stone apron stays inside the solid tower envelope');
 assert.equal(blocked(lighthouse),true,'the imported tower joins the actual walking collision');
 assert.equal(buildings.some(building=>building.id===lighthouse.id),false,'the waterfront landmark preserves the existing exterior catalog');
 for(let i=0;i<80;i++){
  const angle=i*Math.PI/40,inside=mapLocal(Math.cos(angle)*(lighthouse.radius-.06),Math.sin(angle)*(lighthouse.radius-.06)),outside=mapLocal(Math.cos(angle)*(lighthouse.radius+.5),Math.sin(angle)*(lighthouse.radius+.5));
  assert.equal(insideRoundFootprint(inside,lighthouse,.32),true);assert.equal(blocked(inside),true);clear(outside,'round perimeter');
 }
 const antipode={x:lighthouse.x-Math.PI*RADIUS,z:-lighthouse.z};assert.equal(insideRoundFootprint(antipode,lighthouse,.32),false,'the tower is not also solid on the opposite hemisphere');
});

test('the southern lighthouse approach stays dry, clear and outside the actual tower envelope',()=>{
 assert.deepEqual(lighthousePaths[0][0],{x:54,z:53},'the path joins the existing city cross street');
 for(const line of lighthousePaths)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],steps=Math.max(1,Math.ceil(distance(a,b)/.05));
  for(let j=0;j<=steps;j++){const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};clear(p,'lighthouse approach');assert.equal(insideRoundFootprint(p,lighthouse,.32),false)}
 }
 clear(lighthouseTarget.arrival,'direct arrival');assert.ok(distance(lighthouseTarget.arrival,lighthouseTarget)<lighthouseTarget.radius);assert.ok(physicalRadius(lighthouseTarget.arrival)>lighthouse.apronRadius+.32);
});

test('walk, run, crouch and airborne movement cannot enter any side of the lighthouse',()=>{
 for(const hz of [30,60,120])for(const mode of ['walk','run','crouch','jump'])for(const side of [[1,0],[-1,0],[0,1],[0,-1]]){
  const sim=createGlobeSimulation();Object.assign(sim.body,mapLocal(side[0]*(lighthouse.radius+1.7),side[1]*(lighthouse.radius+1.7)));sim.crouch(mode==='crouch');clear(sim.body,`${mode} approach`);
  for(let tick=0;tick<hz*3;tick++){
   if(mode==='jump'&&tick%hz===0)sim.jump();
   const dx=longitudeDelta(sim.body.x,lighthouse.x)*Math.cos(sim.body.z/RADIUS),dz=lighthouse.z-sim.body.z,length=Math.hypot(dx,dz);
   sim.step(1/hz,{x:dx/length,forward:-dz/length,run:mode==='run'||mode==='jump'});
   assert.equal(wet(sim.body),false);assert.equal(insideRoundFootprint(sim.body,lighthouse,.319),false,`${mode} ${hz}Hz retains body clearance`);
  }
  assert.ok(physicalRadius(sim.body)<lighthouse.radius+.5,`${mode} ${hz}Hz reaches the lighthouse wall`);
 }
});

test('Places can reach the lighthouse and discovery/reset remain content driven',()=>{
 assert.ok(targets.includes(lighthouseTarget));assert.equal(targets.filter(target=>target.id===lighthouse.id).length,1);assert.ok(mapStops.includes(lighthouse.id));
 const sim=createGlobeSimulation();sim.visit(lighthouse.id);assert.equal(sim.inside,null);assert.equal(sim.nearest(),lighthouse.id);clear(sim.body,'Places lighthouse arrival');
 const total=targets.filter(target=>target.kind!=='exit').length;assert.equal(sim.snapshot(false).total,total);assert.ok(sim.discovered.has(lighthouse.id));sim.reset();assert.equal(sim.discovered.size,0);assert.equal(sim.snapshot(true).total,total);
});
